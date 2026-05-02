#!/usr/bin/env bash
# Provisions S3 bucket and SQS queues inside LocalStack on container ready.
# Runs automatically because LocalStack picks up scripts in /etc/localstack/init/ready.d.
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ENDPOINT="http://localhost:4566"
BUCKET="fiap-hackathon-dev-uploads"

echo "[init] creating S3 bucket: $BUCKET"
awslocal s3api create-bucket --bucket "$BUCKET" --region "$REGION" || true

echo "[init] creating SQS queues"
awslocal sqs create-queue --queue-name analysis-requested-dlq || true
DLQ_ARN_REQ=$(awslocal sqs get-queue-attributes --queue-url "$(awslocal sqs get-queue-url --queue-name analysis-requested-dlq --query QueueUrl --output text)" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

awslocal sqs create-queue \
  --queue-name analysis-requested \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN_REQ\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\",\"VisibilityTimeout\":\"120\"}" || true

awslocal sqs create-queue --queue-name analysis-completed-dlq || true
DLQ_ARN_COMP=$(awslocal sqs get-queue-attributes --queue-url "$(awslocal sqs get-queue-url --queue-name analysis-completed-dlq --query QueueUrl --output text)" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

awslocal sqs create-queue \
  --queue-name analysis-completed \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN_COMP\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\",\"VisibilityTimeout\":\"60\"}" || true

awslocal sqs create-queue --queue-name analysis-failed || true

echo "[init] creating SNS topic for analysis events"
awslocal sns create-topic --name analysis-events || true

echo "[init] creating Secrets Manager entries"
awslocal secretsmanager create-secret --name /fiap-hackathon/dev/jwt-secret --secret-string "dev-jwt-secret-change-me-please" 2>/dev/null || true
awslocal secretsmanager create-secret --name /fiap-hackathon/dev/db-credentials --secret-string '{"username":"hackathon","password":"hackathonpass","host":"mysql","port":3306,"database":"fiap_hackathon"}' 2>/dev/null || true

echo "[init] LocalStack resources ready"
