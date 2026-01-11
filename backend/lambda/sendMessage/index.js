/**
 * Lambda function to handle sending messages through WebSocket
 * Stores messages in DynamoDB and broadcasts to all connected clients
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'ChatConnections';
const MESSAGES_TABLE = process.env.MESSAGES_TABLE || 'ChatMessages';

exports.handler = async (event) => {
  console.log('Message event:', JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  // Initialize API Gateway Management API client
  const apiGatewayClient = new ApiGatewayManagementApiClient({
    endpoint: `https://${domain}/${stage}`,
    region: process.env.AWS_REGION || 'us-east-1',
  });

  try {
    // Parse message from request body
    const body = JSON.parse(event.body);
    const { message, username, roomId = 'general' } = body;

    if (!message || !username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Message and username are required' 
        }),
      };
    }

    const timestamp = Date.now();
    const messageId = `${roomId}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

    // Store message in DynamoDB
    const messageParams = {
      TableName: MESSAGES_TABLE,
      Item: {
        messageId: messageId,
        roomId: roomId,
        username: username,
        message: message,
        timestamp: timestamp,
        connectionId: connectionId,
        ttl: Math.floor(Date.now() / 1000) + 2592000, // 30 days TTL
      },
    };

    await docClient.send(new PutCommand(messageParams));
    console.log(`Message ${messageId} stored successfully`);

    // Get all active connections
    const scanParams = {
      TableName: CONNECTIONS_TABLE,
    };

    const connections = await docClient.send(new ScanCommand(scanParams));

    // Prepare message to broadcast
    const broadcastMessage = JSON.stringify({
      type: 'message',
      messageId: messageId,
      username: username,
      message: message,
      timestamp: timestamp,
      roomId: roomId,
    });

    // Broadcast to all connected clients
    const postCalls = connections.Items.map(async ({ connectionId: connId }) => {
      try {
        const postParams = {
          ConnectionId: connId,
          Data: broadcastMessage,
        };
        await apiGatewayClient.send(new PostToConnectionCommand(postParams));
        console.log(`Message sent to connection ${connId}`);
      } catch (error) {
        if (error.statusCode === 410) {
          // Connection is stale, remove it
          console.log(`Removing stale connection ${connId}`);
          const deleteParams = {
            TableName: CONNECTIONS_TABLE,
            Key: { connectionId: connId },
          };
          await docClient.send(new DeleteCommand(deleteParams));
        } else {
          console.error(`Error sending to connection ${connId}:`, error);
        }
      }
    });

    await Promise.all(postCalls);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Message sent successfully',
        messageId: messageId 
      }),
    };
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send message',
        details: error.message 
      }),
    };
  }
};
