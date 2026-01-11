# Testing Guide

## Overview

This guide provides comprehensive testing procedures for the Real-Time Chat Application.

## 1. Pre-Deployment Testing

### Validate CloudFormation Template

```bash
cd backend/cloudformation
aws cloudformation validate-template --template-body file://template.yaml
```

### Lint Lambda Code

```bash
# Install ESLint
npm install -g eslint

# Test each Lambda function
cd backend/lambda/connect
npm install
npm test  # if tests are added

cd ../disconnect
npm install
npm test

cd ../sendMessage
npm install
npm test
```

## 2. Post-Deployment Testing

### Test 1: WebSocket Connection

**Using wscat:**

```bash
# Install wscat
npm install -g wscat

# Get your WebSocket URL from deployment output
WEBSOCKET_URL="wss://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/production"

# Connect
wscat -c "${WEBSOCKET_URL}?userId=test-user-1&username=TestUser1"

# Expected output:
# Connected (press CTRL+C to quit)
```

**Success Criteria:**
- Connection established without errors
- No timeout or connection refused errors

### Test 2: Send Message

**In wscat terminal:**

```json
{"action":"sendMessage","message":"Hello, World!","username":"TestUser1"}
```

**Expected Response:**
```json
{
  "type": "message",
  "messageId": "general-1234567890-abc123",
  "username": "TestUser1",
  "message": "Hello, World!",
  "timestamp": 1234567890,
  "roomId": "general"
}
```

**Success Criteria:**
- Message is echoed back
- messageId is generated
- Timestamp is current

### Test 3: Multiple Connections

**Terminal 1:**
```bash
wscat -c "${WEBSOCKET_URL}?userId=user1&username=Alice"
```

**Terminal 2:**
```bash
wscat -c "${WEBSOCKET_URL}?userId=user2&username=Bob"
```

**Send from Terminal 1:**
```json
{"action":"sendMessage","message":"Hi Bob!","username":"Alice"}
```

**Success Criteria:**
- Message appears in both terminals
- Both users receive the same message
- No message loss

### Test 4: Disconnection Handling

**Connect and then disconnect:**
```bash
wscat -c "${WEBSOCKET_URL}?userId=user3&username=Charlie"
# Press CTRL+C to disconnect
```

**Verify in DynamoDB:**
```bash
aws dynamodb scan --table-name ChatConnections-production

# The connection should be removed
```

**Success Criteria:**
- Connection removed from DynamoDB
- No errors in CloudWatch logs

### Test 5: Message Persistence

**Send messages:**
```json
{"action":"sendMessage","message":"Test message 1","username":"TestUser"}
{"action":"sendMessage","message":"Test message 2","username":"TestUser"}
```

**Verify in DynamoDB:**
```bash
aws dynamodb scan --table-name ChatMessages-production --max-items 10
```

**Success Criteria:**
- Messages stored in DynamoDB
- Correct timestamp and messageId
- All fields populated correctly

## 3. Frontend Testing

### Test 1: Load Application

**Open in browser:**
```
http://chatapp-frontend-XXXXXXXXXX.s3-website-us-east-1.amazonaws.com
```

**Success Criteria:**
- Page loads without errors
- Login form appears
- No console errors (F12)

### Test 2: User Login

**Steps:**
1. Enter username: "TestUser"
2. Click "Join Chat"

**Success Criteria:**
- Redirected to chat interface
- Username displayed in header
- Connection status shows "Connected"

### Test 3: Send Message from UI

**Steps:**
1. Type message: "Hello from browser"
2. Click "Send"

**Success Criteria:**
- Message appears in chat
- Message shows correct username
- Timestamp is displayed
- Input field is cleared

### Test 4: Multiple Browser Tabs

**Steps:**
1. Open app in Chrome tab 1 as "User1"
2. Open app in Chrome tab 2 as "User2"
3. Send message from User1
4. Verify message appears in User2's tab

