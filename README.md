# api-worker
API REST to work with SQS and a Worker doing the work in the background with a decoupled architecture.

# environment
AWS_ACCESS_KEY_ID="xxx"
AWS_SECRET_ACCESS_KEY="xxx"
SQS_QUEUE_URL="https://sqs.ap-southeast-2.amazonaws.com/xxx/worker-jobs"
SQS_REGION="ap-southeast-2"
SQS_VERSION="v1"
API_KEY="xxx"
LISTEN_INTERVAL_MS=5000