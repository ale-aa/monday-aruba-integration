# Monday.com - Aruba Mail Integration

A complete Node.js/Express.js integration between Monday.com and Aruba Mail for secure credential management and automated email sending via SMTP.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)

---

## Overview

This project provides a secure bridge between Monday.com and Aruba Mail, allowing users to:

1. **Authorize** their Aruba Mail credentials through a secure flow
2. **Store** encrypted credentials in a SQLite database
3. **Send emails** via Aruba SMTP with full validation
4. **Test SMTP** configuration to verify connectivity

Built with:
- **Express.js** - Web framework
- **SQLite + better-sqlite3** - Secure credential storage
- **AES-256-CBC** - Password encryption
- **JWT** - Token-based authentication
- **Nodemailer** - SMTP email sending

---

## Features

✅ **Secure Credential Management**
- AES-256-CBC encryption with PBKDF2 key derivation
- Random IV for each password
- Encrypted storage in SQLite database

✅ **JWT Authentication**
- Separate validation for authorization (CLIENT_SECRET) and operations (SIGNING_SECRET)
- Token expiration support
- Secure token logging (sanitized in logs)

✅ **Email Service**
- Send emails via Aruba SMTP with validation
- Support for CC and BCC recipients
- Email subject and body validation
- SMTP configuration testing

✅ **Authorization Flow**
- HTML form-based credential configuration
- Automatic encryption before storage
- Credential update and deletion endpoints

✅ **Error Handling**
- Comprehensive error messages
- HTTP status codes (400, 401, 403, 500, 503)
- Detailed logging with sanitization

✅ **Testing**
- Complete test suites for all components
- 27 tests covering database, JWT, auth, and email

---

## Prerequisites

