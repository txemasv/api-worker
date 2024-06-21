const express = require('express');
const app = express(); // Create an Express application
require('dotenv').config();
const AWS = require('aws-sdk');

// Create an SQS service object
const sqs = new AWS.SQS({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: "ap-southeast-2",
    apiVersion: 'v1'
});

// Sample data (replace with your data source, e.g., database connection)
const items = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
];

// Middleware (optional)
// app.use(express.json()); // Parse incoming JSON data

// Routes
app.get('/send/:item', async (req, res) => {

    const item = req.params.item;
    console.log(item);

    const sendMessageParams = {
        QueueUrl: process.env.QUEUE_URL,
        MessageBody: item,
    };
      
    sqs.sendMessage(sendMessageParams, (err, data) => {
        if (err) {
          console.error('\nError sending message to SQS:', err);
          return res.status(500).json({success: false, code: "fail"});
        } else {
          console.log('\nMessage sent to SQS:', data.MessageId);
          return res.status(202).json({success: true, code: "queued", item: data.MessageId}); 
        }
    });
    
});

app.post('/jobs', async (req, res) => {

    // Accessing the X-API-Key header (case-insensitive)
    if (req.headers['x-api-key']) {
        const apiKey = req.headers['x-api-key'];

        // Logic to validate the API key (replace with your validation logic)
        if (apiKey === 'my_valid_api_key') {
            const recipe = req.params.recipe || {};
            console.log(recipe);
        
            const sendMessageParams = {
                QueueUrl: process.env.QUEUE_URL,
                MessageBody: recipe,
            };
              
            sqs.sendMessage(sendMessageParams, (err, data) => {
                if (err) {
                  console.error('\nError sending message to SQS:', err);
                  return res.status(500).json({success: false, code: err.code});
                } else {
                  console.log('\nMessage sent to SQS:', data.MessageId);
                  return res.status(202).json({success: true, code: "queued", item: data.MessageId}); 
                }
            });
        } else {
            return res.status(401).send('Unauthorized: Invalid X-API-Key');
        }
    } else {
        return res.status(401).send('Unauthorized: Missing X-API-Key header');
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