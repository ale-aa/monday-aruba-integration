# Security Features and Best Practices

Comprehensive documentation of security features implemented in the Monday.com - Aruba Mail Integration.

## Table of Contents

- [Input Validation & Sanitization](#input-validation--sanitization)
- [Rate Limiting](#rate-limiting)
- [Encryption](#encryption)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Security Checklist](#security-checklist)
- [Common Vulnerabilities](#common-vulnerabilities)
- [Monitoring & Logging](#monitoring--logging)

---

## Input Validation & Sanitization

### Overview

Input validation and sanitization prevent common web vulnerabilities like:
- **SQL Injection** - Malicious SQL in user input
- **XSS (Cross-Site Scripting)** - JavaScript execution in user input
- **Email Injection** - Using email fields for header injection
- **Command Injection** - Executing arbitrary commands
- **Path Traversal** - Accessing unauthorized file paths

### Validation Module

Located in `utils/validation.js`, provides utility functions for:

#### Email Validation

```javascript
const { isValidEmail, isValidEmailArray } = require('./utils/validation');

// Validate single email
if (!isValidEmail(userInput)) {
  return res.status(400).json({ error: 'Invalid email' });
}

// Validate multiple emails (CC/BCC)
if (!isValidEmailArray(ccEmails)) {
  return res.status(400).json({ error: 'Invalid CC addresses' });
}
```

**Checks:**
- Format: `user@domain.com`
- Length: 5-254 characters (per RFC 5321)
- Local part: max 64 characters
- Domain: must contain at least one dot
- TLD: 2-6 characters

#### Subject Validation

```javascript
const { isValidSubject } = require('./utils/validation');

if (!isValidSubject(emailSubject)) {
  return res.status(400).json({ error: 'Invalid subject' });
}
```

**Checks:**
- Non-empty (after trim)
- Max 998 characters (per RFC 5322)

#### Body Validation

```javascript
const { isValidBody } = require('./utils/validation');

if (!isValidBody(emailBody)) {
  return res.status(400).json({ error: 'Invalid body' });
}
```

**Checks:**
- Non-empty string OR valid JSON object
- Can be text or structured data

#### Password Strength

```javascript
const { validatePasswordStrength } = require('./utils/validation');

const result = validatePasswordStrength(password);
if (!result.isValid) {
  return res.status(400).json({
    error: 'Weak password',
    feedback: result.feedback
  });
}
```

**Checks:**
- Minimum 8 characters
- Maximum 128 characters
- Contains lowercase, uppercase, numbers, special chars
- No common patterns (repeated chars, common passwords)

**Score Levels:**
- 0-2: Weak (rejected)
- 3-4: Fair (accepted)
- 5-6: Good (recommended)
- 7+: Strong (excellent)

#### SMTP Host Validation

```javascript
const { isValidSmtpHost } = require('./utils/validation');

if (!isValidSmtpHost(smtpHost)) {
  return res.status(400).json({ error: 'Invalid SMTP host' });
}
```

**Checks:**
- Valid domain name or IPv4 address
- Length: 3-255 characters
- Proper format (alphanumeric, dots, dashes)

#### Port Validation

```javascript
const { isValidPort } = require('./utils/validation');

if (!isValidPort(port)) {
  return res.status(400).json({ error: 'Invalid port' });
}
```

**Checks:**
- Integer between 1-65535

#### URL Validation

```javascript
const { isValidUrl } = require('./utils/validation');

if (!isValidUrl(redirectUrl)) {
  return res.status(400).json({ error: 'Invalid URL' });
}
```

**Checks:**
- HTTP or HTTPS protocol
- Valid URL format

### Sanitization Functions

#### String Sanitization

```javascript
const { sanitizeString } = require('./utils/validation');

const clean = sanitizeString(userInput);
// Removes: angle brackets, javascript: protocol, event handlers
```

#### HTML Escaping

```javascript
const { escapeHtml } = require('./utils/validation');

const safe = escapeHtml(userInput);
// Converts: & < > " ' / to HTML entities
```

#### Logging Sanitization

```javascript
const { sanitizeForLogging } = require('./utils/validation');

const log = sanitizeForLogging(userData);
// Redacts: password, secret, token, key fields
```

### Implementation in Controllers

Email controller validation:

```javascript
// In controllers/emailController.js
static validateEmailParams(params) {
  const { recipient_email, subject, body, cc, bcc } = params;

  // Validate recipient
  if (!isValidEmail(recipient_email)) {
    throw new Error('recipient_email non è valido');
  }

  // Validate subject
  if (!isValidSubject(subject)) {
    throw new Error('subject non è valido');
  }

  // Validate body
  if (!isValidBody(body)) {
    throw new Error('body è obbligatorio');
  }

  // Validate optional CC/BCC
  if (cc && !isValidEmailArray(cc)) {
    throw new Error('Email CC non valida');
  }

  if (bcc && !isValidEmailArray(bcc)) {
    throw new Error('Email BCC non valida');
  }
}
```

Authorization form validation:

```javascript
// In controllers/authController.js
const { isValidEmail, validatePasswordStrength, isValidSmtpHost, isValidPort } = require('../utils/validation');

// Validate email
if (!isValidEmail(email)) {
  return res.status(400).json({ error: 'Email non valida' });
}

// Validate password strength
const pwdCheck = validatePasswordStrength(password);
if (!pwdCheck.isValid) {
  return res.status(400).json({ error: pwdCheck.feedback.join(', ') });
}

// Validate SMTP settings
if (!isValidSmtpHost(smtp_host)) {
  return res.status(400).json({ error: 'SMTP host non valido' });
}

if (!isValidPort(smtp_port)) {
  return res.status(400).json({ error: 'SMTP port non valido' });
}
```

---

## Rate Limiting

### Overview

Rate limiting protects your API from:
- **Brute Force Attacks** - Multiple authentication attempts
- **DDoS Attacks** - Overwhelming the server
- **Resource Exhaustion** - Sending excessive emails
- **API Abuse** - Misuse by malicious users

### Rate Limiter Module

Located in `middleware/rateLimiter.js`

### Configured Limits

#### Email Sending
- **Limit:** 100 emails/hour per user
- **Window:** 1 hour
- **Status Code:** 429 Too Many Requests

```bash
# Example: Try to send 101 emails in 1 hour
curl -X POST http://localhost:3000/monday/sendEmail ... # 1st-100th: OK
curl -X POST http://localhost:3000/monday/sendEmail ... # 101st: 429
```

#### Authorization Attempts
- **Limit:** 10 attempts/15 minutes per user
- **Window:** 15 minutes
- **Status Code:** 429 Too Many Requests

Prevents brute force attacks on credential configuration.

#### General API
- **Limit:** 60 requests/minute per user
- **Window:** 1 minute
- **Status Code:** 429 Too Many Requests

Applied to credential retrieval and other endpoints.

### Response Format

When rate limit is exceeded:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Email limit exceeded. Maximum 100 emails per hour per user.",
  "retryAfter": 3600
}
```

### Response Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1730401200000
```

**Headers:**
- `X-RateLimit-Limit` - Total requests allowed
- `X-RateLimit-Remaining` - Requests remaining in window
- `X-RateLimit-Reset` - Timestamp when limit resets

### Creating Custom Rate Limiters

#### In-Memory Rate Limiter (Development)

```javascript
const { createRateLimiter } = require('./middleware/rateLimiter');

const customLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // 50 requests per 10 minutes
  message: 'Custom rate limit exceeded'
});

// Apply to specific route
app.post('/api/custom', customLimiter, handler);
```

#### Redis Rate Limiter (Production)

For distributed systems with multiple server instances:

```javascript
const redis = require('redis');
const { createRedisRateLimiter } = require('./middleware/rateLimiter');

const redisClient = redis.createClient({
  host: 'localhost',
  port: 6379
});

const redisLimiter = createRedisRateLimiter({
  redisClient,
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Rate limit exceeded'
});

// Apply to route
app.post('/api/endpoint', redisLimiter, handler);
```

### Disabling Rate Limiting

For testing or specific endpoints:

```javascript
const { bypassRateLimiter } = require('./middleware/rateLimiter');

// Skip rate limiting for health checks
app.get('/health', bypassRateLimiter, (req, res) => {
  res.json({ status: 'ok' });
});
```

### Client Identification

Rate limiting uses three methods to identify clients (in order):

1. **Authenticated Users** - If JWT token is valid, uses `userId`
2. **IP Address** - Falls back to IP address
3. **Connection** - Falls back to connection remote address

```javascript
function getClientId(req) {
  if (req.monday && req.monday.userId) {
    return `user_${req.monday.userId}`;
  }
  return req.ip || req.connection.remoteAddress || 'unknown';
}
```

---

## Encryption

### Password Encryption

Passwords are encrypted using **AES-256-CBC** with **PBKDF2** key derivation.

**Algorithm Details:**
- Cipher: AES-256-CBC (256-bit keys, 128-bit blocks)
- Key Derivation: PBKDF2
- Iterations: 100,000
- IV: Random 16-byte value per encryption

### Encryption Process

```javascript
// In models/UserCredentials.js
static encrypt(plaintext) {
  // 1. Derive key from ENCRYPTION_KEY using PBKDF2
  const key = this.deriveKey(process.env.ENCRYPTION_KEY);

  // 2. Generate random IV
  const iv = require('crypto').randomBytes(16);

  // 3. Create cipher
  const cipher = require('crypto').createCipheriv('aes-256-cbc', key, iv);

  // 4. Encrypt plaintext
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // 5. Return IV + encrypted data (IV needed for decryption)
  return `${iv.toString('hex')}:${encrypted}`;
}
```

### Decryption Process

```javascript
static decrypt(ciphertext) {
  // 1. Extract IV from ciphertext
  const [ivHex, encrypted] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');

  // 2. Derive same key
  const key = this.deriveKey(process.env.ENCRYPTION_KEY);

  // 3. Create decipher
  const decipher = require('crypto').createDecipheriv('aes-256-cbc', key, iv);

  // 4. Decrypt
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Key Derivation

```javascript
static deriveKey(masterKey) {
  return require('crypto').pbkdf2Sync(
    masterKey,
    'aruba_mail_salt',
    100000, // iterations
    32, // key length (256 bits)
    'sha256'
  );
}
```

### Security Properties

✅ **Strong Encryption:** AES-256 is NIST-approved
✅ **Random IVs:** Each password has unique IV
✅ **Slow Key Derivation:** 100,000 PBKDF2 iterations prevent brute force
✅ **Never Logged:** Passwords removed from all logs
✅ **Never Returned:** API never sends encrypted or decrypted passwords

---

## Authentication

### JWT Tokens

Two separate JWT secrets for different use cases:

#### SIGNING_SECRET
Used for **operations** (sending emails, reading data):
- Token created by Monday.com
- Validated on protected endpoints
- Shorter lifetime (1 hour)

```javascript
// Token payload
{
  userId: "user_123",
  accountId: "account_456",
  iat: 1730397346,
  exp: 1730400946 // 1 hour from now
}
```

#### CLIENT_SECRET
Used for **authorization flow** (credential setup):
- Token created by Monday.com
- Validated during OAuth flow
- Used for credential form access

### Token Validation

Implemented in `middleware/verifyMonday.js`:

```javascript
const token = req.headers.authorization?.split(' ')[1];

if (!token) {
  return res.status(401).json({ error: 'Token mancante' });
}

try {
  const decoded = jwt.verify(token, process.env.MONDAY_SIGNING_SECRET);
  req.monday = decoded;
  next();
} catch (error) {
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token scaduto' });
  }
  return res.status(401).json({ error: 'Token non valido' });
}
```

### Token Security

✅ **Secrets Stored Securely:** In `.env`, never in code
✅ **Expiration:** Tokens expire (prevents indefinite use)
✅ **Validation:** Every protected endpoint validates token
✅ **Sanitization:** Tokens hidden in logs (first/last 10 chars only)

---

## Error Handling

### Error Response Format

Consistent error responses across all endpoints:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable message",
  "timestamp": "2025-11-01T14:49:06.123Z"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad Request | Invalid email format |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Unhandled exception |
| 503 | Service Unavailable | SMTP server down |

### Error Logging

Implemented in `middleware/errorHandler.js`:

```javascript
app.use((err, req, res, next) => {
  // Log with timestamp and stack trace
  console.error(`[${new Date().toISOString()}] Error:`, err);

  // Send generic error to client
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
});
```

**Security Features:**
- Stack traces NOT sent to clients
- Detailed logs for debugging
- Timestamp for audit trail
- Sanitized sensitive data

---

## Security Checklist

### Before Production Deployment

- [ ] **Secrets Management**
  - [ ] Store `ENCRYPTION_KEY` in secure vault
  - [ ] Store `MONDAY_CLIENT_SECRET` in secure vault
  - [ ] Store `MONDAY_SIGNING_SECRET` in secure vault
  - [ ] Rotate secrets regularly
  - [ ] Use unique secrets per environment

- [ ] **HTTPS/TLS**
  - [ ] Enable HTTPS on production domain
  - [ ] Install valid SSL certificate
  - [ ] Set secure cookie flags
  - [ ] Enforce HTTPS redirect

- [ ] **Database Security**
  - [ ] Regular backups of SQLite database
  - [ ] Encrypt backup files
  - [ ] Restrict database file permissions (600)
  - [ ] Monitor database access

- [ ] **Input Validation**
  - [ ] All user inputs validated
  - [ ] Passwords validated for strength
  - [ ] Email addresses validated
  - [ ] URL sanitization implemented

- [ ] **Rate Limiting**
  - [ ] Email sending rate limit: 100/hour
  - [ ] Authorization attempts: 10/15min
  - [ ] General API: 60/minute
  - [ ] Redis for distributed systems

- [ ] **Logging & Monitoring**
  - [ ] Error tracking (Sentry, Rollbar, etc.)
  - [ ] Performance monitoring
  - [ ] Email delivery tracking
  - [ ] Failed authentication attempts

- [ ] **API Security**
  - [ ] CORS configured for Monday.com only
  - [ ] Content-Type validation
  - [ ] Request size limits
  - [ ] SQL injection prevention

- [ ] **Access Control**
  - [ ] JWT validation on all protected endpoints
  - [ ] User isolation (can't access others' data)
  - [ ] Admin endpoints protected
  - [ ] Webhook verification

---

## Common Vulnerabilities

### 1. SQL Injection
**Risk:** With SQLite, inject malicious SQL

**Prevention:**
- Use parameterized queries
- Always use `?` placeholders

```javascript
// ✅ Safe
db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

// ❌ Unsafe
db.prepare(`SELECT * FROM users WHERE id = ${userId}`).all();
```

### 2. XSS (Cross-Site Scripting)
**Risk:** Inject JavaScript in email body or subject

**Prevention:**
- Validate all inputs
- Escape HTML entities
- Use `escapeHtml()` utility

```javascript
const { escapeHtml } = require('./utils/validation');
const safe = escapeHtml(userInput);
```

### 3. Email Header Injection
**Risk:** Using CC/BCC fields to inject email headers

**Prevention:**
- Validate email format strictly
- Use nodemailer (handles automatically)
- Test with injection payloads

### 4. Password Exposure
**Risk:** Storing passwords in plaintext

**Prevention:**
- Always encrypt with AES-256-CBC
- Use strong key derivation (PBKDF2)
- Never log passwords

### 5. CSRF (Cross-Site Request Forgery)
**Risk:** Unauthorized requests from another site

**Prevention:**
- Use JWT tokens
- Validate token on every POST/PUT/DELETE
- CORS configured properly

### 6. Rate Limit Bypass
**Risk:** Exhausting resources with rapid requests

**Prevention:**
- Implement rate limiting
- Use Redis for distributed systems
- Monitor suspicious patterns

### 7. Weak Authentication
**Risk:** Brute force attacks on credentials

**Prevention:**
- Rate limit authorization (10 attempts/15min)
- Require strong passwords (8+ chars, mixed case, numbers, special)
- Use HTTPS only
- Log failed attempts

### 8. Information Disclosure
**Risk:** Revealing system details in error messages

**Prevention:**
- Generic error messages to users
- Detailed logs for debugging only
- Never expose stack traces to clients
- Sanitize all logged data

---

## Monitoring & Logging

### What to Monitor

#### Authentication Events
```javascript
const { logAuthSuccess, logAuthFailure } = require('./middleware/authLogger');

logAuthSuccess({
  userId: 'user_123',
  method: 'sendEmail',
  source: 'Email Sent'
});

logAuthFailure({
  reason: 'SMTP authentication failed',
  method: 'sendEmail',
  statusCode: 401
});
```

#### API Endpoints
- Request path and method
- User ID (if authenticated)
- Response status code
- Response time
- Error messages

#### Rate Limiting
- Rate limit hits
- Clients exceeding limits
- Patterns indicating attacks

#### Email Service
- Email sent/failed count
- SMTP errors
- Email delivery time
- Recipient addresses (sanitized)

### Logging Best Practices

```javascript
// ✅ Good: Includes timestamp, context, sanitized data
console.log(`[${new Date().toISOString()}] User ${userId} sent email to ${recipientEmail} (${duration}ms)`);

// ❌ Bad: Includes password, no timestamp
console.log(`User logged in with password: ${password}`);
```

### Recommended Services

**Error Tracking:**
- Sentry (https://sentry.io)
- Rollbar (https://rollbar.com)
- BugSnag (https://www.bugsnag.com)

**Performance Monitoring:**
- New Relic (https://newrelic.com)
- Datadog (https://www.datadoghq.com)
- SignalFx (https://signalfx.com)

**Log Aggregation:**
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk (https://www.splunk.com)
- Loggly (https://www.loggly.com)

---

## Testing Security Features

### Test Input Validation

```bash
# Test invalid email
curl -X POST http://localhost:3000/monday/sendEmail \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"recipient_email":"invalid-email","subject":"Test","body":"Test"}'
# Expected: 400 Bad Request

# Test long subject
curl -X POST http://localhost:3000/monday/sendEmail \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"recipient_email":"test@example.com","subject":"'$(printf 'a%.0s' {1..999})'","body":"Test"}'
# Expected: 400 Bad Request
```

### Test Rate Limiting

```bash
# Send multiple emails rapidly
for i in {1..101}; do
  curl -X POST http://localhost:3000/monday/sendEmail \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"recipient_email":"test@example.com","subject":"Test $i","body":"Test"}'
  echo "Request $i"
done
# Expected: First 100 OK, 101st: 429 Too Many Requests
```

### Test Password Encryption

```javascript
// Run in Node.js
const { UserCredentials } = require('./models/UserCredentials');

const encrypted = UserCredentials.encrypt('MyPassword123!');
console.log('Encrypted:', encrypted);

const decrypted = UserCredentials.decrypt(encrypted);
console.log('Decrypted:', decrypted);

// Verify they match
console.assert(decrypted === 'MyPassword123!', 'Encryption/decryption failed');
```

---

**Last Updated:** 2025-11-01
