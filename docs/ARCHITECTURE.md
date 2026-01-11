# Architecture Documentation

## System Architecture

The Real-Time Chat Application is built using serverless architecture on AWS, providing scalability, reliability, and cost-effectiveness.

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Web Browser (React Application)                         │  │
│  │  - User Interface                                        │  │
│  │  - WebSocket Client                                      │  │
│  │  - Authentication Logic                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                    Content Delivery Layer                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Amazon CloudFront (Optional)                            │  │
│  │  - Global CDN                                            │  │
│  │  - HTTPS Termination                                     │  │
│  │  - Caching                                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                      Storage Layer                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Amazon S3                                               │  │
│  │  - Static Website Hosting                               │  │
│  │  - HTML, CSS, JavaScript                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                  Authentication Layer                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Amazon Cognito                                          │  │
│  │  - User Pools                                            │  │
│  │  - Identity Pools                                        │  │
│  │  - JWT Token Management                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                   WebSocket API Layer                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Amazon API Gateway (WebSocket API)                      │  │
│  │  ┌────────────┬────────────────┬──────────────────────┐ │  │
│  │  │ $connect   │ $disconnect    │ sendMessage          │ │  │
│  │  │ route      │ route          │ route                │ │  │
│  │  └────────────┴────────────────┴──────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
┌────────────────────────────────────────────────────────────────┐
│                    Compute Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   Lambda     │  │   Lambda     │  │      Lambda          │ │
│  │   Connect    │  │ Disconnect   │  │   SendMessage        │ │
│  │   Handler    │  │   Handler    │  │    Handler           │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                    Data Layer                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Amazon DynamoDB                                         │  │
│  │  ┌────────────────────┬──────────────────────────────┐  │  │
│  │  │ Connections Table  │  Messages Table              │  │  │
│  │  │ - connectionId     │  - messageId                 │  │  │
│  │  │ - userId           │  - roomId                    │  │  │
│  │  │ - username         │  - username                  │  │  │
│  │  │ - connectedAt      │  - message                   │  │  │
│  │  │ - ttl              │  - timestamp                 │  │  │
│  │  │                    │  - ttl                       │  │  │
│  │  └────────────────────┴──────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                 Monitoring & Logging Layer                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Amazon CloudWatch                                       │  │
│  │  - Lambda Function Logs                                  │  │
│  │  - API Gateway Logs                                      │  │
│  │  - Metrics & Alarms                                      │  │
│  │  - Dashboards                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend (React Application)

**Technologies:**
- React 18
- WebSocket API
- Local Storage for session management

**Responsibilities:**
- User interface rendering
- WebSocket connection management
- Message display and input
- User authentication flow

**Files:**
- `App.js` - Main application component
- `Chat.js` - Chat interface component
- `Login.js` - Authentication component
- `MessageList.js` - Message display component
- `websocket.js` - WebSocket service

### 2. API Gateway (WebSocket API)

**Routes:**
1. **$connect** - Triggered when client connects
2. **$disconnect** - Triggered when client disconnects
3. **sendMessage** - Custom route for sending messages

**Features:**
- Persistent connections
- Route selection based on message action
- Integration with Lambda functions
- Connection management

### 3. Lambda Functions

#### ConnectHandler
```javascript
Trigger: $connect route
Purpose: Register new WebSocket connections
Actions:
  - Store connection ID in DynamoDB
  - Record user information
  - Set TTL for auto-cleanup
```

#### DisconnectHandler
```javascript
Trigger: $disconnect route
Purpose: Clean up disconnected clients
Actions:
  - Remove connection from DynamoDB
  - Log disconnection event
```

#### MessageHandler
```javascript
Trigger: sendMessage route
Purpose: Process and broadcast messages
Actions:
  - Validate message
  - Store message in DynamoDB
  - Retrieve all active connections
  - Broadcast to all connected clients
  - Handle stale connections
```

### 4. DynamoDB Tables

#### Connections Table
```
Primary Key: connectionId (String)
GSI: UserIdIndex on userId
Attributes:
  - connectionId: WebSocket connection ID
  - userId: User identifier
  - username: Display name
  - connectedAt: Timestamp
  - ttl: Time-to-live for auto-deletion

Purpose: Track active WebSocket connections
```

