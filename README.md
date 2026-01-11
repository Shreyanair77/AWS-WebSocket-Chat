# Real-Time Chat Application Using WebSockets on AWS

A serverless real-time chat application built with AWS services including API Gateway WebSocket API, Lambda, DynamoDB, Cognito, and S3.

## Architecture Overview

```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Amazon CloudFront (CDN)            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Amazon S3 (Static Website)         │
│  - React Frontend                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Amazon Cognito                      │
│  - User Authentication               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  API Gateway (WebSocket API)        │
│  - $connect route                   │
│  - $disconnect route                │
│  - sendMessage route                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  AWS Lambda Functions               │
│  - ConnectHandler                   │
│  - DisconnectHandler                │
│  - MessageHandler                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Amazon DynamoDB                    │
│  - Connections Table                │
│  - Messages Table                   │
└─────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Amazon CloudWatch Logs             │
│  - Lambda Logs                      │
│  - API Gateway Logs                 │
└─────────────────────────────────────┘
```

## Features

- ✅ Real-time bidirectional communication using WebSockets
- ✅ User authentication with Amazon Cognito
- ✅ Scalable message storage with DynamoDB
- ✅ Serverless architecture (no server management)
- ✅ Modern React frontend
- ✅ Secure HTTPS/WSS connections
- ✅ CloudWatch logging and monitoring
- ✅ IAM role-based security

## Project Structure

```
Project2AWS/
├── README.md
├── AWS_DEPLOYMENT_GUIDE.md
├── backend/
│   ├── lambda/
│   │   ├── connect/
│   │   │   ├── index.js
│   │   │   └── package.json
│   │   ├── disconnect/
│   │   │   ├── index.js
│   │   │   └── package.json
│   │   └── sendMessage/
│   │       ├── index.js
│   │       └── package.json
│   ├── cloudformation/
│   │   └── template.yaml
│   └── scripts/
│       ├── deploy.sh
│       └── setup-dynamodb.sh
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.js
│   │   │   ├── Login.js
│   │   │   └── MessageList.js
│   │   ├── services/
│   │   │   ├── websocket.js
│   │   │   └── auth.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   ├── package.json
│   └── .env.example
└── docs/
    ├── ARCHITECTURE.md
    └── SECURITY.md
```

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js 18.x or later
- npm or yarn package manager
- Basic knowledge of React and AWS services

## Quick Start

1. Clone the repository
2. Follow the [AWS Deployment Guide](./AWS_DEPLOYMENT_GUIDE.md)
3. Configure the frontend with your API endpoints
4. Deploy the frontend to S3
5. Access your chat application

## Technology Stack

### Backend
- **API Gateway WebSocket API**: Real-time communication
- **AWS Lambda**: Serverless functions (Node.js 18.x)
- **Amazon DynamoDB**: NoSQL database for connections and messages
- **Amazon Cognito**: User authentication and authorization
- **IAM**: Security and access control
- **CloudWatch**: Logging and monitoring

### Frontend
- **React 18**: Modern UI library
- **WebSocket API**: Real-time messaging
- **AWS Amplify**: Authentication integration
- **Amazon S3**: Static website hosting
- **CloudFront**: CDN for global distribution

## Detailed Deployment Steps

See [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md) for complete step-by-step instructions.

## Security Features

- ✅ HTTPS/WSS encryption for all communications
- ✅ Cognito user pools for authentication
- ✅ IAM roles with least privilege access
- ✅ DynamoDB encryption at rest
- ✅ API Gateway request validation
- ✅ CloudWatch audit logs

## Monitoring and Logging

- Lambda function logs in CloudWatch
- API Gateway access logs
- DynamoDB metrics
- Custom metrics for message delivery

## Cost Estimation

This serverless architecture follows a pay-per-use model:
- API Gateway: $1.00 per million messages
- Lambda: Free tier includes 1M requests/month
- DynamoDB: Free tier includes 25GB storage
- S3: Free tier includes 5GB storage
- CloudFront: Free tier includes 50GB data transfer

## License

MIT License

## Author

Created as part of AWS serverless project portfolio
