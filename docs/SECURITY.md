# Security Documentation

## Security Overview

This document outlines the security measures implemented in the Real-Time Chat Application and best practices for deployment.

## Security Layers

### 1. Network Security

#### HTTPS/WSS Encryption
- **Implementation**: All communications use TLS 1.2 or higher
- **Frontend**: Served over HTTPS via S3 + CloudFront
- **WebSocket**: WSS (WebSocket Secure) connections only
- **Configuration**: Enforced at API Gateway level

#### API Gateway Protection
```yaml
Security Features:
  - Request throttling (10,000 requests/second default)
  - Request validation
  - Resource policies
  - AWS WAF integration (optional)
```

### 2. Authentication & Authorization

#### Amazon Cognito Integration

**User Pool Configuration:**
```javascript
Password Policy:
  - Minimum length: 8 characters
  - Requires: Uppercase, lowercase, numbers
  - Optional: Special characters
  - Password history: Last 24 passwords
  - Expiration: Configurable

MFA Options:
  - SMS-based MFA
  - TOTP-based MFA
  - Optional: required or enabled
```

**User Attributes:**
- Email (verified)
- Username
- Custom attributes as needed

#### JWT Token Validation

**Token Structure:**
```javascript
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "email_verified": true,
  "iss": "https://cognito-idp.region.amazonaws.com/poolId",
  "exp": timestamp,
  "iat": timestamp
}
```

**Validation Steps:**
1. Verify token signature
2. Check token expiration
3. Validate issuer
4. Verify audience
5. Check custom claims

### 3. IAM Security

#### Lambda Execution Role

**Least Privilege Principle:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:region:account:table/ChatConnections",
        "arn:aws:dynamodb:region:account:table/ChatMessages"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "execute-api:ManageConnections",
      "Resource": "arn:aws:execute-api:region:account:api-id/*"
    }
  ]
}
```

#### Service Permissions

**API Gateway to Lambda:**
- Resource-based policy on Lambda
- Specific API Gateway source ARN
- No wildcard permissions

**Lambda to DynamoDB:**
- Table-specific permissions
- No admin actions allowed
- Read/write only on required tables

### 4. Data Security

#### DynamoDB Encryption

**Encryption at Rest:**
```javascript
Encryption Type: AWS managed CMK
Key Management: AWS KMS
Algorithm: AES-256
Scope: All data, indexes, and backups
```

**Encryption in Transit:**
- TLS 1.2+ for all DynamoDB API calls
- HTTPS endpoints only

#### S3 Security

**Bucket Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bucket-name/*",
      "Condition": {
        "StringLike": {
          "aws:Referer": ["https://yourdomain.com/*"]
        }
      }
    }
  ]
}
```

**S3 Block Public Access:**
- Enabled for uploads bucket
- Disabled for static website bucket (read-only)

### 5. Input Validation & Sanitization

#### Client-Side Validation
```javascript
Message Validation:
  - Max length: 1000 characters
  - No script tags
  - XSS prevention
  - HTML entity encoding

Username Validation:
  - Max length: 50 characters
  - Alphanumeric + spaces only
  - No special characters
```

#### Server-Side Validation
```javascript
Lambda Message Handler:
  - Verify message content exists
  - Check message length
  - Validate username format
  - Sanitize input before storage
  - Rate limiting per connection
```

### 6. API Security

#### Rate Limiting

**API Gateway Throttling:**
```yaml
Default Limits:
  - 10,000 requests per second
  - 5,000 concurrent connections
  
Route-Specific:
  - $connect: 100/second
  - sendMessage: 1000/second
  - $disconnect: 100/second
```

**Custom Rate Limiting:**
```javascript
// In Lambda function
const RATE_LIMIT = 10; // messages per minute
const TIME_WINDOW = 60000; // 1 minute

async function checkRateLimit(userId) {
  // Check recent message count
  // Return true/false based on limit
}
```

#### Request Validation

**Message Schema:**
```json
{
  "action": {
    "type": "string",
    "enum": ["sendMessage"],
    "required": true
  },
  "message": {
    "type": "string",
    "maxLength": 1000,
    "required": true
  },
  "username": {
    "type": "string",
    "maxLength": 50,
    "required": true
  }
}
```

### 7. Logging & Monitoring

#### CloudWatch Logs

**Log Retention:**
```yaml
Lambda Functions: 30 days
API Gateway: 14 days
DynamoDB: Continuous export to S3
```

**Logged Information:**
- Connection events (connect/disconnect)
- Message sending attempts
- Authentication events
- Errors and exceptions
- Throttling events

