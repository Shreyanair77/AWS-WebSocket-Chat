/**
 * Lambda function to handle WebSocket disconnection events
 * Triggered when a client disconnects from the WebSocket API
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'ChatConnections';

exports.handler = async (event) => {
  console.log('Disconnect event:', JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;

  try {
    // Get connection info before deleting (for logging)
    const getParams = {
      TableName: CONNECTIONS_TABLE,
      Key: {
        connectionId: connectionId,
      },
    };

    const connectionData = await docClient.send(new GetCommand(getParams));

    // Delete connection from DynamoDB
    const deleteParams = {
      TableName: CONNECTIONS_TABLE,
      Key: {
        connectionId: connectionId,
      },
    };

    await docClient.send(new DeleteCommand(deleteParams));

    console.log(`Connection ${connectionId} removed successfully`);
    
    if (connectionData.Item) {
      console.log(`User ${connectionData.Item.userId} disconnected`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Disconnected successfully' 
      }),
    };
  } catch (error) {
    console.error('Error removing connection:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Failed to disconnect',
        error: error.message 
      }),
    };
  }
};
