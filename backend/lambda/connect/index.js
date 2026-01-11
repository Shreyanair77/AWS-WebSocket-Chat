/**
 * Lambda function to handle WebSocket connection events
 * Triggered when a client connects to the WebSocket API
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'ChatConnections';

exports.handler = async (event) => {
  console.log('Connect event:', JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;
  const timestamp = Date.now();

  // Extract user information from query parameters or authorizer context
  const queryParams = event.queryStringParameters || {};
  const userId = queryParams.userId || 'anonymous';
  const username = queryParams.username || 'Anonymous User';

  try {
    // Store connection in DynamoDB
    const params = {
      TableName: CONNECTIONS_TABLE,
      Item: {
        connectionId: connectionId,
        userId: userId,
        username: username,
        connectedAt: timestamp,
        ttl: Math.floor(Date.now() / 1000) + 86400, // 24 hours TTL
      },
    };

    await docClient.send(new PutCommand(params));

    console.log(`Connection ${connectionId} stored successfully for user ${userId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Connected successfully',
        connectionId: connectionId 
      }),
    };
  } catch (error) {
    console.error('Error storing connection:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Failed to connect',
        error: error.message 
      }),
    };
  }
};
