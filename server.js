const express = require('express');
const app = express(); // Create an Express application
app.use(express.json()); // Enable JSON parsing middleware
require('dotenv').config();
const AWS = require('aws-sdk');

// Create an SQS service object
const sqs = new AWS.SQS({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.SQS_REGION,
    apiVersion: process.env.SQS_VERSION,
});

// Sample data (replace with your data source, e.g., database connection)
const items = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
];

app.post('/jobs', async (req, res) => {

    // Accessing the X-API-Key header (case-insensitive)
    if (req.headers['x-api-key']) {
        const apiKey = req.headers['x-api-key'];

        // Logic to validate the API key (replace with your validation logic)
        if (apiKey === process.env.API_KEY) {
            const recipe = req.body.recipe;
            console.log(recipe);
        
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
    console.log('get list of jobs');
    return res.json(items); // Get all items
});

app.get('/jobs/:id', async (req, res) => {
    console.log('get job details');

    const id = parseInt(req.params.id);
    const item = items.find(item => item.id === id);
    if (item) {
        return res.json(item); // Get item by ID
    } else {
        return res.status(404).send('Item not found'); // Error handling for non-existent item
    }
});

// Port to listen on (default: 3000)
const port = process.env.PORT || 3000;

// Start the server
app.listen(port, () => {
  console.log(`\nServer listening on port ${port}\n`);
});