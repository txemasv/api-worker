# api-worker
+ API REST to work with SQS and a Worker doing the work in the background with a decoupled architecture.
+ Producer and Consumer actions are together in this project for learning purposes.

# API
+ This function acts as an API endpoint for submitting jobs or tasks to a designated SQS queue.
+ It performs API key validation for security.
+ Sends the job data as a message to the SQS queue for asynchronous processing.
+ Client acknowledges successful queuing with an appropriate status code and the message ID.

# Worker
+ Continuously checks for and processes messages from an SQS queue.
+ This function might be executed in background in a differend deployment.

# Webhook
+ Endpoint that handles the final result of the operation.
+ The action started in the producer and was processed by the consumer.
+ At this stage the consumer has completed the job and notifies the final result to this webhook.

# Environment
+ AWS_ACCESS_KEY_ID="xxx"
+ AWS_SECRET_ACCESS_KEY="xxx"
+ SQS_QUEUE_URL="https://sqs.ap-southeast-2.amazonaws.com/xxx/worker-jobs"
+ SQS_REGION="ap-southeast-2"
+ SQS_VERSION="v1"
+ LISTEN_INTERVAL_MS=5000

# Commands
+ Run the app in local: **npm start**
+ Run the app with nodemon in local: **npm run debug**

# Advices
+ Use a tool like postman to do the POST request with the payload

# Message type
+ Send a POST message to the producer
+ The body has to contain a JSON object recipe.
+ The recipe has to contain a message and a webhook
```json
{
    "recipe": {
        "transaction": "report",
        "webhook": "http://localhost:3000/notifications"
    }
}
```

# Docker
+ You can also run the system in a docker container
## Comands
+ See running containers: **docker ps**
+ See built images: **docker images**
+ Create the image: **docker build -t my-api-worker .**
+ Run the image in a container: **docker run -d -p 3000:3000 my-api-worker**
+ Check docker logs: **docker logs -f <container_name_or_id>**
+ Stop container: **docker stop <container_name_or_id>**
+ Remove container: **docker rm <container_name_or_id>**
+ Remove image: **docker rmi <image_name_or_id>**