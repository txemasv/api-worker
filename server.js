const express = require('express');
const app = express();
app.use(express.json());
require('dotenv').config();
const AWS = require('aws-sdk');
const axios = require('axios');

// Create an SQS service object
const sqs = new AWS.SQS({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.SQS_REGION,
    apiVersion: process.env.SQS_VERSION,
});

// Create local configuration
const config = {
    sqs_queue_url: process.env.SQS_QUEUE_URL,
    api_key: process.env.API_KEY,
    listen_interval: process.env.LISTEN_INTERVAL_MS || 5000,
    port: process.env.PORT || 3000,
}

/**
 * Continuously checks for and processes messages from an SQS queue.
 * This function should be executed in background in a differend deployment.
 * Producer and Consumer actions are together in this project for learning purposes.
 */
const listen = () => { //Consumer
    sqs.receiveMessage({
        QueueUrl: config.sqs_queue_url,
        MaxNumberOfMessages: 1, // Get at most one message
        VisibilityTimeout: 10, // Make the message invisible for 10 seconds while processing
    })
    .promise()
    .then(data => {
        if (data.Messages && data.Messages.length > 0) {
            const message = data.Messages[0];
            const messageBody = JSON.parse(message.Body);
        
            // Process the message body here (e.g., parse JSON, perform actions)
            console.log('CONSUMER: Message received:', messageBody);
        
            // Delete the message from the queue after processing
            return sqs.deleteMessage({
                QueueUrl: config.sqs_queue_url,
                ReceiptHandle: message.ReceiptHandle
            })
            .promise()
            .then(() => {
                //Notify on provided webhook
                const url = messageBody.webhook;
                const result = {
                    messageId: message.MessageId,
                    status: "processed",
                }
                return axios.post(url, result)
            });
        } else {
            console.log('CONSUMER: No messages in the queue');
        }
    })
    .catch(error => {
        console.error('Error receiving message:', error);
    });
};

/**
 * This function acts as an API endpoint for submitting jobs or tasks to a designated SQS queue.
 * It performs API key validation for security.
 * Sends the job data as a message to the SQS queue for asynchronous processing.
 * Client acknowledges successful queuing with an appropriate status code and the message ID.
 */
app.post('/jobs', async (req, res) => { //Producer
    // Accessing the x-api-key header (case-insensitive)
    if (req.headers['x-api-key']) {
        const apiKey = req.headers['x-api-key'];

        // Logic to validate the API key (replace with your validation logic)
        if (apiKey === config.api_key) {
            const recipe = req.body.recipe;

            // Validate the recipe. 
            // Add any validation you consider
            if (!recipe.hasOwnProperty('webhook')) {
                console.error('PRODUCER: No webhook provided');
                return res.status(500).json({
                    success: false, 
                    status: "error",
                    code: "No webhook provided in the recipe"
                });
            }

            if (!recipe.hasOwnProperty('message')) {
                console.error('PRODUCER: No message provided');
                return res.status(500).json({
                    success: false, 
                    status: "error",
                    code: "No message provided in the recipe"
                });
            }
        
            const sendMessageParams = {
                QueueUrl: config.sqs_queue_url,
                MessageBody: JSON.stringify(recipe),
            };
              
            sqs.sendMessage(sendMessageParams, (err, data) => {
                if (err) {
                    console.error('PRODUCER: Error sending message to SQS:', err);
                    return res.status(500).json({
                        success: false, 
                        status: "error",
                        code: err.code
                    });
                } else {
                    console.log('PRODUCER: Message sent to SQS:', data.MessageId);
                    return res.status(202).json({
                        success: true, 
                        status: "queued", 
                        code: data.MessageId
                    }); 
                }
            });
        } else {
            return res.status(401).send({
                success: false,
                status: 'error',
                code: 'Unauthorized: Invalid X-API-Key'
            });
        }
    } else {
        return res.status(401).send({
            success: false,
            status: 'error',
            code: 'Unauthorized: Missing X-API-Key header'
        });
    }
});

/**
 * Endpoint that handles the final result of the operation.
 * The action started in the producer and was processed by the consumer.
 * At this stage the consumer has completed the job and notifies the final result to this webhook.
 */
app.post('/notifications', async (req, res) => { //Webhook
    //Do any job you like
    console.log("WEBHOOK", req.body);
})
  
// Listen for messages every n seconds
setInterval(listen, config.listen_interval);

// Start the server
app.listen(config.port, () => {
    console.log(`\nServer listening on port ${config.port}\n`);
});