**Success Criteria:**
- Messages sync in real-time
- No delays > 1 second
- Both users see all messages

### Test 5: Network Interruption

**Steps:**
1. Connect to chat
2. Disable WiFi for 5 seconds
3. Re-enable WiFi

**Success Criteria:**
- Status changes to "Disconnected"
- Reconnection attempt occurs
- Status returns to "Connected"
- No data loss

### Test 6: Browser Refresh

**Steps:**
1. Connect and send messages
2. Refresh browser (F5)
3. Re-login

**Success Criteria:**
- Can reconnect successfully
- Previous session cleaned up
- No duplicate connections

## 4. Load Testing

### Test 1: Concurrent Connections

**Using Artillery:**

```bash
# Install Artillery
npm install -g artillery

# Create test file: load-test.yml
cat > load-test.yml << EOF
config:
  target: "wss://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/production"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
scenarios:
  - engine: ws
    flow:
      - send:
          payload: '{"action":"sendMessage","message":"Load test message","username":"LoadTester"}'
EOF

# Run test
artillery run load-test.yml
```

**Success Criteria:**
- All connections successful
- Response time < 1 second
- No throttling errors
- Lambda doesn't timeout

### Test 2: Message Throughput

**Test Configuration:**
- 100 concurrent users
- 10 messages per user per minute
- Duration: 10 minutes

**Expected Performance:**
- Total messages: 10,000
- Success rate: > 99%
- Average latency: < 500ms

## 5. Security Testing

### Test 1: Input Validation

**Test invalid messages:**

```json
// Very long message (> 1000 chars)
{"action":"sendMessage","message":"A".repeat(2000),"username":"Test"}

// XSS attempt
{"action":"sendMessage","message":"<script>alert('xss')</script>","username":"Test"}

// SQL injection attempt
{"action":"sendMessage","message":"'; DROP TABLE messages; --","username":"Test"}
```

**Success Criteria:**
- Long messages rejected or truncated
- Script tags escaped or removed
- No code execution
- Proper error messages

### Test 2: Authentication

**Test without credentials:**
```bash
wscat -c "${WEBSOCKET_URL}"  # No userId/username parameters
```

**Success Criteria:**
- Connection allowed (or denied based on config)
- Proper error handling
- Logged in CloudWatch

### Test 3: Rate Limiting

**Send rapid messages:**
```bash
# Send 100 messages in 1 second
for i in {1..100}; do
  echo '{"action":"sendMessage","message":"Spam '$i'","username":"Spammer"}'
done | wscat -c "${WEBSOCKET_URL}"
```

**Success Criteria:**
- Rate limiting kicks in
- Throttling errors returned
- No system crash

## 6. Error Handling Testing

### Test 1: Invalid Action

```json
{"action":"invalidAction","message":"Test"}
```

**Success Criteria:**
- Error message returned
- Connection remains open
- Logged in CloudWatch

### Test 2: Malformed JSON

```bash
# Send invalid JSON
Invalid JSON{
```

**Success Criteria:**
- Error handled gracefully
- Connection closed or error returned
- No Lambda crash

### Test 3: DynamoDB Unavailable

**Simulate by removing IAM permissions temporarily**

**Success Criteria:**
- Proper error message
- Logged in CloudWatch
- User notified

## 7. Monitoring & Logging Tests

### Test 1: CloudWatch Logs

**Check all Lambda logs:**
```bash
# Connect handler logs
aws logs tail /aws/lambda/ChatConnectHandler-production --follow

# Message handler logs
aws logs tail /aws/lambda/ChatMessageHandler-production --follow

# Disconnect handler logs
aws logs tail /aws/lambda/ChatDisconnectHandler-production --follow
```

**Success Criteria:**
- All events logged
- No ERROR level logs (except expected errors)
- Timestamps accurate

### Test 2: CloudWatch Metrics