**PII Protection:**
```javascript
// Do NOT log:
- Full message content (log hash instead)
- Email addresses
- IP addresses (mask last octet)
- JWT tokens
```

#### Security Monitoring

**CloudWatch Alarms:**
```yaml
Critical Alarms:
  - High error rate (>5% in 5 minutes)
  - Failed authentication attempts (>10 in 1 minute)
  - Unusual connection patterns
  - DynamoDB throttling
  - Lambda timeout rate

Alert Destinations:
  - SNS topic for security team
  - Email notifications
  - Optional: PagerDuty integration
```

### 8. Vulnerability Protection

#### XSS (Cross-Site Scripting)
```javascript
Prevention Measures:
  - React automatic escaping
  - DOMPurify for message sanitization
  - Content Security Policy headers
  - No dangerouslySetInnerHTML usage
```

#### CSRF (Cross-Site Request Forgery)
```javascript
Prevention Measures:
  - WebSocket connections don't use cookies
  - JWT token in Authorization header
  - Origin validation
  - Custom headers
```

#### SQL Injection
```javascript
Prevention Measures:
  - DynamoDB (NoSQL) - no SQL injection risk
  - Parameterized queries only
  - Input validation
```

#### Message Injection
```javascript
Prevention Measures:
  - Message content validation
  - Action field whitelisting
  - JSON schema validation
  - Character encoding
```

### 9. Compliance & Best Practices

#### OWASP Top 10 Coverage

1. **Injection**: ✅ Input validation, parameterized queries
2. **Broken Authentication**: ✅ Cognito, JWT, MFA
3. **Sensitive Data Exposure**: ✅ Encryption at rest and in transit
4. **XML External Entities**: ✅ JSON only, no XML
5. **Broken Access Control**: ✅ IAM roles, resource policies
6. **Security Misconfiguration**: ✅ CloudFormation IaC
7. **XSS**: ✅ React escaping, CSP headers
8. **Insecure Deserialization**: ✅ JSON.parse with validation
9. **Components with Vulnerabilities**: ✅ Regular npm audit
10. **Insufficient Logging**: ✅ Comprehensive CloudWatch logging

#### AWS Well-Architected Framework

**Security Pillar Compliance:**
- ✅ Identity and Access Management
- ✅ Detective Controls
- ✅ Infrastructure Protection
- ✅ Data Protection
- ✅ Incident Response

### 10. Incident Response

#### Security Event Response Plan

**Detection:**
1. CloudWatch alarm triggered
2. Security team notified
3. Automatic log collection

**Analysis:**
1. Review CloudWatch logs
2. Check access patterns
3. Identify affected resources

**Containment:**
1. Disable compromised IAM credentials
2. Update security groups
3. Enable API Gateway throttling

**Eradication:**
1. Remove malicious data
2. Patch vulnerabilities
3. Update Lambda code

**Recovery:**
1. Restore from backups if needed
2. Verify system integrity
3. Monitor for recurrence

**Post-Incident:**
1. Document incident
2. Update security policies
3. Implement preventive measures

## Security Checklist

### Pre-Deployment
- [ ] Enable MFA for AWS accounts
- [ ] Configure CloudWatch alarms
- [ ] Enable CloudTrail logging
- [ ] Set up KMS encryption keys
- [ ] Review IAM policies
- [ ] Enable GuardDuty (optional)
- [ ] Configure AWS Config rules

### Deployment
- [ ] Use HTTPS/WSS only
- [ ] Enable DynamoDB encryption
- [ ] Configure Cognito properly
- [ ] Set appropriate TTLs
- [ ] Enable PITR for DynamoDB
- [ ] Configure S3 bucket policies
- [ ] Set up CloudWatch dashboards

### Post-Deployment
- [ ] Regular security audits
- [ ] Monitor CloudWatch logs
- [ ] Update dependencies (npm audit)
- [ ] Review access logs
- [ ] Test disaster recovery
- [ ] Conduct penetration testing
- [ ] Review and rotate credentials

### Ongoing Maintenance
- [ ] Monthly security reviews
- [ ] Quarterly penetration tests
- [ ] Regular dependency updates
- [ ] Security training for team
- [ ] Incident response drills
- [ ] Compliance audits

## Security Contacts

**Report Security Issues:**
- Email: security@yourcompany.com
- Bug Bounty: https://bugcrowd.com/yourcompany
- Emergency: +1-XXX-XXX-XXXX

## Additional Resources

- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
- [OWASP WebSocket Security](https://owasp.org/www-community/vulnerabilities/WebSocket_security)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [CIS AWS Foundations Benchmark](https://www.cisecurity.org/benchmark/amazon_web_services)
