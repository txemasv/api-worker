const express = require('express');
const app = express();
app.use(express.json());
app.use(handleJsonError);
require('dotenv').config();
const AWS = require('aws-sdk');
const axios = require('axios');
const winston = require('winston');
const format = winston.format;
const fs = require('fs');

// Middleware for express and json parser errors
function handleJsonError(err, req, res, next) {
    if (err instanceof SyntaxError && err.type === 'entity.parse.failed') {
        // Handle JSON parsing error
        logger.error('Invalid JSON format');
        return res.status(400).send({
            success: false,
            status: 'error',
            code: 'Invalid JSON format'
        });
    }
    // Pass other errors to the next middleware
    next(err);
}

// Create logger
const logger = winston.createLogger({
  level: 'debug',  // Set the minimum logging level
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    format.colorize({ all: true })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Create an SQS service object
const sqs = new AWS.SQS({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.SQS_REGION,
    apiVersion: process.env.SQS_VERSION,
});

// Create local configuration
const config = { //API
    sqs_queue_url: process.env.SQS_QUEUE_URL,
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
            logger.info('CONSUMER: Message received:', messageBody);
        
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
            logger.debug('CONSUMER: No messages in the queue');
        }
    })
    .catch(error => {
        logger.error('Error receiving message:', error);
    });
};

/**
 * Checks if an API key is valid
 */
const validateApiKey = async(apiKey) => {

    // Path to your apiKeys database
    const filePath = './data.json';

    try {
        // Compare the apiKey
        const data = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(data);
        const user = jsonData[apiKey]

        if(user) {
            return { 
                success : true,
                user: user
            };
        }

    } catch (error) {
        logger.error('Error reading or parsing JSON file:', error);
        return {
            success:false, 
            http:500, 
            code:"Internal server error",
            status: "error"
        };
    }

    return {
        success:false, 
        http:401, 
        code:"Invalid x-api-key",
        status: "error"
    };
}

const validateTransaction = async (transaction, credits) => {

    //Get prices from a database
    const prices = {
        report : 10,
        upload : 50,
        transcoding: 100,
        conversion: 500
    }

    // Check if transaction exists
    if (!prices.hasOwnProperty(transaction)) {
        logger.error("Transaction invalid");
        return {
            success:false,
            http: 400,
            code: "Transaction invalid"
        };
    }

    // Check if credits are enought
    if(prices[transaction] > credits) {
        logger.error("Low balance");
        return {
            success:false, 
            http: 403, code: "Low balance"};
    }
    return {success:true};
}

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

        // Logic to validate the API key
        const validKey = await validateApiKey(apiKey);

        // Logic to validate the payload
        if (validKey.success) {
            const recipe = req.body.recipe;

            // Logic to validate if user has enough credits for the transaction
            const transaction = recipe.transaction;
            const credits = validKey.user.credits;
            const validTransaction = await validateTransaction(transaction, credits);
            if(!validTransaction.success) {
                logger.error(`PRODUCER: ${validTransaction.code}`);
                return res.status(validTransaction.http).json({
                    success: false, 
                    status: "error",
                    code: validTransaction.code
                });
            }

            // Validate the recipe. 
            // Add any validation you consider
            if (!recipe.hasOwnProperty('webhook')) {
                logger.error('PRODUCER: No webhook provided');
                return res.status(400).json({
                    success: false, 
                    status: "error",
                    code: "No webhook provided in the recipe"
                });
            }

            if (!recipe.hasOwnProperty('transaction')) {
                logger.error('PRODUCER: No transaction provided');
                return res.status(400).json({
                    success: false, 
                    status: "error",
                    code: "No transaction provided in the recipe"
                });
            }
        
            const sendMessageParams = {
                QueueUrl: config.sqs_queue_url,
                MessageBody: JSON.stringify(recipe),
            };
                
            sqs.sendMessage(sendMessageParams, (err, data) => {
                if (err) {
                    logger.error('PRODUCER: Error sending message to SQS:', err);
                    return res.status(400).json({
                        success: false, 
                        status: "error",
                        code: err.code
                    });
                } else {
                    logger.info('PRODUCER: Message sent to SQS:', data.MessageId);
                    return res.status(202).json({
                        success: true, 
                        status: "queued", 
                        code: data.MessageId
                    }); 
                }
            });
        } else {
            // Precise messaje from the key validation
            logger.error(`PRODUCER: ${validKey.code}`);
            return res.status(validKey.http).send({
                success: false,
                status: validKey.status,
                code: validKey.code
            });
        }
    } else {
        logger.error('PRODUCER: Missing x-api-key header');
        return res.status(401).send({
            success: false,
            status: 'error',
            code: 'Missing x-api-key header'
        });
    }
});

/**
 * Endpoint that handles the final result of the operation.
 * The action started in the producer and was processed by the consumer.
 * At this stage the consumer has completed the job and notifies the final result to this webhook.
 */
app.post('/notifications', async (req, res) => { //Webhook
    //Do any verifications you need (token, user ...)

    //Do any job you like
    logger.info("WEBHOOK", req.body);
})
  
// Listen for messages every n seconds
setInterval(listen, config.listen_interval);

// Start the server
app.listen(config.port, () => {
    console.log(`\nServer listening on port ${config.port}\n`);
});