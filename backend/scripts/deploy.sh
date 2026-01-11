#!/bin/bash

# Deploy script for AWS WebSocket Chat Application
# This script packages and deploys the Lambda functions and infrastructure

set -e

# Configuration
STACK_NAME="ChatAppStack"
REGION="us-east-1"
ENVIRONMENT="production"
S3_BUCKET="chatapp-deployment-$(aws sts get-caller-identity --query Account --output text)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AWS WebSocket Chat Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo -e "${YELLOW}Warning: SAM CLI is not installed. Installing...${NC}"
    pip install aws-sam-cli
fi

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}AWS Account ID: ${ACCOUNT_ID}${NC}"
echo ""

# Create S3 bucket for deployment artifacts if it doesn't exist
echo -e "${YELLOW}Step 1: Creating S3 bucket for deployment artifacts...${NC}"
if aws s3 ls "s3://${S3_BUCKET}" 2>&1 | grep -q 'NoSuchBucket'; then
    aws s3 mb "s3://${S3_BUCKET}" --region ${REGION}
    echo -e "${GREEN}✓ Created bucket: ${S3_BUCKET}${NC}"
else
    echo -e "${GREEN}✓ Bucket already exists: ${S3_BUCKET}${NC}"
fi
echo ""

# Install Lambda dependencies
echo -e "${YELLOW}Step 2: Installing Lambda dependencies...${NC}"
cd backend/lambda/connect
npm install
cd ../disconnect
npm install
cd ../sendMessage
npm install
cd ../../..
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Package the CloudFormation template
echo -e "${YELLOW}Step 3: Packaging CloudFormation template...${NC}"
sam package \
    --template-file backend/cloudformation/template.yaml \
    --output-template-file packaged-template.yaml \
    --s3-bucket ${S3_BUCKET} \
    --region ${REGION}
echo -e "${GREEN}✓ Template packaged${NC}"
echo ""

# Deploy the stack
echo -e "${YELLOW}Step 4: Deploying CloudFormation stack...${NC}"
sam deploy \
    --template-file packaged-template.yaml \
    --stack-name ${STACK_NAME} \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides Environment=${ENVIRONMENT} \
    --region ${REGION} \
    --no-fail-on-empty-changeset
echo -e "${GREEN}✓ Stack deployed${NC}"
echo ""

# Get stack outputs
echo -e "${YELLOW}Step 5: Retrieving stack outputs...${NC}"
WEBSOCKET_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query 'Stacks[0].Outputs[?OutputKey==`WebSocketURL`].OutputValue' \
    --output text \
    --region ${REGION})

FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
    --output text \
    --region ${REGION})

FRONTEND_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendURL`].OutputValue' \
    --output text \
    --region ${REGION})

echo -e "${GREEN}✓ Stack outputs retrieved${NC}"
echo ""

# Create .env file for frontend
echo -e "${YELLOW}Step 6: Creating frontend .env file...${NC}"
cat > frontend/.env << EOF
REACT_APP_WEBSOCKET_URL=${WEBSOCKET_URL}
REACT_APP_AWS_REGION=${REGION}
EOF
echo -e "${GREEN}✓ .env file created${NC}"
echo ""

# Build frontend
echo -e "${YELLOW}Step 7: Building frontend...${NC}"
cd frontend
npm install
npm run build
cd ..
echo -e "${GREEN}✓ Frontend built${NC}"
echo ""

# Deploy frontend to S3
echo -e "${YELLOW}Step 8: Deploying frontend to S3...${NC}"
aws s3 sync frontend/build/ "s3://${FRONTEND_BUCKET}/" --delete
echo -e "${GREEN}✓ Frontend deployed${NC}"
echo ""

# Print deployment summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Completed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Stack Name:${NC} ${STACK_NAME}"
echo -e "${YELLOW}Region:${NC} ${REGION}"
echo -e "${YELLOW}Environment:${NC} ${ENVIRONMENT}"
echo ""
echo -e "${YELLOW}WebSocket URL:${NC} ${WEBSOCKET_URL}"
echo -e "${YELLOW}Frontend URL:${NC} ${FRONTEND_URL}"
echo ""
echo -e "${GREEN}You can now access your chat application at:${NC}"
echo -e "${GREEN}${FRONTEND_URL}${NC}"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo "aws logs tail /aws/lambda/ChatConnectHandler-${ENVIRONMENT} --follow"
echo "aws logs tail /aws/lambda/ChatMessageHandler-${ENVIRONMENT} --follow"
echo ""
echo -e "${YELLOW}To delete the stack:${NC}"
echo "aws cloudformation delete-stack --stack-name ${STACK_NAME} --region ${REGION}"
echo ""
