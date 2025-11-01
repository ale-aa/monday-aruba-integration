# Monday.com Integration Setup Guide

Complete step-by-step guide to configure your Monday.com application and integrate with the Aruba Mail service.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Monday.com App Creation](#mondaycom-app-creation)
- [OAuth Configuration](#oauth-configuration)
- [Webhook Setup](#webhook-setup)
- [Integration Testing](#integration-testing)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting:
1. Monday.com account (create at [monday.com](https://monday.com))
2. Developer access to Monday.com apps (available for all users)
3. Local running instance of the Aruba Mail integration
4. A text editor for configuration files

---

## Monday.com App Creation

### Step 1: Access Developer Center

1. Go to [Monday.com](https://monday.com) and log in
2. Click on your profile picture (top-right corner)
3. Select **Admin Center**
4. In left sidebar, click **Apps & Integrations** → **Developer**
5. Click **Create App** button

### Step 2: Create New App

**Basic Information:**
- **App Name:** `Aruba Mail Integration`
- **App Description:** `Integrates Monday.com with Aruba Mail for sending automated emails`
- **App Category:** `Productivity`

**Logo (Optional):**
- Upload a logo for your app
- Recommended size: 256x256px

Click **Create App**

---

## OAuth Configuration

### Step 3: Configure OAuth Endpoints

In your app settings, navigate to **OAuth & Permissions**.

#### 3a. Authorization URL

1. Click **Set Authorization URL**
2. Enter your authorization endpoint:

```
https://your-domain.com/monday/authorize
```

For local development:
```
https://localhost:3000/monday/authorize
```

**Note:** If using `https://localhost`, your browser may show a security warning. Click "Advanced" → "Proceed anyway"

#### 3b. Redirect URI

1. Click **Add Redirect URI**
2. Enter the credential save endpoint:

```
https://your-domain.com/monday/save-credentials
```

For local development:
```
https://localhost:3000/monday/save-credentials
```

#### 3c. Scopes

Monday.com OAuth requires you to specify the scopes (permissions) your app needs.

**Required Scopes:**
- `me:read` - Read user information

**Optional Scopes (if your app needs them):**
- `boards:read` - Read board information
- `items:read` - Read item information
- `webhooks:write` - Create webhooks

Select at least `me:read` to proceed.

---

## Step 4: Generate Secrets

After saving OAuth settings, Monday.com will generate two important secrets:

### CLIENT_SECRET
Used for the authorization flow and credential saving endpoint.

```
MONDAY_CLIENT_SECRET=your_client_secret_here
```

### SIGNING_SECRET
Used to validate tokens for authenticated operations (sending emails, etc.).

```
MONDAY_SIGNING_SECRET=your_signing_secret_here
```

**⚠️ IMPORTANT:** Save these values immediately - you won't be able to see them again!

### Step 5: Update Environment Variables

Copy your secrets to the `.env` file:

```bash
# From .env.example, update:
MONDAY_CLIENT_SECRET=abc123xyz456...
MONDAY_SIGNING_SECRET=def789uvw012...
```

---

## Webhook Setup (Optional)

If your Monday.com workflow needs to trigger emails:

### Step 6: Configure Webhooks

1. In Developer Center, go to **Webhooks**
2. Click **Create Webhook**

**Webhook Configuration:**
- **Event:** Select the event that triggers email (e.g., "Item created", "Column updated")
- **Webhook URL:** `https://your-domain.com/monday/webhook`

For local development, you'll need to use a tunneling service:
- [ngrok](https://ngrok.com) - Recommended
- [localtunnel](https://localtunnel.github.io)
- [tunnelmole](https://www.tunnelmole.com)

**Using ngrok example:**
```bash
ngrok http 3000
# Output: https://abc123.ngrok.io

# Use this URL for webhooks:
# https://abc123.ngrok.io/monday/webhook
```

---

## Integration Testing

### Step 7: Test Authorization Flow

1. Start your server:
```bash
npm start
```

2. Test the authorization endpoint:
```bash
curl "http://localhost:3000/monday/authorize?backToUrl=http://localhost:3000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

The response should be an HTML form.

### Step 8: Test Credentials Saving

1. Fill out the form from Step 7 with your Aruba credentials
2. Submit the form
3. Verify response from `/monday/save-credentials`

Expected response:
```
Redirect to: http://localhost:3000?status=success
```

### Step 9: Test SMTP Configuration

1. Run the SMTP test:
```bash
curl -X POST http://localhost:3000/monday/testSMTP \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Expected response (200):
```json
{
  "success": true,
  "message": "Configurazione SMTP valida",
  "details": {
    "host": "mail.aruba.it",
    "port": 465,
    "email": "your@email.com"
  }
}
```

### Step 10: Test Email Sending

1. Send a test email:
```bash
curl -X POST http://localhost:3000/monday/sendEmail \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_email": "test@example.com",
    "subject": "Test Email",
    "body": "Email from Monday.com - Aruba Integration"
  }'
```

Expected response (200):
```json
{
  "success": true,
  "message": "Email inviata con successo",
  "messageId": "<...>",
  "timestamp": "2025-11-01T...",
  "duration_ms": 1234,
  "details": {
    "from": "your@email.com",
    "to": "test@example.com",
    "subject": "Test Email"
  }
}
```

---

## Production Deployment

### Step 11: Deploy to Cloud

Choose a cloud provider:

#### Option A: Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set MONDAY_CLIENT_SECRET=your_secret
heroku config:set MONDAY_SIGNING_SECRET=your_secret
heroku config:set ENCRYPTION_KEY=your_key

# Deploy
git push heroku main
```

Update Monday.com settings with Heroku URLs:
- Authorization: `https://your-app-name.herokuapp.com/monday/authorize`
- Redirect: `https://your-app-name.herokuapp.com/monday/save-credentials`

#### Option B: Railway.app

```bash
# Login to Railway
railway login

# Link project
railway link

# Set variables in Railway dashboard
# Go to your project → Variables

# Deploy
railway up
```

Update Monday.com settings with Railway URLs:
- Authorization: `https://your-project.up.railway.app/monday/authorize`
- Redirect: `https://your-project.up.railway.app/monday/save-credentials`

#### Option C: AWS Lambda / API Gateway

1. Create API Gateway endpoint
2. Deploy Node.js code to Lambda
3. Use CloudFormation/SAM for infrastructure
4. Update Monday.com URLs to API Gateway endpoints

---

## API Endpoints Reference

### Authorization Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/monday/authorize` | GET | Display credential configuration form |
| `/monday/save-credentials` | POST | Save Aruba credentials |
| `/monday/getUserCredentials` | POST | Retrieve saved credentials (no password) |
| `/monday/deleteUserCredentials` | POST | Delete saved credentials |

### Email Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/monday/sendEmail` | POST | Send email via Aruba SMTP |
| `/monday/testSMTP` | POST | Test SMTP configuration |

### Webhook Endpoint (if implemented)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/monday/webhook` | POST | Receive Monday.com events |

---

## Configuration Summary

### Required Environment Variables

```env
# Server
PORT=3000
NODE_ENV=production

# Monday.com (from Developer Center)
MONDAY_CLIENT_SECRET=your_client_secret
MONDAY_SIGNING_SECRET=your_signing_secret

# Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your_32_byte_hex_string

# Aruba SMTP (defaults work for most users)
ARUBA_SMTP_HOST=mail.aruba.it
ARUBA_SMTP_PORT=465

# Optional
DEBUG_EMAIL=false
CORS_ORIGIN=https://monday.com
```

### Deployment Checklist

- [ ] Create Monday.com app in Developer Center
- [ ] Copy CLIENT_SECRET and SIGNING_SECRET
- [ ] Update `.env` with secrets
- [ ] Generate ENCRYPTION_KEY
- [ ] Test authorization flow locally
- [ ] Test email sending locally
- [ ] Deploy to cloud provider (Heroku/Railway)
- [ ] Update Monday.com URLs to production domain
- [ ] Test complete flow in production
- [ ] Set up monitoring/logging (Sentry, LogRocket, etc.)
- [ ] Enable HTTPS only
- [ ] Configure rate limiting

---

## Troubleshooting

### "Invalid Client Secret" Error

**Problem:** Monday.com rejects your CLIENT_SECRET

**Solution:**
1. Verify you copied the secret correctly (no extra spaces)
2. Check that your `.env` file is loaded
3. Restart the server after changing `.env`
4. Regenerate secrets in Monday.com Developer Center

### "Authorization URL Not Accessible"

**Problem:** Monday.com can't reach your authorization endpoint

**Solution:**
1. Verify your server is running
2. Check URL format (must include protocol: https://)
3. For localhost, you must use HTTPS or accept security warning
4. Use ngrok to tunnel localhost to HTTPS

### "Redirect URI Mismatch"

**Problem:** After authorization, getting "redirect_uri_mismatch" error

**Solution:**
1. Verify redirect URI matches exactly in Monday.com settings
2. Check for trailing slashes (example.com vs example.com/)
3. Use HTTPS in production (even if developed with HTTP)

### "CORS Error" When Testing

**Problem:** Browser shows CORS error when accessing from Monday.com

**Solution:**
1. Update `CORS_ORIGIN` in `.env`:
   ```env
   CORS_ORIGIN=https://monday.com
   ```
2. Or allow all origins (development only):
   ```env
   CORS_ORIGIN=*
   ```

### "Email Not Received"

**Problem:** Email appears to send but recipient doesn't receive it

**Solution:**
1. Check recipient's SPAM folder
2. Run `POST /monday/testSMTP` to verify credentials
3. Check server logs: `DEBUG_EMAIL=true npm start`
4. Verify Aruba email is correct
5. Verify Aruba password is correct (copy from Aruba webmail, not saved version)

---

## Next Steps

1. **Review Documentation:**
   - [README.md](../README.md) - Project overview
   - [EMAIL_SERVICE.md](./EMAIL_SERVICE.md) - Email API reference
   - [AUTHORIZATION_FLOW.md](./AUTHORIZATION_FLOW.md) - Auth flow details

2. **Run Tests:**
   ```bash
   npm test
   ```

3. **Deploy:**
   - Choose cloud provider (Heroku/Railway/AWS)
   - Follow deployment steps above
   - Update Monday.com settings

4. **Monitor:**
   - Set up error tracking (Sentry)
   - Monitor email delivery logs
   - Alert on failures

---

## Support Resources

- **Monday.com Developer Docs:** https://developer.monday.com
- **Monday.com Community Forum:** https://community.monday.com
- **Aruba Mail Support:** https://www.aruba.it/chi-siamo/contatti.aspx
- **Express.js Documentation:** https://expressjs.com

---

**Last Updated:** 2025-11-01
