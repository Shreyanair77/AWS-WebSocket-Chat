# AWS Deployment Guide - Real-Time Chat Application

This guide provides detailed step-by-step instructions to deploy the real-time chat application on AWS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Set Up DynamoDB Tables](#step-1-set-up-dynamodb-tables)
3. [Step 2: Create IAM Roles](#step-2-create-iam-roles)
4. [Step 3: Deploy Lambda Functions](#step-3-deploy-lambda-functions)
5. [Step 4: Create API Gateway WebSocket API](#step-4-create-api-gateway-websocket-api)
6. [Step 5: Set Up Amazon Cognito](#step-5-set-up-amazon-cognito)
7. [Step 6: Deploy Frontend to S3](#step-6-deploy-frontend-to-s3)
8. [Step 7: Configure CloudFront](#step-7-configure-cloudfront)
9. [Step 8: Testing](#step-8-testing)
10. [Step 9: Monitoring](#step-9-monitoring)

---

## Prerequisites

### Required Tools
- AWS Account with administrative access
- AWS CLI v2 installed and configured
- Node.js 18.x or later
- Git

### Configure AWS CLI

```bash
aws configure
# Enter your:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., us-east-1)
# - Default output format (json)
```

### Verify Configuration

```bash
aws sts get-caller-identity
```

---

## Step 1: Set Up DynamoDB Tables

### 1.1 Create Connections Table

This table stores active WebSocket connections.

```bash
aws dynamodb create-table \
    --table-name ChatConnections \
    --attribute-definitions \
        AttributeName=connectionId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
    --key-schema \
        AttributeName=connectionId,KeyType=HASH \
    --global-secondary-indexes \
        "[{\"IndexName\": \"UserIdIndex\",
          \"KeySchema\": [{\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"}],
          \"Projection\":{\"ProjectionType\":\"ALL\"},
          \"ProvisionedThroughput\": {\"ReadCapacityUnits\": 5, \"WriteCapacityUnits\": 5}}]" \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region us-east-1
```

### 1.2 Create Messages Table

This table stores chat messages.

```bash
aws dynamodb create-table \
    --table-name ChatMessages \
    --attribute-definitions \
        AttributeName=messageId,AttributeType=S \
        AttributeName=timestamp,AttributeType=N \
        AttributeName=roomId,AttributeType=S \
    --key-schema \
        AttributeName=messageId,KeyType=HASH \
    --global-secondary-indexes \
        "[{\"IndexName\": \"RoomIdTimestampIndex\",
          \"KeySchema\": [
            {\"AttributeName\":\"roomId\",\"KeyType\":\"HASH\"},
            {\"AttributeName\":\"timestamp\",\"KeyType\":\"RANGE\"}
          ],
          \"Projection\":{\"ProjectionType\":\"ALL\"},
          \"ProvisionedThroughput\": {\"ReadCapacityUnits\": 5, \"WriteCapacityUnits\": 5}}]" \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region us-east-1
```

### 1.3 Enable Point-in-Time Recovery (Optional but Recommended)

```bash
aws dynamodb update-continuous-backups \
    --table-name ChatConnections \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true

aws dynamodb update-continuous-backups \
    --table-name ChatMessages \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

### 1.4 Verify Tables

```bash
aws dynamodb list-tables
aws dynamodb describe-table --table-name ChatConnections
aws dynamodb describe-table --table-name ChatMessages
```

---

## Step 2: Create IAM Roles

### 2.1 Create Lambda Execution Role

Create a trust policy file:

```bash
cat > lambda-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
```

Create the role:

```bash
aws iam create-role \
    --role-name ChatAppLambdaRole \
    --assume-role-policy-document file://lambda-trust-policy.json
```

### 2.2 Create Lambda Policy

Create policy file:

```bash
cat > lambda-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/ChatConnections",
        "arn:aws:dynamodb:us-east-1:*:table/ChatConnections/index/*",
        "arn:aws:dynamodb:us-east-1:*:table/ChatMessages",
        "arn:aws:dynamodb:us-east-1:*:table/ChatMessages/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "execute-api:ManageConnections"
      ],
      "Resource": "arn:aws:execute-api:us-east-1:*:*/*/@connections/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:*:*"
    }
  ]
}
EOF
```

Attach the policy:

```bash
aws iam put-role-policy \
    --role-name ChatAppLambdaRole \
    --policy-name ChatAppLambdaPolicy \
    --policy-document file://lambda-policy.json
```

### 2.3 Get Role ARN (Save This!)

```bash
aws iam get-role --role-name ChatAppLambdaRole --query 'Role.Arn' --output text
```

Save the ARN - you'll need it for Lambda functions.

---

## Step 3: Deploy Lambda Functions

### 3.1 Package and Deploy Connect Handler

```bash
cd backend/lambda/connect
npm install
zip -r connect.zip .

aws lambda create-function \
    --function-name ChatConnectHandler \
    --runtime nodejs18.x \
    --role arn:aws:iam::YOUR_ACCOUNT_ID:role/ChatAppLambdaRole \
    --handler index.handler \
    --zip-file fileb://connect.zip \
    --timeout 10 \
    --memory-size 256 \
    --environment Variables="{CONNECTIONS_TABLE=ChatConnections}" \
    --region us-east-1
```

### 3.2 Package and Deploy Disconnect Handler

```bash
cd ../disconnect
npm install
zip -r disconnect.zip .

aws lambda create-function \
    --function-name ChatDisconnectHandler \
    --runtime nodejs18.x \
    --role arn:aws:iam::YOUR_ACCOUNT_ID:role/ChatAppLambdaRole \
    --handler index.handler \
    --zip-file fileb://disconnect.zip \
    --timeout 10 \
    --memory-size 256 \
    --environment Variables="{CONNECTIONS_TABLE=ChatConnections}" \
    --region us-east-1
```

### 3.3 Package and Deploy Message Handler

```bash
cd ../sendMessage
npm install
zip -r sendMessage.zip .

aws lambda create-function \
    --function-name ChatMessageHandler \
    --runtime nodejs18.x \
    --role arn:aws:iam::YOUR_ACCOUNT_ID:role/ChatAppLambdaRole \
    --handler index.handler \
    --zip-file fileb://sendMessage.zip \
    --timeout 30 \
    --memory-size 512 \
    --environment Variables="{CONNECTIONS_TABLE=ChatConnections,MESSAGES_TABLE=ChatMessages}" \
    --region us-east-1
```

### 3.4 Verify Lambda Functions

```bash
aws lambda list-functions --query 'Functions[?contains(FunctionName, `Chat`)].FunctionName'
```

---

## Step 4: Create API Gateway WebSocket API

### 4.1 Create WebSocket API

```bash
aws apigatewayv2 create-api \
    --name ChatWebSocketAPI \
    --protocol-type WEBSOCKET \
    --route-selection-expression '$request.body.action' \
    --region us-east-1
```

Save the API ID from the output.

### 4.2 Create Integrations

Get Lambda ARNs:

```bash
CONNECT_ARN=$(aws lambda get-function --function-name ChatConnectHandler --query 'Configuration.FunctionArn' --output text)
DISCONNECT_ARN=$(aws lambda get-function --function-name ChatDisconnectHandler --query 'Configuration.FunctionArn' --output text)
MESSAGE_ARN=$(aws lambda get-function --function-name ChatMessageHandler --query 'Configuration.FunctionArn' --output text)
```

Create $connect integration:

```bash
aws apigatewayv2 create-integration \
    --api-id YOUR_API_ID \
    --integration-type AWS_PROXY \
    --integration-uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$CONNECT_ARN/invocations \
    --region us-east-1
```

Create $disconnect integration:

```bash
aws apigatewayv2 create-integration \
    --api-id YOUR_API_ID \
    --integration-type AWS_PROXY \
    --integration-uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$DISCONNECT_ARN/invocations \
    --region us-east-1
```

Create sendMessage integration:

```bash
aws apigatewayv2 create-integration \
    --api-id YOUR_API_ID \
    --integration-type AWS_PROXY \
    --integration-uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$MESSAGE_ARN/invocations \
    --region us-east-1
```

### 4.3 Create Routes

Create $connect route:

```bash
aws apigatewayv2 create-route \
    --api-id YOUR_API_ID \
    --route-key '$connect' \
    --target integrations/CONNECT_INTEGRATION_ID \
    --region us-east-1
```

Create $disconnect route:

```bash
aws apigatewayv2 create-route \
    --api-id YOUR_API_ID \
    --route-key '$disconnect' \
    --target integrations/DISCONNECT_INTEGRATION_ID \
    --region us-east-1
```

Create sendMessage route:

```bash
aws apigatewayv2 create-route \
    --api-id YOUR_API_ID \
    --route-key 'sendMessage' \
    --target integrations/MESSAGE_INTEGRATION_ID \
    --region us-east-1
```

### 4.4 Create Stage and Deploy

```bash
aws apigatewayv2 create-stage \
    --api-id YOUR_API_ID \
    --stage-name production \
    --region us-east-1

aws apigatewayv2 create-deployment \
    --api-id YOUR_API_ID \
    --stage-name production \
    --region us-east-1
```

### 4.5 Grant API Gateway Permission to Invoke Lambda

```bash
aws lambda add-permission \
    --function-name ChatConnectHandler \
    --statement-id apigateway-connect \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:YOUR_ACCOUNT_ID:YOUR_API_ID/*/*"

aws lambda add-permission \
    --function-name ChatDisconnectHandler \
    --statement-id apigateway-disconnect \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:YOUR_ACCOUNT_ID:YOUR_API_ID/*/*"

aws lambda add-permission \
    --function-name ChatMessageHandler \
    --statement-id apigateway-message \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:YOUR_ACCOUNT_ID:YOUR_API_ID/*/*"
```

### 4.6 Get WebSocket URL

```bash
echo "wss://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/production"
```

---

## Step 5: Set Up Amazon Cognito

### 5.1 Create User Pool

```bash
aws cognito-idp create-user-pool \
    --pool-name ChatAppUserPool \
    --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" \
    --auto-verified-attributes email \
    --username-attributes email \
    --region us-east-1
```

Save the UserPoolId from the output.

### 5.2 Create User Pool Client

```bash
aws cognito-idp create-user-pool-client \
    --user-pool-id YOUR_USER_POOL_ID \
    --client-name ChatAppWebClient \
    --no-generate-secret \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --region us-east-1
```

Save the ClientId from the output.

### 5.3 Create Identity Pool

```bash
aws cognito-identity create-identity-pool \
    --identity-pool-name ChatAppIdentityPool \
    --allow-unauthenticated-identities \
    --cognito-identity-providers ProviderName=cognito-idp.us-east-1.amazonaws.com/YOUR_USER_POOL_ID,ClientId=YOUR_CLIENT_ID \
    --region us-east-1
```

---

## Step 6: Deploy Frontend to S3

### 6.1 Create S3 Bucket

```bash
aws s3 mb s3://chatapp-frontend-YOUR_UNIQUE_ID --region us-east-1
```

### 6.2 Configure Environment Variables

Create `.env` file in the frontend directory:

```bash
cd frontend
cat > .env << EOF
REACT_APP_WEBSOCKET_URL=wss://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/production
REACT_APP_COGNITO_USER_POOL_ID=YOUR_USER_POOL_ID
REACT_APP_COGNITO_CLIENT_ID=YOUR_CLIENT_ID
REACT_APP_COGNITO_REGION=us-east-1
EOF
```

### 6.3 Build Frontend

```bash
npm install
npm run build
```

### 6.4 Upload to S3

```bash
aws s3 sync build/ s3://chatapp-frontend-YOUR_UNIQUE_ID/ --delete
```

### 6.5 Enable Static Website Hosting

```bash
aws s3 website s3://chatapp-frontend-YOUR_UNIQUE_ID/ \
    --index-document index.html \
    --error-document index.html
```

### 6.6 Set Bucket Policy for Public Access

```bash
cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::chatapp-frontend-YOUR_UNIQUE_ID/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
    --bucket chatapp-frontend-YOUR_UNIQUE_ID \
    --policy file://bucket-policy.json
```

---

## Step 7: Configure CloudFront (Optional)

### 7.1 Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
    --origin-domain-name chatapp-frontend-YOUR_UNIQUE_ID.s3-website-us-east-1.amazonaws.com \
    --default-root-object index.html
```

### 7.2 Wait for Distribution Deployment

This can take 15-20 minutes. Check status:

```bash
aws cloudfront list-distributions
```

---

## Step 8: Testing

### 8.1 Test WebSocket Connection with wscat

Install wscat:

```bash
npm install -g wscat
```

Test connection:

```bash
wscat -c wss://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/production
```

Send a test message:

```json
{"action": "sendMessage", "message": "Hello World!", "roomId": "general"}
```

### 8.2 Test Frontend

Open your browser to:
```
http://chatapp-frontend-YOUR_UNIQUE_ID.s3-website-us-east-1.amazonaws.com
```

Or CloudFront URL if configured.

### 8.3 Create Test User

```bash
aws cognito-idp sign-up \
    --client-id YOUR_CLIENT_ID \
    --username test@example.com \
    --password Test123! \
    --region us-east-1

aws cognito-idp admin-confirm-sign-up \
    --user-pool-id YOUR_USER_POOL_ID \
    --username test@example.com \
    --region us-east-1
```

---

## Step 9: Monitoring

### 9.1 View Lambda Logs

```bash
aws logs tail /aws/lambda/ChatConnectHandler --follow
aws logs tail /aws/lambda/ChatDisconnectHandler --follow
aws logs tail /aws/lambda/ChatMessageHandler --follow
```

### 9.2 Monitor DynamoDB

```bash
aws dynamodb describe-table --table-name ChatConnections
aws dynamodb scan --table-name ChatConnections --max-items 10
aws dynamodb scan --table-name ChatMessages --max-items 10
```

### 9.3 API Gateway Metrics

View in AWS Console → API Gateway → Your API → Monitoring

Or use CloudWatch:

```bash
aws cloudwatch get-metric-statistics \
    --namespace AWS/ApiGateway \
    --metric-name Count \
    --dimensions Name=ApiId,Value=YOUR_API_ID \
    --start-time 2026-01-10T00:00:00Z \
    --end-time 2026-01-10T23:59:59Z \
    --period 3600 \
    --statistics Sum
```

---

## Troubleshooting

### Lambda Function Issues
- Check CloudWatch logs for errors
- Verify IAM role permissions
- Ensure environment variables are set correctly

### WebSocket Connection Issues
- Verify API Gateway deployment
- Check Lambda permissions for API Gateway
- Test with wscat first

### DynamoDB Issues
- Check table exists: `aws dynamodb list-tables`
- Verify IAM permissions
- Check provisioned capacity

### Authentication Issues
- Verify Cognito User Pool and Client IDs
- Check user confirmation status
- Review Cognito CloudWatch logs

---

## Cleanup (Delete All Resources)

```bash
# Delete Lambda functions
aws lambda delete-function --function-name ChatConnectHandler
aws lambda delete-function --function-name ChatDisconnectHandler
aws lambda delete-function --function-name ChatMessageHandler

# Delete API Gateway
aws apigatewayv2 delete-api --api-id YOUR_API_ID

# Delete DynamoDB tables
aws dynamodb delete-table --table-name ChatConnections
aws dynamodb delete-table --table-name ChatMessages

# Empty and delete S3 bucket
aws s3 rm s3://chatapp-frontend-YOUR_UNIQUE_ID --recursive
aws s3 rb s3://chatapp-frontend-YOUR_UNIQUE_ID

# Delete Cognito resources
aws cognito-idp delete-user-pool --user-pool-id YOUR_USER_POOL_ID
aws cognito-identity delete-identity-pool --identity-pool-id YOUR_IDENTITY_POOL_ID

# Delete IAM role
aws iam delete-role-policy --role-name ChatAppLambdaRole --policy-name ChatAppLambdaPolicy
aws iam delete-role --role-name ChatAppLambdaRole

# Delete CloudFront distribution (if created)
aws cloudfront delete-distribution --id YOUR_DISTRIBUTION_ID --if-match ETAG
```

---

## Next Steps

1. Add message persistence with longer TTL
2. Implement typing indicators
3. Add file/image sharing
4. Create chat rooms/channels
5. Add user presence (online/offline status)
6. Implement message read receipts
7. Add push notifications
8. Set up CI/CD pipeline

---

## Support

For issues or questions:
- Check AWS CloudWatch Logs
- Review AWS documentation
- Check GitHub issues (if repository exists)

## Cost Optimization Tips

1. Use DynamoDB on-demand pricing for variable workloads
2. Set up Lambda reserved concurrency
3. Enable S3 intelligent tiering
4. Use CloudFront for reduced S3 costs
5. Set up budget alerts in AWS Billing
