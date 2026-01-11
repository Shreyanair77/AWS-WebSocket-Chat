# Quick Start Guide

This guide will help you get the Real-Time Chat Application up and running quickly.

## Prerequisites

- AWS Account
- AWS CLI configured
- Node.js 18.x or later
- npm or yarn

## Option 1: Automated Deployment (Recommended)

### Step 1: Install AWS SAM CLI

```bash
# macOS
brew install aws-sam-cli

# Or using pip
pip install aws-sam-cli
```

### Step 2: Clone and Deploy

```bash
# Navigate to project directory
cd /Users/apple/Desktop/Project2AWS

# Make scripts executable
chmod +x backend/scripts/*.sh

# Run automated deployment
./backend/scripts/deploy.sh
```

The script will:
1. Create S3 bucket for deployments
2. Install Lambda dependencies
3. Package CloudFormation template
4. Deploy infrastructure
5. Build and deploy frontend
6. Output your application URL

### Step 3: Access Your Application

Open the frontend URL provided at the end of deployment:
```
http://chatapp-frontend-XXXXXXXXXX-production.s3-website-us-east-1.amazonaws.com
```

## Option 2: Manual Deployment

### Step 1: Set Up DynamoDB Tables

```bash
cd backend/scripts
chmod +x setup-dynamodb.sh
./setup-dynamodb.sh
```

### Step 2: Create IAM Role

```bash
# Create trust policy
cat > lambda-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

# Create role
aws iam create-role \
    --role-name ChatAppLambdaRole \
    --assume-role-policy-document file://lambda-trust-policy.json

# Attach policies (use the policy from deployment guide)
```

### Step 3: Deploy Lambda Functions

```bash
# Connect Handler
cd backend/lambda/connect
npm install
zip -r connect.zip .
aws lambda create-function \
    --function-name ChatConnectHandler \
    --runtime nodejs18.x \
    --role arn:aws:iam::YOUR_ACCOUNT_ID:role/ChatAppLambdaRole \
    --handler index.handler \
    --zip-file fileb://connect.zip \
    --environment Variables="{CONNECTIONS_TABLE=ChatConnections-production}"

# Repeat for disconnect and sendMessage handlers
```

### Step 4: Create API Gateway

Follow the detailed steps in `AWS_DEPLOYMENT_GUIDE.md`

### Step 5: Deploy Frontend

```bash
cd frontend

# Create .env file
cat > .env << EOF
REACT_APP_WEBSOCKET_URL=wss://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/production
EOF

# Build and deploy
npm install
npm run build

# Create S3 bucket
aws s3 mb s3://chatapp-frontend-YOUR_UNIQUE_ID

# Upload files
aws s3 sync build/ s3://chatapp-frontend-YOUR_UNIQUE_ID/

# Enable website hosting
aws s3 website s3://chatapp-frontend-YOUR_UNIQUE_ID/ \
    --index-document index.html \
    --error-document index.html
```

## Testing Your Deployment

### Test 1: WebSocket Connection

```bash
npm install -g wscat
wscat -c wss://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/production
```

### Test 2: Send a Message

In wscat terminal:
```json
{"action":"sendMessage","message":"Hello World!","username":"TestUser"}
```

### Test 3: Open Frontend

1. Open browser to your S3 website URL
2. Enter a username
3. Send messages
4. Open in another browser/tab to test real-time updates

## Common Issues

### Issue 1: WebSocket Connection Fails

**Solution:**
- Check API Gateway deployment status
- Verify Lambda permissions
- Check CloudWatch logs

```bash
aws logs tail /aws/lambda/ChatConnectHandler-production --follow
```

### Issue 2: Messages Not Appearing

**Solution:**
- Check DynamoDB table exists
- Verify IAM permissions
- Check Lambda function logs

```bash
aws logs tail /aws/lambda/ChatMessageHandler-production --follow
```

### Issue 3: Frontend Not Loading

**Solution:**
- Verify S3 bucket policy is public
- Check .env file has correct WebSocket URL
- Clear browser cache

## Monitoring

### View Logs

```bash
# Lambda logs
aws logs tail /aws/lambda/ChatConnectHandler-production --follow

# API Gateway logs
aws logs tail /aws/apigateway/ChatWebSocketAPI-production --follow
```

### Check DynamoDB Data

```bash
# View connections
aws dynamodb scan --table-name ChatConnections-production --max-items 10

# View messages
aws dynamodb scan --table-name ChatMessages-production --max-items 10
```

## Cleanup

To delete all resources:

```bash
# Using CloudFormation (if deployed via SAM)
aws cloudformation delete-stack --stack-name ChatAppStack

# Manual cleanup
aws lambda delete-function --function-name ChatConnectHandler
aws lambda delete-function --function-name ChatDisconnectHandler
aws lambda delete-function --function-name ChatMessageHandler
aws apigatewayv2 delete-api --api-id YOUR_API_ID
aws dynamodb delete-table --table-name ChatConnections-production
aws dynamodb delete-table --table-name ChatMessages-production
aws s3 rb s3://chatapp-frontend-YOUR_UNIQUE_ID --force
aws iam delete-role --role-name ChatAppLambdaRole
```

## Next Steps

1. Set up Amazon Cognito for user authentication
2. Add CloudFront for CDN
3. Implement chat rooms
4. Add file sharing capability
5. Set up monitoring dashboards

## Support

For detailed documentation, see:
- [AWS_DEPLOYMENT_GUIDE.md](../AWS_DEPLOYMENT_GUIDE.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [SECURITY.md](./SECURITY.md)

## Cost Estimate

Free Tier eligible:
- Lambda: 1M free requests/month
- DynamoDB: 25GB storage, 200M requests
- API Gateway: 1M messages
- S3: 5GB storage, 20K GET requests

Estimated cost after free tier: $5-20/month for moderate usage
