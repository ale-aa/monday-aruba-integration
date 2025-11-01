# Development Guide

Complete guide for developers working on the Monday.com - Aruba Mail Integration.

## Quick Start

### 1. Setup

```bash
# Clone or navigate to project
cd monday-aruba-integration

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your values
# - MONDAY_CLIENT_SECRET
# - MONDAY_SIGNING_SECRET
# - ENCRYPTION_KEY (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### 2. Run Server

```bash
# Production mode
npm start

# Development mode (auto-reload)
npm run dev
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run specific test
npm run test:db
npm run test:jwt
npm run test:auth
npm run test:email
```

---

## Project Structure

```
monday-aruba-integration/
├── config/                          # Configuration files
│   ├── database.js                 # SQLite initialization
│   ├── monday.js                   # Monday.com settings
│   └── mail.js                     # Email configuration
├── controllers/                     # Business logic
│   ├── authController.js           # Authorization endpoints
│   └── emailController.js          # Email endpoints
├── middleware/                      # Express middleware
│   ├── authLogger.js               # Logging utilities
│   ├── errorHandler.js             # Error handling
│   ├── rateLimiter.js              # Rate limiting
│   ├── verifyMonday.js             # JWT validation (SIGNING_SECRET)
│   └── verifyClientSecret.js       # JWT validation (CLIENT_SECRET)
├── models/                          # Database models
│   └── UserCredentials.js          # User credentials CRUD + encryption
├── routes/                          # API routes
│   ├── auth.js                     # Authorization routes
│   └── email.js                    # Email routes
├── utils/                           # Utility functions
│   └── validation.js               # Input validation & sanitization
├── docs/                            # Documentation
│   ├── AUTHORIZATION_FLOW.md       # Authorization flow details
│   ├── DATABASE.md                 # Database documentation
│   ├── EMAIL_SERVICE.md            # Email API reference
│   ├── MONDAY_SETUP.md             # Monday.com setup
│   └── SECURITY_FEATURES.md        # Security implementation
├── data/                            # Runtime data (git-ignored)
│   └── monday_aruba.db             # SQLite database
├── .env                             # Environment variables (git-ignored)
├── .env.example                     # Environment template
├── .gitignore                       # Git exclusions
├── DEVELOPMENT.md                   # This file
├── package.json                     # Dependencies & scripts
├── README.md                        # Project overview
├── requests.http                    # HTTP request examples
├── server.js                        # Application entry point
└── test-*.js                        # Test files
```

---

## API Endpoints

### Authorization Flow

**1. Display Credential Form**
```http
GET /monday/authorize?backToUrl=https://example.com
Authorization: Bearer <JWT_TOKEN>
```

**2. Save Credentials**
```http
POST /monday/save-credentials
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/x-www-form-urlencoded

email=user@aruba.it&password=secret&smtp_host=mail.aruba.it&smtp_port=465
```

**3. Get Credentials**
```http
POST /monday/getUserCredentials
Authorization: Bearer <JWT_TOKEN>
```

**4. Delete Credentials**
```http
POST /monday/deleteUserCredentials
Authorization: Bearer <JWT_TOKEN>
```

### Email Service

**1. Send Email**
```http
POST /monday/sendEmail
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "recipient_email": "user@example.com",
  "subject": "Test",
  "body": "Test email",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"]
}
```

**2. Test SMTP**
```http
POST /monday/testSMTP
Authorization: Bearer <JWT_TOKEN>
```

---

## Key Technologies

### Runtime
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **SQLite** - Lightweight database
- **better-sqlite3** - Synchronous SQLite driver

### Authentication
- **JWT (jsonwebtoken)** - Token-based auth
- **HMAC-SHA256** - Token signing
- **Crypto (Node.js built-in)** - Encryption

### Email
- **Nodemailer** - SMTP email client
- **Aruba Mail** - Email provider

### Utilities
- **dotenv** - Environment variables
- **cors** - Cross-origin requests

---

## Development Workflow

### Adding a New Endpoint

1. **Create Route** (`routes/newfeature.js`)
```javascript
const express = require('express');
const router = express.Router();
const Controller = require('../controllers/controller');
const verifyMonday = require('../middleware/verifyMonday');

router.post('/monday/endpoint', verifyMonday, Controller.method);

