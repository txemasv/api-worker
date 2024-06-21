# api-worker
+ API REST to work with SQS and a Worker doing the work in the background with a decoupled architecture.
+ Producer and Consumer actions are together in this project for learning purposes.

# producer
+ This function acts as an API endpoint for submitting jobs or tasks to a designated SQS queue.
+ It performs API key validation for security.
+ Sends the job data as a message to the SQS queue for asynchronous processing.
+ Client acknowledges successful queuing with an appropriate status code and the message ID.

# consumer
+ Continuously checks for and processes messages from an SQS queue.
+ This function might be executed in background in a differend deployment.

# environment
+ AWS_ACCESS_KEY_ID="xxx"
+ AWS_SECRET_ACCESS_KEY="xxx"
+ SQS_QUEUE_URL="https://sqs.ap-southeast-2.amazonaws.com/xxx/worker-jobs"
+ SQS_REGION="ap-southeast-2"
+ SQS_VERSION="v1"
+ API_KEY="xxx"
+ LISTEN_INTERVAL_MS=5000