- **Node.js** v14+ ([download](https://nodejs.org))
- **npm** v6+ (included with Node.js)
- **Aruba Mail account** with SMTP credentials
- **Monday.com developer account** (for CLIENT_SECRET and SIGNING_SECRET)

---

## Quick Start

### 1. Clone/Setup Project

```bash
# Navigate to project directory
cd monday-aruba-integration

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` with your values:

```env
# Server
PORT=3000
NODE_ENV=development

# Monday.com Secrets (from dev.monday.com)
MONDAY_CLIENT_SECRET=your_monday_client_secret
MONDAY_SIGNING_SECRET=your_monday_signing_secret

# Encryption Key (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your_32_byte_hex_string

# Aruba SMTP (default values)
ARUBA_SMTP_HOST=mail.aruba.it
ARUBA_SMTP_PORT=465

# Optional: Debug email logs
DEBUG_EMAIL=false
```

### 3. Run Server

```bash
# Production mode
npm start

# Development mode (auto-reload)
npm run dev
```

Server runs on `http://localhost:3000`

### 4. Verify Installation

```bash
# Check health
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":...,"environment":"development"}
```

---

## Project Structure

```
monday-aruba-integration/
├── config/
│   ├── database.js          # SQLite initialization
│   ├── monday.js            # Monday.com config
│   └── mail.js              # Aruba Mail config
├── controllers/
│   ├── authController.js    # Authorization logic
│   └── emailController.js   # Email sending logic
├── middleware/
│   ├── verifyMonday.js      # JWT validation (SIGNING_SECRET)
│   ├── verifyClientSecret.js# JWT validation (CLIENT_SECRET)
│   ├── authLogger.js        # Secure logging utilities
│   └── errorHandler.js      # Global error handling
├── models/
│   └── UserCredentials.js   # Database model with encryption
├── routes/
│   ├── auth.js              # Authorization endpoints
│   └── email.js             # Email endpoints
├── docs/
│   ├── DATABASE.md          # Database documentation
│   ├── AUTHORIZATION_FLOW.md# Authorization flow details
│   ├── EMAIL_SERVICE.md     # Email API documentation
│   └── MONDAY_SETUP.md      # Monday.com configuration
├── data/
│   └── monday_aruba.db      # SQLite database (auto-created)
├── .env                     # Environment variables (not in git)
├── .env.example             # Environment template
├── .gitignore               # Git exclusions
├── package.json             # Dependencies
├── server.js                # Application entry point
└── README.md                # This file
```

### Key Files

| File | Purpose |
|------|---------|
| `server.js` | Express app configuration and route registration |
| `config/database.js` | SQLite initialization with encrypted credentials table |
| `models/UserCredentials.js` | CRUD operations with AES-256-CBC encryption |
| `middleware/verifyMonday.js` | JWT validation using SIGNING_SECRET |
| `controllers/authController.js` | Credential configuration and management |
| `controllers/emailController.js` | Email sending and SMTP validation |

---

## Configuration

### Environment Variables

```env
# Server
PORT                    # Server port (default: 3000)
NODE_ENV               # Environment: development, production

# Monday.com
MONDAY_CLIENT_SECRET   # For authorization flows
MONDAY_SIGNING_SECRET  # For authenticated operations

# Encryption
ENCRYPTION_KEY         # 32-byte hex string for AES-256-CBC

# Aruba SMTP (defaults provided)
ARUBA_SMTP_HOST        # Default: mail.aruba.it
ARUBA_SMTP_PORT        # Default: 465

# Debug
DEBUG_EMAIL            # Enable detailed email logs (true/false)
CORS_ORIGIN            # CORS allowed origins (default: *)
```

### Generate ENCRYPTION_KEY

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add to `.env`:
```env
ENCRYPTION_KEY=a1b2c3d4e5f6...
```

### Generate Monday.com Secrets

1. Go to [dev.monday.com](https://dev.monday.com)
2. Create a new app
3. Copy `CLIENT_SECRET` and `SIGNING_SECRET`
4. Add to `.env`

---

## API Endpoints

### Public Endpoints

#### Health Check
```http
GET /health
```

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2025-11-01T14:49:06.123Z",
  "uptime": 1234.567,
  "environment": "development"
}
```

#### Root Info
```http
GET /
```

**Response (200):**
```json
{
  "name": "Monday.com - Aruba Mail Integration",
  "version": "1.0.0",
  "status": "running"
}
```

---

### Authorization Endpoints

#### 1. Get Authorization Form
```http
GET /monday/authorize
Authorization: Bearer <JWT_TOKEN>
```

**Description:** Returns HTML form for credential configuration

**Query Parameters:**
- `backToUrl` (optional) - URL to redirect after save

**Response (200):** HTML form with fields for:
- Email
- Password
- SMTP Host (pre-filled: mail.aruba.it)
- SMTP Port (pre-filled: 465)

**Example:**
```bash
curl "http://localhost:3000/monday/authorize?backToUrl=https://myapp.com/success" \
  -H "Authorization: Bearer eyJhbGc..."
```

#### 2. Save Credentials
```http
POST /monday/save-credentials
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <JWT_TOKEN>
```

**Form Parameters:**
```
email=user@aruba.it
password=secretpassword
smtp_host=mail.aruba.it
smtp_port=465
backToUrl=https://myapp.com/success
```

**Response (302):** Redirects to `backToUrl` with status in query param
- Success: `?status=success`
- Error: `?status=error&message=...`

**Example:**
```bash
curl -X POST http://localhost:3000/monday/save-credentials \
  -H "Authorization: Bearer eyJhbGc..." \
  -d "email=user@aruba.it&password=secret&smtp_host=mail.aruba.it&smtp_port=465"
```

#### 3. Get User Credentials
```http
POST /monday/getUserCredentials
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Response (200):**
```json
{
  "success": true,
  "credentials": {
    "userId": "user_123",
    "aruba_email": "user@aruba.it",
    "smtp_host": "mail.aruba.it",
    "smtp_port": 465,
    "created_at": "2025-11-01T14:49:06.123Z",
    "updated_at": "2025-11-01T14:49:06.123Z"
  }
}
```

**Note:** Password is never returned

**Example:**
```bash
curl -X POST http://localhost:3000/monday/getUserCredentials \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

#### 4. Delete Credentials
```http
POST /monday/deleteUserCredentials
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Response (200):**
```json
{
  "success": true,
  "message": "Credenziali eliminate con successo"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/monday/deleteUserCredentials \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

---

### Email Endpoints

#### 1. Send Email
```http
POST /monday/sendEmail
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipient_email": "user@example.com",
  "subject": "Test Email",
  "body": "Email content",
  "cc": ["cc1@example.com", "cc2@example.com"],
  "bcc": "bcc@example.com"
}
```

**Parameters:**
- `recipient_email` (required) - Email address
- `subject` (required) - Max 998 characters
- `body` (required) - Text or JSON object
- `cc` (optional) - String or array
- `bcc` (optional) - String or array

**Response (200):**
```json
{
  "success": true,
  "message": "Email inviata con successo",
  "messageId": "<123456@aruba.it>",
  "timestamp": "2025-11-01T14:49:06.123Z",
  "duration_ms": 1234,
  "details": {
    "from": "sender@aruba.it",
    "to": "recipient@example.com",
    "subject": "Test Email"
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Missing/invalid token or credentials
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - SMTP server unreachable

**Example:**
```bash
curl -X POST http://localhost:3000/monday/sendEmail \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_email": "user@example.com",
    "subject": "Hello",
    "body": "This is a test email",
    "cc": ["cc@example.com"]
  }'
```

#### 2. Test SMTP Configuration
```http
POST /monday/testSMTP
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:** Empty

**Response (200):**
```json
{
  "success": true,
  "message": "Configurazione SMTP valida",
  "details": {
    "host": "mail.aruba.it",
    "port": 465,
    "email": "user@aruba.it"
  }
}
```

**Errors:**
- `401 Unauthorized` - Credentials not configured
- `500 Internal Server Error` - Invalid configuration

**Example:**
```bash
curl -X POST http://localhost:3000/monday/testSMTP \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

---

## Testing

### Run Test Suites

```bash
# Database tests (CRUD + encryption)
node test-database.js

# JWT validation tests
node test-jwt-validation.js

# Authorization endpoint tests
node test-auth-endpoints.js

# Email endpoint tests
node test-email-endpoints.js
```

All tests use mock data and don't require external services.

### Manual Testing with cURL

See **API Endpoints** section above for examples.

### Test with HTTP File

Create `requests.http` file in VS Code REST Client extension:

```http
### Health Check
GET http://localhost:3000/health

### Root
GET http://localhost:3000/

### Authorize Form (replace with real token)
GET http://localhost:3000/monday/authorize?backToUrl=http://localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0X3VzZXIiLCJhY2NvdW50SWQiOiJ0ZXN0X2FjYyJ9.V9-4DhjUCFoVr6JJq7TbWL-Nq88CPE-VqKMZYqfCvfg

### Send Email (replace token and email)
POST http://localhost:3000/monday/sendEmail
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0X3VzZXIiLCJhY2NvdW50SWQiOiJ0ZXN0X2FjYyJ9.V9-4DhjUCFoVr6JJq7TbWL-Nq88CPE-VqKMZYqfCvfg
Content-Type: application/json

{
  "recipient_email": "user@example.com",
  "subject": "Test Email",
  "body": "This is a test email from Monday-Aruba Integration"
}

### Test SMTP (replace token)
POST http://localhost:3000/monday/testSMTP
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0X3VzZXIiLCJhY2NvdW50SWQiOiJ0ZXN0X2FjYyJ9.V9-4DhjUCFoVr6JJq7TbWL-Nq88CPE-VqKMZYqfCvfg
Content-Type: application/json
```

---

## Deployment

### Heroku

1. **Create Heroku app**
```bash
heroku create your-app-name
```

2. **Set environment variables**
```bash
heroku config:set MONDAY_CLIENT_SECRET=your_secret
heroku config:set MONDAY_SIGNING_SECRET=your_secret
heroku config:set ENCRYPTION_KEY=your_key
```

3. **Deploy**
```bash
git push heroku main
```

### Railway.app

1. **Login to Railway**
```bash
railway login
```

2. **Link project**
```bash
railway link
```

3. **Set variables in Railway dashboard**
   - Go to Variables section
   - Add all `.env` variables

4. **Deploy**
```bash
railway up
```

### Docker

1. **Create Dockerfile**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

2. **Build and run**
```bash
docker build -t monday-aruba .
docker run -p 3000:3000 \
  -e MONDAY_CLIENT_SECRET=your_secret \
  -e MONDAY_SIGNING_SECRET=your_secret \
  -e ENCRYPTION_KEY=your_key \
  monday-aruba
```

---

## Security

### Best Practices Implemented

✅ **Encryption**
- Passwords encrypted with AES-256-CBC
- PBKDF2 key derivation (100,000 iterations)
- Random IV for each password
- Never stored in plaintext

✅ **Authentication**
- JWT tokens with expiration
- Separate secrets for authorization vs operations
- Token validation on every protected endpoint

✅ **Logging**
- Token sanitized (first/last 10 chars only)
- Passwords never logged
- Sensitive data removed from logs

✅ **Input Validation**
- Email regex validation
- Subject length limits (max 998 chars)
- Required field checks
- Array/string handling for CC/BCC

✅ **Error Handling**
- Generic error messages to users
- Detailed logs for debugging
- HTTP status codes map to error types
- No stack traces in API responses

### Recommendations

⚠️ **Before Production:**

1. **Add Rate Limiting**
   - Prevent email sending abuse
   - Limit: 100 emails/hour per user

2. **Add Input Sanitization**
   - Prevent injection attacks
   - Sanitize email addresses
   - Escape HTML in email body

3. **HTTPS Only**
   - Require TLS in production
   - Use secure cookies

4. **Database Backups**
   - Regular SQLite backups
   - Encrypted backup storage

5. **Monitoring**
   - Error tracking (Sentry)
   - Performance monitoring
   - Email delivery logs

6. **API Keys**
   - Rotate secrets regularly
   - Use strong random values
   - Store in secure vaults

---

## Troubleshooting

### Server Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill existing process
kill -9 <PID>

# Restart
npm start
```

### "Credenziali non configurate" Error

**Solution:**
1. Call `GET /monday/authorize` to show form
2. Submit credentials via `POST /monday/save-credentials`
3. Verify with `POST /monday/testSMTP`

### "Autenticazione SMTP fallita" Error

**Check:**
1. Email address is correct
2. Password is correct
3. SMTP host is correct (`mail.aruba.it`)
4. SMTP port is correct (`465`)

**Solution:**
```bash
# Delete and reconfigure credentials
curl -X POST http://localhost:3000/monday/deleteUserCredentials \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"

# Then set up again via /monday/authorize
```

### "Server SMTP non raggiungibile" Error

**Check:**
1. Internet connection is working
2. Aruba SMTP server is online
3. Port 465 is not blocked by firewall
4. Antivirus not blocking connection

**Test connection:**
```bash
# On Mac/Linux
telnet mail.aruba.it 465

# Should show: "220 ..."
```

### Emails Not Received

**Check:**
1. Look in recipient's SPAM folder
2. Verify recipient email is correct
3. Check server logs: `DEBUG_EMAIL=true npm start`
4. Test with `POST /monday/testSMTP`

### Database Locked Error

**Solution:**
```bash
# Remove old database files
rm -rf data/monday_aruba.db*

# Restart server (will recreate database)
npm start
```

---

## Documentation

Complete documentation for each component:

| Document | Content |
|----------|---------|
| [DATABASE.md](./docs/DATABASE.md) | Database schema, encryption, CRUD operations |
| [AUTHORIZATION_FLOW.md](./docs/AUTHORIZATION_FLOW.md) | Complete authorization flow with examples |
| [EMAIL_SERVICE.md](./docs/EMAIL_SERVICE.md) | Email API reference with error codes |
| [MONDAY_SETUP.md](./docs/MONDAY_SETUP.md) | Monday.com configuration guide |

---

## Scripts

In `package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "test": "node test-database.js && node test-jwt-validation.js && node test-auth-endpoints.js && node test-email-endpoints.js"
  }
}
```

### Run Tests
```bash
npm test
```

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review component documentation in `docs/`
3. Check server logs: `DEBUG_EMAIL=true npm start`
4. Verify `.env` configuration
5. Test endpoints with provided examples

---

## License

ISC

---

## Version History

- **v1.0.0** (2025-11-01)
  - Initial release
  - Database encryption with AES-256-CBC
  - JWT authentication (SIGNING_SECRET + CLIENT_SECRET)
  - Authorization flow for credential management
  - Email service with Aruba SMTP
  - Comprehensive test suites
  - Complete documentation

---

## Contributing

To extend this project:

1. Create feature branches
2. Add tests for new features
3. Update documentation
4. Submit pull requests

---

**Last Updated:** 2025-11-01