module.exports = router;
```

2. **Create Controller** (`controllers/controller.js`)
```javascript
class Controller {
  static async method(req, res) {
    try {
      // Business logic here
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = Controller;
```

3. **Register Route** (`server.js`)
```javascript
const newRoutes = require('./routes/newfeature');
app.use('/', newRoutes);
```

4. **Add Tests** (`test-newfeature.js`)
```javascript
// Test your endpoint
```

5. **Update Documentation** (`docs/*.md`)

### Code Style

**Naming Conventions:**
- Variables: `camelCase`
- Functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `kebab-case` or `camelCase`

**Comments:**
```javascript
/**
 * Function description
 * @param {type} param - Parameter description
 * @returns {type} Return description
 */
function myFunction(param) {
  // Implementation
}
```

**Error Handling:**
```javascript
try {
  // Operation
} catch (error) {
  console.error('Context:', error.message);
  return res.status(500).json({
    success: false,
    error: 'Error type',
    message: error.message
  });
}
```

---

## Testing

### Unit Tests

Test individual functions and methods:

```javascript
// test-validation.js
const { isValidEmail } = require('./utils/validation');

console.log('Testing email validation...');
console.assert(isValidEmail('user@example.com'), 'Valid email should pass');
console.assert(!isValidEmail('invalid'), 'Invalid email should fail');
console.log('✓ Email validation tests passed');
```

### Integration Tests

Test API endpoints with real requests:

```bash
# Start server
npm start

# In another terminal, run tests
npm test
```

### Manual Testing

Use `requests.http` with VS Code REST Client:
1. Install REST Client extension
2. Open `requests.http`
3. Click "Send Request" above any request

### Test Data

**JWT Token (test):**
```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: 'test_user', accountId: 'test_acc' },
  process.env.MONDAY_SIGNING_SECRET,
  { expiresIn: '1h' }
);
console.log(token);
```

**Sample Email:**
```json
{
  "recipient_email": "test@example.com",
  "subject": "Test Email",
  "body": "This is a test email"
}
```

---

## Debugging

### Enable Debug Logging

**Email Debug:**
```bash
DEBUG_EMAIL=true npm start
```

Shows detailed nodemailer logs for SMTP operations.

**Token Debug:**
```bash
# In code:
const token = req.headers.authorization?.split(' ')[1];
console.log('Token (sanitized):', token?.substring(0, 10) + '...');
```

### Common Issues

**Issue: "Cannot find module 'express'"**
```bash
Solution: npm install
```

**Issue: "EADDRINUSE: address already in use :3000"**
```bash
Solution:
# Find process on port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

**Issue: "Credenziali non configurate"**
```bash
Solution: User hasn't configured Aruba credentials yet
- Call GET /monday/authorize to show form
- User submits credentials via POST /monday/save-credentials
- Verify with POST /monday/testSMTP
```

**Issue: Rate limit blocking requests**
```bash
Solution: Wait for window to reset or:
# For development, adjust limits in middleware/rateLimiter.js
# Or disable for testing with bypassRateLimiter
```

### Logging

**Good Practices:**
```javascript
// ✅ Include context
console.log(`[EmailController] Sending email to ${recipientEmail} for user ${userId}`);

// ✅ Include timestamp for manual logs
console.log(`[${new Date().toISOString()}] Event occurred`);

// ✅ Use structured data
console.log('User action:', { userId, action: 'email_sent', duration: 1234 });

// ❌ Avoid logging secrets
console.log('Password:', password); // NEVER!

// ❌ Avoid generic messages
console.log('Done'); // Not helpful for debugging
```

---

## Database

### Viewing Data

```bash
# Using sqlite3 CLI
sqlite3 data/monday_aruba.db

# In SQLite CLI:
sqlite> .tables
sqlite> SELECT * FROM user_credentials;
sqlite> .exit
```

### Schema

```sql
CREATE TABLE user_credentials (
  id INTEGER PRIMARY KEY,
  userId TEXT UNIQUE NOT NULL,
  accountId TEXT NOT NULL,
  aruba_email TEXT NOT NULL,
  aruba_password TEXT NOT NULL, -- AES-256-CBC encrypted
  smtp_host TEXT DEFAULT 'mail.aruba.it',
  smtp_port INTEGER DEFAULT 465,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Backup

```bash
# Backup database
cp data/monday_aruba.db data/monday_aruba.db.backup

# Restore
cp data/monday_aruba.db.backup data/monday_aruba.db
```

### Reset (Development Only)

```bash
# Delete database to start fresh
rm -rf data/monday_aruba.db*

# Restart server (will recreate)
npm start
```

---

## Environment Variables

### Required

```env
# Server
PORT=3000
NODE_ENV=production

# Monday.com (from dev.monday.com)
MONDAY_CLIENT_SECRET=your_secret
MONDAY_SIGNING_SECRET=your_secret

# Encryption (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your_32_byte_hex_string
```

### Optional

```env
# CORS configuration
CORS_ORIGIN=https://monday.com

# SMTP defaults (already set)
ARUBA_SMTP_HOST=mail.aruba.it
ARUBA_SMTP_PORT=465

# Debug logging
DEBUG_EMAIL=false
```

---

## Deployment

### Heroku

```bash
# Login
heroku login

# Create app
heroku create your-app-name

# Set secrets
heroku config:set MONDAY_CLIENT_SECRET=secret
heroku config:set MONDAY_SIGNING_SECRET=secret
heroku config:set ENCRYPTION_KEY=key

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Railway.app

```bash
# Login
railway login

# Link project
railway link

# Set variables in dashboard
# Go to project → Variables section

# Deploy
railway up
```

### Docker

```bash
# Build image
docker build -t monday-aruba .

# Run container
docker run -p 3000:3000 \
  -e MONDAY_CLIENT_SECRET=secret \
  -e MONDAY_SIGNING_SECRET=secret \
  -e ENCRYPTION_KEY=key \
  monday-aruba
```

---

## Performance Optimization

### Database Optimization

```javascript
// Use prepared statements (faster for repeated queries)
const stmt = db.prepare('SELECT * FROM user_credentials WHERE userId = ?');
const result = stmt.get(userId); // Reuse stmt multiple times
```

### Caching

```javascript
// Cache frequently accessed data
const cache = new Map();

function getCachedCredentials(userId) {
  if (cache.has(userId)) {
    return cache.get(userId);
  }

  const creds = UserCredentials.findByUserIdWithPassword(userId);
  cache.set(userId, creds);
  return creds;
}
```

### Email Optimization

```javascript
// Queue emails instead of sending synchronously
const emailQueue = [];

async function processEmailQueue() {
  while (emailQueue.length > 0) {
    const email = emailQueue.shift();
    await sendEmail(email);
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }
}
```

---

## Security Best Practices

### Secrets Management

- Never commit `.env` to git
- Use different secrets for each environment
- Rotate secrets regularly
- Use secure vaults in production

### Password Storage

- Always encrypt with AES-256-CBC
- Use random IVs for each password
- Use PBKDF2 key derivation
- Never log passwords

### Input Validation

```javascript
const { isValidEmail, sanitizeString } = require('./utils/validation');

// Always validate
if (!isValidEmail(email)) {
  return res.status(400).json({ error: 'Invalid email' });
}

// Sanitize when needed
const clean = sanitizeString(userInput);
```

### Rate Limiting

```javascript
const { emailLimiter } = require('./middleware/rateLimiter');

// Apply to endpoints
app.post('/monday/sendEmail', emailLimiter, handler);
```

---

## Documentation

### Update When Adding Features

1. **API Endpoints** → `docs/EMAIL_SERVICE.md` or `docs/AUTHORIZATION_FLOW.md`
2. **Database Changes** → `docs/DATABASE.md`
3. **New Endpoints** → `README.md` (API Endpoints section)
4. **New Files** → Update project structure everywhere
5. **Configuration** → `docs/MONDAY_SETUP.md`

### Document Format

```markdown
## New Feature Title

### Overview
Brief description of the feature

### Implementation
How it works internally

### API
Endpoint and usage examples

### Security
Any security considerations

### Testing
How to test the feature
```

---

## Useful Commands

```bash
# Install dependencies
npm install

# Start server
npm start

# Development mode (auto-reload)
npm run dev

# Run all tests
npm test

# Run specific test
npm run test:db

# View database
sqlite3 data/monday_aruba.db

# Check port usage
lsof -i :3000

# Kill process on port
kill -9 <PID>

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT token
node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({userId:'test',accountId:'acc'},process.env.MONDAY_SIGNING_SECRET,{expiresIn:'1h'}))"
```

---

## Resources

### Documentation
- [README.md](./README.md) - Project overview
- [docs/DATABASE.md](./docs/DATABASE.md) - Database details
- [docs/EMAIL_SERVICE.md](./docs/EMAIL_SERVICE.md) - Email API
- [docs/AUTHORIZATION_FLOW.md](./docs/AUTHORIZATION_FLOW.md) - Auth flow
- [docs/MONDAY_SETUP.md](./docs/MONDAY_SETUP.md) - Monday.com setup
- [docs/SECURITY_FEATURES.md](./docs/SECURITY_FEATURES.md) - Security

### External Resources
- [Express.js Docs](https://expressjs.com)
- [Node.js Docs](https://nodejs.org/docs)
- [SQLite Docs](https://www.sqlite.org/docs.html)
- [JWT.io](https://jwt.io)
- [Nodemailer](https://nodemailer.com)
- [Monday.com Developers](https://developer.monday.com)

---

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test: `npm test`
3. Commit with clear message: `git commit -m "feat: add new feature"`
4. Push to remote: `git push origin feature/my-feature`
5. Create pull request with description
6. Address review feedback
7. Merge and delete branch

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** feat, fix, docs, style, refactor, perf, test, chore

**Example:**
```
feat(email): add CC/BCC support to sendEmail endpoint

- Add validation for CC/BCC email arrays
- Support both string and array formats
- Update tests and documentation

Closes #123
```

---

**Last Updated:** 2025-11-01
