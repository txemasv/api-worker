const express = require('express');
const app = express();
app.use(express.json());
require('dotenv').config();
const AWS = require('aws-sdk');

// Create an SQS service object
const sqs = new AWS.SQS({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.SQS_REGION,
    apiVersion: process.env.SQS_VERSION,
});

/**
 * Continuously checks for and processes messages from an SQS queue.
 */
const listen = () => {
    sqs.receiveMessage({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MaxNumberOfMessages: 1, // Get at most one message
        VisibilityTimeout: 10, // Make the message invisible for 10 seconds while processing
    })
    .promise()
    .then(data => {
        if (data.Messages && data.Messages.length > 0) {
            const message = data.Messages[0];
            const messageBody = message.Body;
        
            // Process the message body here (e.g., parse JSON, perform actions)
            console.log('\nMessage received:', messageBody);
        
            // Delete the message from the queue after processing
            return sqs.deleteMessage({
                QueueUrl: process.env.SQS_QUEUE_URL,
                ReceiptHandle: message.ReceiptHandle
            }).promise();
        } else {
            console.log('\nNo messages in the queue');
        }
    })
    .catch(error => {
        console.error('\nError receiving message:', error);
    });
};

app.post('/jobs', async (req, res) => {

    // Accessing the X-API-Key header (case-insensitive)
    if (req.headers['x-api-key']) {
        const apiKey = req.headers['x-api-key'];

        // Logic to validate the API key (replace with your validation logic)
        if (apiKey === process.env.API_KEY) {
            const recipe = req.body.recipe;
        
            const sendMessageParams = {
                QueueUrl: process.env.SQS_QUEUE_URL,
                MessageBody: recipe,
            };
              
            sqs.sendMessage(sendMessageParams, (err, data) => {
                if (err) {
                    console.error('\nError sending message to SQS:', err);
                    return res.status(500).json({
                        success: false, 
                        status: "error",
                        code: err.code
                    });
                } else {
                    console.log('\nMessage sent to SQS:', data.MessageId);
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

app.get('/jobs', async (req, res) => {

    // Sample data (replace with your data source, e.g., database connection)
    const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
    ];

    console.log('get list of jobs');
    return res.json(items); // Get all items
});

app.get('/jobs/:id', async (req, res) => {
    console.log('get job details');

    // Sample data (replace with your data source, e.g., database connection)
    const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
    ];

    const id = parseInt(req.params.id);
    const item = items.find(item => item.id === id);
    if (item) {
        return res.json(item); // Get item by ID
    } else {
        return res.status(404).send('Item not found'); // Error handling for non-existent item
    }
});
  
// Listen for messages every n seconds
setInterval(listen, process.env.LISTEN_INTERVAL_MS);

// Port to listen on (default: 3000)
const port = process.env.PORT || 3000;

// Start the server
app.listen(port, () => {
    console.log(`\nServer listening on port ${port}\n`);
});