**View metrics:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=ChatMessageHandler-production \
  --start-time 2026-01-10T00:00:00Z \
  --end-time 2026-01-10T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

**Success Criteria:**
- Metrics available
- Invocation count matches expected
- No excessive errors

## 8. Integration Testing

### End-to-End Test Script

```bash
#!/bin/bash

echo "Starting E2E test..."

# 1. Connect
echo "Test 1: Connecting..."
wscat -c "${WEBSOCKET_URL}?userId=e2e-test&username=E2ETest" &
WSCAT_PID=$!
sleep 2

# 2. Send message
echo "Test 2: Sending message..."
echo '{"action":"sendMessage","message":"E2E test message","username":"E2ETest"}' | wscat -c "${WEBSOCKET_URL}"

# 3. Verify in DynamoDB
echo "Test 3: Verifying in DynamoDB..."
aws dynamodb scan --table-name ChatMessages-production | grep "E2E test message"

# 4. Disconnect
echo "Test 4: Disconnecting..."
kill $WSCAT_PID

# 5. Verify cleanup
echo "Test 5: Verifying cleanup..."
sleep 2
aws dynamodb scan --table-name ChatConnections-production | grep "e2e-test" && echo "FAIL" || echo "PASS"

echo "E2E test complete!"
```

## 9. Performance Testing

### Metrics to Track

1. **Latency:**
   - Connection time: < 500ms
   - Message delivery: < 100ms
   - Disconnection: < 200ms

2. **Throughput:**
   - Messages per second: 100+
   - Concurrent connections: 1000+

3. **Resource Usage:**
   - Lambda memory: < 256MB
   - Lambda duration: < 3000ms
   - DynamoDB read/write units: As configured

## 10. Acceptance Testing Checklist

- [ ] Users can connect successfully
- [ ] Messages are delivered in real-time
- [ ] Multiple users can chat simultaneously
- [ ] Disconnections are handled properly
- [ ] Messages are persisted in DynamoDB
- [ ] UI is responsive and user-friendly
- [ ] No console errors in browser
- [ ] All CloudWatch logs are present
- [ ] Security measures are in place
- [ ] Performance meets requirements
- [ ] Error handling works correctly
- [ ] Documentation is complete

## Test Results Template

```markdown
# Test Results - [Date]

## Environment
- Region: us-east-1
- Stack: ChatAppStack
- Tester: [Name]

## Test Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Skipped: W

## Failed Tests
1. Test Name: [Name]
   - Expected: [Expected result]
   - Actual: [Actual result]
   - Logs: [CloudWatch log link]
   - Fix: [Action needed]

## Performance Metrics
- Average latency: Xms
- Throughput: X msg/sec
- Concurrent users: X

## Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Status: Open/Fixed

## Recommendations
- [Recommendation 1]
- [Recommendation 2]
```

## Troubleshooting Common Issues

### Issue: Connection Timeout

**Diagnosis:**
```bash
aws logs tail /aws/lambda/ChatConnectHandler-production --follow
```

**Common Causes:**
- Lambda timeout
- DynamoDB connection issue
- IAM permission problem

### Issue: Messages Not Delivered

**Diagnosis:**
```bash
aws logs tail /aws/lambda/ChatMessageHandler-production --follow
```

**Common Causes:**
- Stale connections
- API Gateway issue
- Lambda error

### Issue: High Latency

**Diagnosis:**
- Check CloudWatch metrics
- Check DynamoDB provisioned capacity
- Check Lambda memory configuration

## Continuous Testing

### Automated Testing Schedule

- **Hourly:** Health check ping
- **Daily:** Full E2E test suite
- **Weekly:** Load testing
- **Monthly:** Security audit

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Chat Application

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Deploy to test environment
        run: ./backend/scripts/deploy.sh
      - name: Run E2E tests
        run: ./tests/e2e-test.sh
```

---

**Remember:** Testing is an ongoing process. Continue testing after each deployment and update!