#### Messages Table
```
Primary Key: messageId (String)
GSI: RoomIdTimestampIndex (roomId + timestamp)
Attributes:
  - messageId: Unique message identifier
  - roomId: Chat room/channel
  - username: Sender name
  - message: Message content
  - timestamp: Message timestamp
  - connectionId: Sender connection
  - ttl: Time-to-live (30 days)

Purpose: Store chat message history
```

## Data Flow

### Connection Flow
```
1. User opens web application
2. React app initiates WebSocket connection
3. API Gateway receives $connect request
4. ConnectHandler Lambda invoked
5. Connection stored in DynamoDB
6. Connection established and confirmed
```

### Message Flow
```
1. User types message and clicks send
2. WebSocket sends message with action="sendMessage"
3. API Gateway routes to MessageHandler
4. MessageHandler:
   a. Validates message
   b. Stores in Messages table
   c. Queries all active connections
   d. Posts message to each connection
5. All clients receive message via WebSocket
6. React app updates UI with new message
```

### Disconnection Flow
```
1. User closes browser or loses connection
2. API Gateway detects disconnection
3. DisconnectHandler Lambda invoked
4. Connection removed from DynamoDB
5. Resources cleaned up
```

## Scalability Considerations

### Horizontal Scaling
- **Lambda Functions**: Auto-scale based on concurrent connections
- **DynamoDB**: On-demand or provisioned capacity
- **API Gateway**: Handles 10,000+ concurrent connections per account

### Performance Optimization
- DynamoDB GSI for efficient queries
- TTL for automatic data cleanup
- Connection pooling in Lambda
- Message batching for broadcasts

### Cost Optimization
- TTL reduces storage costs
- On-demand DynamoDB for variable load
- Lambda reserved concurrency for predictable workloads
- S3 for cost-effective static hosting

## Reliability & Availability

### High Availability
- Multi-AZ DynamoDB deployment
- Lambda functions distributed across AZs
- API Gateway regional endpoints

### Fault Tolerance
- Automatic retry logic in Lambda
- Dead letter queues for failed messages
- Client-side reconnection logic
- Stale connection detection and cleanup

### Data Durability
- DynamoDB point-in-time recovery
- Automatic backups
- Cross-region replication (optional)

## Security Architecture

### Network Security
- HTTPS/WSS encryption in transit
- VPC endpoints (optional)
- Security groups and NACLs

### Authentication & Authorization
- Cognito User Pools for authentication
- JWT token validation
- IAM roles for service-to-service auth

### Data Security
- DynamoDB encryption at rest
- S3 bucket policies
- Least privilege IAM policies

## Monitoring Architecture

### Metrics
- WebSocket connection count
- Message throughput
- Lambda duration and errors
- DynamoDB read/write capacity

### Logging
- CloudWatch Logs for all Lambda functions
- API Gateway access logs
- Custom application logs

### Alarms
- High error rates
- Throttling events
- Capacity exceeded
- Failed connections

## Extension Points

### Future Enhancements
1. **Private Rooms**: Implement room-based access control
2. **File Sharing**: Add S3 integration for file uploads
3. **Typing Indicators**: Real-time typing status
4. **Read Receipts**: Track message read status
5. **Push Notifications**: Mobile notifications via SNS
6. **Message Search**: ElasticSearch integration
7. **User Presence**: Online/offline status
8. **Message Reactions**: Emoji reactions
9. **Admin Dashboard**: Moderation tools
10. **Analytics**: User engagement metrics

## Technology Decisions

### Why WebSocket?
- Real-time bidirectional communication
- Lower latency than polling
- Efficient use of resources
- Native browser support

### Why Serverless?
- No server management
- Pay-per-use pricing
- Automatic scaling
- Built-in high availability

### Why DynamoDB?
- Low latency at scale
- Flexible schema
- Built-in TTL
- Seamless scaling

### Why React?
- Component-based architecture
- Large ecosystem
- Excellent developer experience
- Strong community support
