#!/bin/bash

# Script to set up DynamoDB tables for the Chat Application
# This is an alternative to using CloudFormation

set -e

# Configuration
REGION="us-east-1"
ENVIRONMENT="production"
CONNECTIONS_TABLE="ChatConnections-${ENVIRONMENT}"
MESSAGES_TABLE="ChatMessages-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}DynamoDB Tables Setup Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Create Connections Table
echo -e "${YELLOW}Creating ${CONNECTIONS_TABLE} table...${NC}"
aws dynamodb create-table \
    --table-name ${CONNECTIONS_TABLE} \
    --attribute-definitions \
        AttributeName=connectionId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
    --key-schema \
        AttributeName=connectionId,KeyType=HASH \
    --global-secondary-indexes \
        "[{
            \"IndexName\": \"UserIdIndex\",
            \"KeySchema\": [{\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"}],
            \"Projection\":{\"ProjectionType\":\"ALL\"},
            \"ProvisionedThroughput\": {\"ReadCapacityUnits\": 5, \"WriteCapacityUnits\": 5}
        }]" \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region ${REGION} \
    2>/dev/null && echo -e "${GREEN}✓ Table created${NC}" || echo -e "${YELLOW}Table already exists${NC}"

# Wait for table to be active
echo -e "${YELLOW}Waiting for ${CONNECTIONS_TABLE} to be active...${NC}"
aws dynamodb wait table-exists --table-name ${CONNECTIONS_TABLE} --region ${REGION}
echo -e "${GREEN}✓ Table is active${NC}"

# Enable TTL for Connections Table
echo -e "${YELLOW}Enabling TTL for ${CONNECTIONS_TABLE}...${NC}"
aws dynamodb update-time-to-live \
    --table-name ${CONNECTIONS_TABLE} \
    --time-to-live-specification "Enabled=true, AttributeName=ttl" \
    --region ${REGION} \
    2>/dev/null && echo -e "${GREEN}✓ TTL enabled${NC}" || echo -e "${YELLOW}TTL already configured${NC}"

# Create Messages Table
echo -e "${YELLOW}Creating ${MESSAGES_TABLE} table...${NC}"
aws dynamodb create-table \
    --table-name ${MESSAGES_TABLE} \
    --attribute-definitions \
        AttributeName=messageId,AttributeType=S \
        AttributeName=timestamp,AttributeType=N \
        AttributeName=roomId,AttributeType=S \
    --key-schema \
        AttributeName=messageId,KeyType=HASH \
    --global-secondary-indexes \
        "[{
            \"IndexName\": \"RoomIdTimestampIndex\",
            \"KeySchema\": [
                {\"AttributeName\":\"roomId\",\"KeyType\":\"HASH\"},
                {\"AttributeName\":\"timestamp\",\"KeyType\":\"RANGE\"}
            ],
            \"Projection\":{\"ProjectionType\":\"ALL\"},
            \"ProvisionedThroughput\": {\"ReadCapacityUnits\": 5, \"WriteCapacityUnits\": 5}
        }]" \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region ${REGION} \
    2>/dev/null && echo -e "${GREEN}✓ Table created${NC}" || echo -e "${YELLOW}Table already exists${NC}"

# Wait for table to be active
echo -e "${YELLOW}Waiting for ${MESSAGES_TABLE} to be active...${NC}"
aws dynamodb wait table-exists --table-name ${MESSAGES_TABLE} --region ${REGION}
echo -e "${GREEN}✓ Table is active${NC}"

# Enable TTL for Messages Table
echo -e "${YELLOW}Enabling TTL for ${MESSAGES_TABLE}...${NC}"
aws dynamodb update-time-to-live \
    --table-name ${MESSAGES_TABLE} \
    --time-to-live-specification "Enabled=true, AttributeName=ttl" \
    --region ${REGION} \
    2>/dev/null && echo -e "${GREEN}✓ TTL enabled${NC}" || echo -e "${YELLOW}TTL already configured${NC}"

# Enable Point-in-Time Recovery
echo -e "${YELLOW}Enabling Point-in-Time Recovery for ${CONNECTIONS_TABLE}...${NC}"
aws dynamodb update-continuous-backups \
    --table-name ${CONNECTIONS_TABLE} \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
    --region ${REGION} \
    2>/dev/null && echo -e "${GREEN}✓ PITR enabled${NC}" || echo -e "${YELLOW}PITR already enabled${NC}"

echo -e "${YELLOW}Enabling Point-in-Time Recovery for ${MESSAGES_TABLE}...${NC}"
aws dynamodb update-continuous-backups \
    --table-name ${MESSAGES_TABLE} \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
    --region ${REGION} \
    2>/dev/null && echo -e "${GREEN}✓ PITR enabled${NC}" || echo -e "${YELLOW}PITR already enabled${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}DynamoDB Setup Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Tables Created:${NC}"
echo "  - ${CONNECTIONS_TABLE}"
echo "  - ${MESSAGES_TABLE}"
echo ""
echo -e "${YELLOW}To view tables:${NC}"
echo "aws dynamodb list-tables --region ${REGION}"
echo ""
echo -e "${YELLOW}To describe a table:${NC}"
echo "aws dynamodb describe-table --table-name ${CONNECTIONS_TABLE} --region ${REGION}"
echo ""
