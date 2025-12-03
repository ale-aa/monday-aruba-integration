# MONDAY.COM MARKETPLACE SECURITY COMPLIANCE REPORT

**Generated:** December 3, 2025
**Application:** Monday.com - Aruba Mail Integration
**Version:** 1.0.0
**Deployment ID:** 11904692
**Status:** ⚠️ **NOT READY FOR PRODUCTION**

---

## EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| **Total Requirements** | 18 |
| **✅ Fully Compliant** | 4 |
| **⚠️ Partially Compliant** | 8 |
| **❌ Non-Compliant** | 6 |
| **Compliance Score** | **33%** |
| **Critical Issues** | **5** (Blocking Approval) |
| **High Priority** | **6** (Urgent Fix) |
| **Medium Priority** | **4** |
| **Low Priority** | **3** |

### Key Findings:
- **CRITICAL:** Credentials and secrets exposed in `.env` file
- **CRITICAL:** Aruba passwords stored in plaintext in database
- **CRITICAL:** CORS misconfigured (allows all origins)
- **CRITICAL:** Rate limiting not suitable for production (serverless)
- **CRITICAL:** No HTTPS enforcement
- Multiple PII data protection gaps
- Minimal audit logging implementation

---

## DETAILED FINDINGS

### 1. ❌ BURP SCAN COMPLIANCE

**Status:** ❌ **Non-Compliant**

**Findings:**
- No Burp scan evidence provided
- Multiple security headers missing
- CORS misconfigured to accept all origins
- No HSTS header configured
- No X-Content-Type-Options header
- No X-Frame-Options header
- No CSP (Content Security Policy) header

**Issues Found:**
1. **Missing Security Headers** - Server returns no security headers
2. **CORS Configuration** - `origin: '*'` allows cross-origin requests from any domain
3. **No HTTPS Redirect** - HTTP requests not forced to HTTPS
4. **SQL Injection Risk** - Although using Prisma ORM (safe), no validation on raw inputs
5. **Sensitive Data in Logs** - Email payloads stored in JSON without sanitization

**Code Evidence:**

*server.js - Missing Headers:*
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',  // ❌ ISSUE: Allows all origins
  credentials: true
}));
// ❌ Missing security headers middleware
```

**Recommendations:**
1. Add `helmet.js` for security headers:
   ```javascript
   const helmet = require('helmet');
   app.use(helmet());
   ```

2. Configure CORS to specific origin:
   ```javascript
   app.use(cors({
     origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://monday.com'],
     credentials: true,
     optionsSuccessStatus: 200
   }));
   ```

3. Add HTTP-to-HTTPS redirect:
   ```javascript
   app.use((req, res, next) => {
     if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
       res.redirect(`https://${req.header('host')}${req.url}`);
     } else {
       next();
     }
   });
   ```

4. Run Burp Suite scan and address findings

**Priority:** 🔴 **CRITICAL**

---

### 2. ❌ STORAGE DEI SEGRETI

**Status:** ❌ **Non-Compliant** (CRITICAL - BLOCKING)

**Findings:**

#### **Problem 1: Secrets in .env File**

File: `/Users/aleca/monday-aruba-integration/.env`

**Exposed Secrets:**
```
MONDAY_CLIENT_SECRET=f08e362a69cdd625245c35e3d1a122a2
MONDAY_SIGNING_SECRET=d722023b89262b8dc22227f3dcfa448a
DATABASE_URL=postgresql://postgres.bxsoabasubnraixpkunw:Santini97!@...
DIRECT_URL=postgresql://postgres:Santini97!@...
NEXT_PUBLIC_SUPABASE_URL=https://bxsoabasubnraixpkunw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ENCRYPTION_KEY=9d302675229d6e015e3cf85981c116e21402409bd6bed5fa8a8cf93d42704651
ARUBA_MAIL_PASSWORD=your_aruba_mail_password
JWT_SECRET=58ec2faed65ec64bd1bb364e9d461129b10d45c850c515c72edcd864ece04391
```

**Secrets Summary:**
| Secret | Type | Status | Risk |
|--------|------|--------|------|
| MONDAY_CLIENT_SECRET | API Key | ✅ In .gitignore | 🔴 If leaked: can auth as app |
| MONDAY_SIGNING_SECRET | API Key | ✅ In .gitignore | 🔴 Can forge JWTs |
| DATABASE_URL | Password | ✅ In .gitignore | 🔴 Full database access |
| Supabase Keys | API Keys | ✅ In .gitignore | 🔴 Database + auth access |
| ENCRYPTION_KEY | Encryption | ✅ In .gitignore | 🔴 Can decrypt all passwords |
| ARUBA_MAIL_PASSWORD | Password | ✅ In .gitignore | 🔴 Email account takeover |
| JWT_SECRET | Signing Key | ✅ In .gitignore | 🔴 Can forge JWTs |

#### **Problem 2: .env File Committed to Git**

If the `.env` file was ever committed (check git history):
```bash
# Check if .env is in git history
git log --all --full-history -- .env
git log --all --full-history -- "*.env"
```

**Analysis:** The `.env` file is properly excluded in `.gitignore` (line 8-10):
```
.env
.env.local
.env.*.local
```

✅ **Good:** .env is not tracked by git currently
⚠️ **Risk:** If it was committed before, secrets are leaked in git history

#### **Problem 3: Sensitive Credentials in Code**

**Aruba Mail Config** (config/mail.js):
```javascript
{
  auth: {
    user: process.env.ARUBA_MAIL_USER,      // ✅ Using env var
    pass: process.env.ARUBA_MAIL_PASSWORD   // ✅ Using env var
  }
}
```

✅ **Good:** Credentials use environment variables, not hardcoded

**Issues Found:**
1. ❌ `.env` file exists and is readable (even if .gitignored)
2. ❌ No secret rotation mechanism implemented
3. ❌ No access control to .env file (anyone with file access can read)
4. ❌ Database passwords visible in plain text in .env
5. ❌ Encryption key stored in .env (defeats encryption purpose)

**Recommendations:**

1. **Immediately Rotate All Secrets:**
   ```bash
   # 1. Change Monday.com app secrets in Monday dashboard
   # 2. Change Supabase database password
   # 3. Change Supabase API keys
   # 4. Regenerate JWT_SECRET and ENCRYPTION_KEY
   # 5. Reset Aruba Mail password or create app-specific password
   ```

2. **Use Vercel/Platform Secrets Management:**
   ```bash
   # Store secrets in Vercel Environment Variables (web UI)
   # Not in .env file!
   vercel env pull  # Download from Vercel
   vercel env add MONDAY_CLIENT_SECRET
   ```

3. **Use AWS Secrets Manager or HashiCorp Vault for production:**
   ```javascript
   // Instead of process.env
   const aws = require('aws-sdk');
   const secretsManager = new aws.SecretsManager();
   const secret = await secretsManager.getSecretValue({
     SecretId: 'monday-aruba/secrets'
   }).promise();
   ```

4. **Never commit .env (enforce with pre-commit hook):**
   ```bash
   # Install husky
   npm install husky --save-dev
   npx husky install

   # Add pre-commit hook
   npx husky add .husky/pre-commit 'npm run pre-commit'
   ```

   **Add to package.json:**
   ```json
   {
     "scripts": {
       "pre-commit": "git diff --cached --name-only | grep -E '\\.env' && echo 'ERROR: .env files cannot be committed' && exit 1 || exit 0"
     }
   }
   ```

5. **Implement Secret Rotation:**
   - Rotate secrets quarterly
   - Monitor secret access
   - Alert on unusual access patterns

6. **Check Git History:**
   ```bash
   # If .env was ever committed, secrets are leaked
   git log --all --full-history -- ".env"

   # If leaked, revoke all secrets immediately
   # Then purge from git history:
   git filter-branch --tree-filter 'rm -f .env' -- --all
   # Or use BFG Repo-Cleaner
   ```

**Priority:** 🔴 **CRITICAL (BLOCKING)**

---

### 3. ❌ CRITTOGRAFIA DEI TOKEN

**Status:** ⚠️ **Partially Compliant**

**Findings:**

#### **JWT Token Encryption**

**Current Implementation:**

File: `middleware/verifyMonday.js` (lines 45-52)
```javascript
let decoded;
try {
  decoded = jwt.verify(token, signingSecret);  // ✅ Signature verified
} catch (error) {
  return res.status(401).json({ error: 'Token non valido' });
}
```

**Token Structure:**
```javascript
{
  userId: "12345",
  accountId: "67890",
  shortLivedToken: "eyJ0eXAiOiJKV1QiLCJhbGc...",
  backToUrl: "https://monday.com/...",
  iat: 1700000000,
  exp: 1700003600
}
```

#### **Strengths:**
✅ JWT signature verified with MONDAY_SIGNING_SECRET
✅ Token expiration checked (exp claim)
✅ Two separate secrets (SIGNING_SECRET for webhooks, CLIENT_SECRET for OAuth)
✅ Token stored in Authorization header (not in cookies by default)
✅ ShortLivedToken validation implemented

#### **Issues Found:**

1. ❌ **Aruba Passwords Not Encrypted**

   File: `models/IntegrationCredentials.js` (lines 80-84)
   ```javascript
   // ENCRYPTION DISABLED FOR DEBUGGING
   if (false) {  // ❌ Encryption disabled!
     // Encrypt password with AES-256-CBC
     return encryptPassword(plainPassword);
   }
   return plainPassword;  // ❌ STORING PLAIN TEXT!
   ```

   **Database Evidence:**
   ```sql
   -- In Supabase PostgreSQL
   SELECT userId, arubaEmail, arubaPassword FROM integration_credentials;
   -- Result: Passwords visible in plaintext!
   ```

2. ❌ **ShortLivedToken Not Stored Securely**
   - Token received in JWT but not stored
   - Decoded and used for GraphQL calls
   - If request logs are exposed, token visible

3. ❌ **No Token Refresh Mechanism**
   - Tokens expire but no refresh token provided
   - User must re-authenticate after token expiry
   - No mechanism to extend sessions

4. ⚠️ **Token Payload Visible in JWT**
   - JWT is only signed, not encrypted
   - Anyone can decode JWT and see payload
   - Contains userId, accountId (not sensitive but visible)
   - ShortLivedToken visible in transit

5. ⚠️ **No Token Revocation List**
   - Revoked tokens remain valid until expiry
   - No way to blacklist compromised tokens
   - No token invalidation on logout

**Code Evidence:**

*Encryption Implementation (Currently Disabled):*
```javascript
function encryptPassword(password) {
  const crypto = require('crypto');
  const algorithm = 'aes-256-cbc';

  // ❌ Issue 1: Hardcoded salt
  const salt = Buffer.from('aruba_mail_salt', 'utf-8');

  // ⚠️ Issue 2: PBKDF2 with 100k iterations is slow
  const key = crypto.pbkdf2Sync(
    process.env.ENCRYPTION_KEY,
    salt,
    100000,
    32,
    'sha256'
  );

  // ✅ Good: Random IV for each encryption
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Return IV + encrypted password
  return iv.toString('hex') + ':' + encrypted;
}
```

**Issues with Encryption:**
1. Hardcoded salt (should be random)
2. PBKDF2 100k iterations is slow for decryption (should use bcrypt/Argon2)
3. Key derivation from ENCRYPTION_KEY means if key is compromised, all passwords are compromised
4. IV is included in result (good), but salt is static (bad)

**Recommendations:**

1. **Enable Password Encryption Immediately:**

   File: `models/IntegrationCredentials.js`
   ```javascript
   // BEFORE (lines 80-84):
   if (false) {  // ❌ DISABLED
     return encryptPassword(plainPassword);
   }
   return plainPassword;

   // AFTER:
   if (true) {  // ✅ ENABLED
     return encryptPassword(plainPassword);
   }
   // Or simply:
   return encryptPassword(plainPassword);
   ```

2. **Improve Encryption Implementation:**
   ```javascript
   const crypto = require('crypto');

   function encryptPassword(password) {
     const algorithm = 'aes-256-gcm';  // ✅ Use GCM for authentication

     // ✅ Generate random salt for each password
     const salt = crypto.randomBytes(32);

     // ✅ Use scrypt for key derivation (better than PBKDF2)
     const key = crypto.scryptSync(
       process.env.ENCRYPTION_KEY,
       salt,
       32,
       { N: 16384, r: 8, p: 1 }  // Standard parameters
     );

     // ✅ Random IV
     const iv = crypto.randomBytes(16);

     const cipher = crypto.createCipheriv(algorithm, key, iv);
     let encrypted = cipher.update(password, 'utf8', 'hex');
     encrypted += cipher.final('hex');
     const authTag = cipher.getAuthTag();

     // Return: salt:iv:authTag:encrypted
     return salt.toString('hex') + ':' +
            iv.toString('hex') + ':' +
            authTag.toString('hex') + ':' +
            encrypted;
   }

   function decryptPassword(encryptedData) {
     const [saltHex, ivHex, authTagHex, encrypted] = encryptedData.split(':');

     const salt = Buffer.from(saltHex, 'hex');
     const iv = Buffer.from(ivHex, 'hex');
     const authTag = Buffer.from(authTagHex, 'hex');

     const key = crypto.scryptSync(
       process.env.ENCRYPTION_KEY,
       salt,
       32,
       { N: 16384, r: 8, p: 1 }
     );

     const decipher = crypto.createDecipheriv(algorithm, key, iv);
     decipher.setAuthTag(authTag);

     let decrypted = decipher.update(encrypted, 'hex', 'utf8');
     decrypted += decipher.final('utf8');

     return decrypted;
   }
   ```

3. **Implement Token Refresh Mechanism:**
   ```javascript
   // Add refresh_token endpoint
   router.post('/credentials/refresh', verifyMonday, async (req, res) => {
     const userId = req.monday.userId;

     // Issue new short-lived token
     const newToken = jwt.sign(
       { userId, accountId: req.monday.accountId },
       process.env.MONDAY_SIGNING_SECRET,
       { expiresIn: '1h' }
     );

     return res.json({ token: newToken });
   });
   ```

4. **Implement Token Blacklist (for revocation):**
   ```javascript
   const blacklistedTokens = new Set();

   // Add to blacklist on logout
   router.post('/logout', verifyMonday, (req, res) => {
     const token = req.headers.authorization.split(' ')[1];
     blacklistedTokens.add(token);
     res.json({ success: true });
   });

   // Check blacklist in middleware
   app.use((req, res, next) => {
     const token = req.headers.authorization?.split(' ')[1];
     if (token && blacklistedTokens.has(token)) {
       return res.status(401).json({ error: 'Token revoked' });
     }
     next();
   });
   ```

5. **Use TLS in Transit:**
   - Ensure all tokens sent over HTTPS
   - Configure HSTS header

6. **Monitor Token Usage:**
   - Log token usage
   - Alert on unusual patterns
   - Detect token reuse

**Priority:** 🔴 **CRITICAL**

---

### 4. ❌ STORAGE DATI UTENTE

**Status:** ❌ **Non-Compliant**

**Findings:**

#### **PII Data Stored in Database**

File: `prisma/schema.prisma`

```prisma
model IntegrationCredentials {
  id            Int       @id @default(autoincrement())
  userId        String    @unique                         // PII: Monday user ID
  accountId     String                                    // PII: Monday account ID
  arubaEmail    String    @db.VarChar(255)               // PII: Email address
  arubaPassword String    @db.Text                       // PII: Password (PLAINTEXT!)
  smtpHost      String    @default("smtps.aruba.it")    // Not PII
  smtpPort      Int       @default(465)                  // Not PII
  createdAt     DateTime  @default(now())                // Not PII
  updatedAt     DateTime  @updatedAt                     // Not PII
}
```

#### **PII Data Classification**

| Data Field | Type | Classification | Encryption | Status |
|-----------|------|-----------------|------------|--------|
| `userId` | String | PII - Identifier | ❌ No | Stored in plaintext |
| `accountId` | String | PII - Identifier | ❌ No | Stored in plaintext |
| `arubaEmail` | String | PII - Email | ❌ No | Stored in plaintext |
| `arubaPassword` | String | **HIGHLY SENSITIVE** | ❌ No | **PLAINTEXT** |
| `smtpHost` | String | Not PII | N/A | Safe |
| `smtpPort` | Integer | Not PII | N/A | Safe |
| `createdAt` | DateTime | Not PII | N/A | Safe |
| `updatedAt` | DateTime | Not PII | N/A | Safe |

#### **Issues Found:**

1. ❌ **Aruba Passwords Stored in Plaintext**

   **Evidence from code:**
   ```javascript
   // models/IntegrationCredentials.js (lines 80-84)
   if (false) {  // ❌ ENCRYPTION DISABLED
     return encryptPassword(plainPassword);
   }
   return plainPassword;  // ❌ DIRECT PLAINTEXT STORAGE
   ```

   **Database Exposure:**
   - Anyone with database access can read passwords
   - Passwords visible in database logs
   - Database backups contain plaintext passwords
   - Passwords visible in query results

2. ❌ **Emails Stored Without Encryption**

   ```sql
   -- Anyone querying database can see:
   SELECT arubaEmail FROM integration_credentials;
   -- Result: user@example.com, another@example.com, ...
   ```

3. ❌ **userId and accountId Not Hashed**

   ```sql
   -- Can enumerate all Monday users:
   SELECT DISTINCT userId FROM integration_credentials;
   ```

4. ❌ **No Data Retention Policy**

   - Credentials stored indefinitely
   - No deletion on app uninstall
   - No expiration mechanism
   - Violates Monday.com requirement #11 (10-day deletion)

5. ❌ **No Privacy Policy**

   - No documentation of PII storage
   - No consent mechanism
   - No data processing agreement
   - Violates GDPR/CCPA requirements

6. ⚠️ **No Access Control**

   - All application code can access all users' credentials
   - No row-level security (RLS) in Supabase
   - No audit logging of credential access

**Code Evidence:**

*Email Payload Logging* (lines 23-48 of emailController.js):
```javascript
const fs = require('fs');
const logPath = './logs/email-payloads.json';

// Stores full email payloads including recipient email
// No encryption or sanitization
if (!fs.existsSync('./logs')) fs.mkdirSync('./logs');

const payloads = JSON.parse(fs.readFileSync(logPath, 'utf8') || '[]');
payloads.push({
  timestamp: new Date().toISOString(),
  userId: userId,  // ✅ Can track this
  recipientEmail: recipientEmail,  // ❌ PII logged
  body: body,  // ❌ PII may be in email body
  subject: subject  // ⚠️ May contain PII
});

// Accessible via: GET /debug/email-payloads
```

This endpoint exposes PII in logs!

**Recommendations:**

1. **Enable Password Encryption:**
   ```javascript
   // models/IntegrationCredentials.js
   // Change from: if (false) {
   // Change to:
   if (true) {
     return encryptPassword(plainPassword);
   }
   ```

2. **Hash Email Addresses (Optional, for privacy):**
   ```javascript
   const crypto = require('crypto');

   function hashEmail(email) {
     // For privacy, optionally hash email
     // But you need to know original for login
     return crypto
       .createHash('sha256')
       .update(email + process.env.EMAIL_SALT)
       .digest('hex');
   }

   // Update schema:
   model IntegrationCredentials {
     arubaEmail string @db.VarChar(255)
     arubaEmailHash string @unique  // Hash for lookups
   }
   ```

3. **Add Row-Level Security in Supabase:**
   ```sql
   -- Enable RLS on integration_credentials table
   ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

   -- Only users can access their own credentials
   CREATE POLICY "Users access own credentials" ON integration_credentials
     FOR SELECT USING (auth.uid() = userId::uuid);
   ```

4. **Implement Data Deletion:**
   ```javascript
   // DELETE endpoint
   router.post('/monday/deleteUserCredentials', verifyMonday, async (req, res) => {
     const userId = req.monday.userId;

     try {
       // Soft delete first (audit trail)
       await IntegrationCredentials.delete(userId);

       // Log deletion
       await IntegrationCredentials.logAudit(
         userId,
         'CREDENTIALS_DELETED',
         'SUCCESS',
         'User deleted credentials'
       );

       return res.json({ success: true });
     } catch (error) {
       return res.status(500).json({ error: error.message });
     }
   });
   ```

5. **Create Privacy Policy:**
   ```markdown
   # Privacy Policy

   ## Data We Collect
   - Email address (Aruba account)
   - Password (encrypted)
   - Monday.com user ID
   - Monday.com account ID

   ## How We Store It
   - Passwords: AES-256-CBC encryption
   - Emails: Encrypted at rest (Supabase)
   - Database: PostgreSQL on Supabase

   ## How Long We Keep It
   - Until user uninstalls app
   - Or 10 days after uninstall
   - Audit logs: 90 days

   ## Your Rights
   - Access: Request your data
   - Delete: Request data deletion
   - Export: Get your data in JSON
   ```

6. **Remove Debug Endpoint:**
   ```javascript
   // DELETE this endpoint - exposes PII:
   router.get('/debug/email-payloads', (req, res) => {
     // ❌ DO NOT USE IN PRODUCTION
   });
   ```

7. **Sanitize Logs:**
   ```javascript
   // Instead of logging full payload:
   console.log(`[EmailController] Sending email to: [REDACTED]`);

   // Or hash PII:
   const crypto = require('crypto');
   const hashEmail = (email) =>
     crypto.createHash('sha256').update(email).digest('hex').slice(0, 8);

   console.log(`[EmailController] Sending email to: ${hashEmail(email)}`);
   ```

**Priority:** 🔴 **CRITICAL**

---

### 5. ⚠️ SCOPES UTILIZZATI

**Status:** ⚠️ **Partially Compliant**

**Findings:**

#### **Current Scopes**

The app is configured as a **Custom App**, not an OAuth app. It receives:
- `shortLivedToken` - For GraphQL API access
- Implicit permissions based on app configuration

**Scopes/Permissions Used:**

| Resource | Permission | Used | Justified |
|----------|-----------|------|-----------|
| Items | Read | ✅ Yes | Fetch column values for templates |
| Items | Write | ❌ No | Not needed |
| Boards | Read | ✅ Yes | Get board info (in GraphQL) |
| Boards | Write | ❌ No | Not needed |
| Users | Read | ✅ Yes | Get user info from JWT |
| Users | Write | ❌ No | Not needed |
| Email | N/A | ✅ Yes | Send via Aruba SMTP |

**Evidence:**

*GraphQL Query* (controllers/emailController.js, lines 98-130):
```javascript
const query = `
  query {
    items(ids: [${itemId}]) {
      id
      name
      column_values(ids: [${columnIds}]) {  // ✅ Read-only
        id
        text
        value
      }
    }
  }
`;
```

**Only READ operations performed**

#### **Issues Found:**

1. ⚠️ **Scopes Not Documented**

   - No `monday-app-association.json` specifying required scopes
   - No Monday.com app manifest/configuration visible
   - Can't verify minimum required permissions claimed

2. ⚠️ **No Scope Validation**

   - No code checks if `shortLivedToken` has required permissions
   - If token lacks permissions, GraphQL returns error (no graceful handling)
   - User not informed why request failed

3. ✅ **Good: Minimal Operations**

   - Only reads item data
   - No write operations
   - No user data modification
   - No permissions requested beyond necessary

4. ⚠️ **SMTP Credentials Not Scoped**

   - SMTP password is Aruba account password
   - User enters Aruba login (broad permissions)
   - Should use Aruba app-specific password (narrow scope)

**Recommendations:**

1. **Document Required Scopes in App Manifest:**
   ```json
   {
     "monday-app-id": "11904692",
     "required-scopes": [
       "items:read",
       "column-values:read",
       "users:read"
     ],
     "optional-scopes": []
   }
   ```

2. **Add Scope Validation:**
   ```javascript
   // middleware/verifyScopesMiddleware.js
   async function verifyScopes(req, res, next) {
     const token = req.monday.shortLivedToken;

     // Decode to check claims
     const decoded = jwt.decode(token);
     const scopes = decoded.scopes || [];

     // Required scopes
     const required = ['items:read', 'users:read'];
     const hasAll = required.every(scope => scopes.includes(scope));

     if (!hasAll) {
       return res.status(403).json({
         error: 'Insufficient permissions',
         required,
         current: scopes
       });
     }

     next();
   }
   ```

3. **Implement App-Specific Password for Aruba:**

   Instead of full Aruba password:
   ```
   1. User creates app-specific password in Aruba panel
   2. App-specific password has limited permissions
   3. Only used for sending emails, not full account access
   ```

4. **Add Permission Error Handling:**
   ```javascript
   try {
     const response = await axios.post('https://api.monday.com/v2', {
       query: columnQuery
     }, {
       headers: { 'Authorization': `Bearer ${shortLivedToken}` }
     });
   } catch (error) {
     if (error.response?.data?.errors?.[0]?.message?.includes('permission')) {
       return res.status(403).json({
         error: 'App lacks required permissions',
         solution: 'Reinstall app to grant permissions'
       });
     }
   }
   ```

**Priority:** 🟡 **HIGH**

---

### 6. ⚠️ LOGGING E RETENTION

**Status:** ⚠️ **Partially Compliant**

**Findings:**

#### **Logging Implementation**

**Files with Logging:**

1. **middleware/authLogger.js** - 29 KB
   ```javascript
   - Logs auth requests (sanitized)
   - Logs auth successes
   - Logs auth failures
   - Sanitizes tokens (shows first 10 + last 10 chars)
   ```

2. **middleware/verifyMonday.js** - Detailed JWT logs
   ```javascript
   console.log('[VerifyMonday] Token substring:', token.substring(0, 20) + '...');
   console.log('[VerifyMonday] ✓ Token valido');
   ```

3. **models/IntegrationCredentials.js** - Credential operations
   ```javascript
   console.log('[IntegrationCredentials] Creating credentials...');
   console.log('[IntegrationCredentials] ⚠️ WARNING: Password saved in PLAIN TEXT');
   ```

4. **services/emailService.js** - Email sending
   ```javascript
   console.log('[EmailService] Sending email via Aruba SMTP');
   console.log('[EmailService] ✅ Email sent successfully!');
   ```

5. **controllers/emailController.js** - Full payloads stored to file
   ```javascript
   // logs/email-payloads.json - STORES SENSITIVE DATA
   ```

#### **Issues Found:**

1. ❌ **Sensitive Data Logged**

   **Email Payloads File** (`logs/email-payloads.json`):
   ```json
   [
     {
       "timestamp": "2025-12-03T14:00:00.000Z",
       "userId": "12345",
       "recipientEmail": "user@example.com",  // ❌ PII LOGGED
       "subject": "Action Required",          // ⚠️ May contain PII
       "body": "Dear John..."                 // ⚠️ May contain PII
     }
   ]
   ```

   **Accessible via:** `GET /debug/email-payloads` (no authentication!)

2. ❌ **No Log Retention Policy**

   - Logs stay indefinitely
   - `email-payloads.json` never cleaned up
   - No log rotation implemented
   - No archival to secure storage

3. ❌ **Passwords May Be Logged**

   If error occurs during encryption:
   ```javascript
   // If encryptPassword() fails, plaintext logged:
   console.error('[IntegrationCredentials] Error:', error.message);
   // Error may contain password!
   ```

4. ⚠️ **Debug Endpoint Exposed**

   ```javascript
   router.get('/debug/email-payloads', (req, res) => {
     // ❌ No authentication required!
     // ❌ Returns all email payloads
   });
   ```

5. ⚠️ **Inconsistent Logging Levels**

   - No DEBUG vs ERROR vs WARNING distinction
   - No centralized logger (just console.log)
   - No structured logging (JSON format)

6. ⚠️ **No Log Monitoring**

   - Logs not sent to monitoring service
   - No alerts for security events
   - No anomaly detection

**Code Evidence:**

*Debug Endpoint (controllers/emailController.js):*
```javascript
router.get('/debug/email-payloads', (req, res) => {
  const logPath = './logs/email-payloads.json';

  if (!fs.existsSync(logPath)) {
    return res.json([]);
  }

  const payloads = JSON.parse(fs.readFileSync(logPath, 'utf8') || '[]');

  // Return last 10 payloads
  return res.json(payloads.slice(-10));
});
// ❌ ISSUES:
// - No authentication check
// - Exposes all PII
// - No audit log of who accessed this
```

**Recommendations:**

1. **Implement Proper Logging Library:**
   ```bash
   npm install winston
   ```

   ```javascript
   // logger.js
   const winston = require('winston');

   const logger = winston.createLogger({
     level: process.env.LOG_LEVEL || 'info',
     format: winston.format.json(),
     defaultMeta: { service: 'monday-aruba-app' },
     transports: [
       new winston.transports.File({
         filename: 'logs/error.log',
         level: 'error',
         maxsize: 5242880,  // 5MB
         maxFiles: 5        // Keep 5 files
       }),
       new winston.transports.File({
         filename: 'logs/combined.log',
         maxsize: 5242880,
         maxFiles: 7
       })
     ]
   });

     if (process.env.NODE_ENV !== 'production') {
       logger.add(new winston.transports.Console({
         format: winston.format.simple()
       }));
     }

     module.exports = logger;
   ```

2. **Remove Debug Endpoint:**
   ```javascript
   // DELETE this entire endpoint
   router.get('/debug/email-payloads', ...);  // ❌ REMOVE
   ```

3. **Sanitize Logs:**
   ```javascript
   // Instead of logging full payload:
   const sanitizePayload = (payload) => {
     return {
       timestamp: payload.timestamp,
       userId: payload.userId,  // OK - Monday ID
       recipientEmail: '[REDACTED]',  // Remove
       subject: '[REDACTED]',          // Remove
       body: '[REDACTED]'              // Remove
     };
   };

   logger.info('Email sent', sanitizePayload(payload));
   ```

4. **Implement Log Rotation:**
   ```javascript
   const rfs = require('rotating-file-stream');

   // Rotate logs daily
   const accessLogStream = rfs.createStream('access.log', {
     interval: '1d',  // Rotate daily
     path: './logs',
     maxFiles: 30     // Keep 30 days
   });
   ```

5. **Restrict Logging Endpoint:**
   ```javascript
   // If you need debug logs, protect with auth:
   router.get('/debug/email-payloads', verifyMonday, (req, res) => {
     // Check if user is admin
     if (req.monday.userId !== process.env.ADMIN_USER_ID) {
       return res.status(403).json({ error: 'Forbidden' });
     }

     // Return sanitized logs only
     const payloads = JSON.parse(fs.readFileSync(logPath, 'utf8') || '[]');
     const sanitized = payloads.map(p => ({
       timestamp: p.timestamp,
       userId: p.userId,
       success: true  // Don't expose details
     }));

     return res.json(sanitized);
   });
   ```

6. **Add Audit Logging:**
   ```javascript
   // Log all credential operations
   async logCredentialAccess(userId, action, details) {
     await AuditLog.create({
       userId,
       action,
       status: 'SUCCESS',
       message: details,
       metadata: { ip: req.ip, userAgent: req.headers['user-agent'] }
     });
   }
   ```

7. **Set Retention Policy:**
   - Application logs: 30 days
   - Audit logs: 90 days
   - Backup logs: 1 year
   - Email payloads: 7 days (or delete immediately)

**Priority:** 🟡 **HIGH**

---

### 7. ✅ CRITTOGRAFIA DATA AT REST

**Status:** ⚠️ **Partially Compliant**

**Findings:**

#### **Current Encryption Status**

**Database Encryption:**
- ✅ Supabase PostgreSQL uses TLS in transit
- ✅ Supabase includes database encryption at rest (optional feature enabled)
- ✅ Database passwords hashed in connection strings

**Aruba Password Encryption:**
- ❌ **CURRENTLY DISABLED** (see finding #3)
- Algorithm: AES-256-CBC (when enabled)
- Key derivation: PBKDF2 (100,000 iterations)
- Status: **BROKEN - Uses hardcoded salt**

**Evidence:**

*Encryption Implementation* (models/IntegrationCredentials.js, lines 285-311):
```javascript
static async encryptPassword(plainPassword) {
  const crypto = require('crypto');
  const algorithm = 'aes-256-cbc';

  // ❌ ISSUE 1: Hardcoded salt
  const salt = Buffer.from('aruba_mail_salt', 'utf-8');

  // ⚠️ ISSUE 2: Weak key derivation
  const key = crypto.pbkdf2Sync(
    process.env.ENCRYPTION_KEY,      // ❌ Key stored in .env
    salt,                              // ❌ Static salt
    100000,
    32,
    'sha256'
  );

  // ✅ Good: Random IV
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(plainPassword, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

static async decryptPassword(encryptedPassword) {
  const [ivHex, encrypted] = encryptedPassword.split(':');

  // ... recreate key with SAME salt
  // If key is compromised, attacker can decrypt ALL passwords
}
```

#### **Issues Found:**

1. ❌ **Encryption Currently Disabled**
   ```javascript
   if (false) {  // ❌ DISABLED FOR DEBUGGING
     return encryptPassword(plainPassword);
   }
   return plainPassword;  // ❌ PLAINTEXT STORAGE
   ```

2. ❌ **Static Salt for All Passwords**
   ```javascript
   const salt = Buffer.from('aruba_mail_salt', 'utf-8');  // ❌ Same for all
   ```

   **Attack Vector:** If salt is compromised, all passwords vulnerable to rainbow table attacks

3. ❌ **Encryption Key Stored in .env**
   ```
   ENCRYPTION_KEY=9d302675229d6e015e3cf85981c116e21402409bd6bed5fa8a8cf93d42704651
   ```

   If database is compromised but encryption key is not, data is still protected. But if both are compromised (which they are - .env is exposed), encryption is useless.

4. ⚠️ **PBKDF2 is Slow**
   - 100,000 iterations = slow decryption
   - On each email send, must decrypt password
   - Performance hit significant
   - Better algorithms: scrypt, Argon2

5. ⚠️ **No Key Rotation Mechanism**
   - If encryption key is compromised, no way to re-encrypt old passwords
   - All historical data remains vulnerable

6. ⚠️ **No Authentication Tag**
   - Using CBC mode (unauthenticated)
   - Attacker can modify encrypted data undetected
   - Should use GCM mode (authenticated encryption)

**Recommendations:**

1. **Use Stronger Encryption Algorithm (AES-256-GCM):**
   ```javascript
   const crypto = require('crypto');

   function encryptPassword(password) {
     const algorithm = 'aes-256-gcm';

     // ✅ Random salt for each password
     const salt = crypto.randomBytes(32);

     // ✅ Better key derivation
     const key = crypto.scryptSync(
       process.env.ENCRYPTION_KEY,
       salt,
       32,
       { N: 16384, r: 8, p: 1 }
     );

     const iv = crypto.randomBytes(16);
     const cipher = crypto.createCipheriv(algorithm, key, iv);

     let encrypted = cipher.update(password, 'utf8', 'hex');
     encrypted += cipher.final('hex');

     // ✅ Authenticated tag
     const authTag = cipher.getAuthTag();

     // Return: salt:iv:authTag:encrypted
     return salt.toString('hex') + ':' +
            iv.toString('hex') + ':' +
            authTag.toString('hex') + ':' +
            encrypted;
   }
   ```

2. **Use Better Key Derivation:**
   ```javascript
   // Instead of PBKDF2:
   const key = crypto.pbkdf2Sync(process.env.ENCRYPTION_KEY, salt, 100000, 32, 'sha256');

   // Use scrypt (faster for decryption):
   const key = crypto.scryptSync(
     process.env.ENCRYPTION_KEY,
     salt,
     32,
     { N: 16384, r: 8, p: 1 }  // Standard parameters
   );
   ```

3. **Move Encryption Key to Secure Storage:**
   ```javascript
   // Instead of .env file:
   // Use AWS Secrets Manager:
   const aws = require('aws-sdk');
   const secretsManager = new aws.SecretsManager();

   const secret = await secretsManager.getSecretValue({
     SecretId: 'monday-aruba/encryption-key'
   }).promise();

   const ENCRYPTION_KEY = secret.SecretString;
   ```

4. **Implement Key Rotation:**
   ```javascript
   // Store key version in encrypted data
   function encryptPassword(password, keyVersion = 1) {
     const key = getKeyByVersion(keyVersion);
     // ... encryption ...
     return keyVersion + ':' + encryptedData;
   }

   async function decryptPassword(encryptedWithVersion) {
     const [keyVersion, encryptedData] = encryptedWithVersion.split(':');
     const key = getKeyByVersion(keyVersion);
     // ... decryption ...
   }

   // On key rotation, re-encrypt old passwords
   async function rotateEncryptionKey() {
     const oldKey = getKeyByVersion(1);
     const newKey = generateNewKey();  // keyVersion = 2

     const allCredentials = await IntegrationCredentials.findAll();
     for (const cred of allCredentials) {
       const plainPassword = decryptPassword(cred.arubaPassword, oldKey);
       const newEncrypted = encryptPassword(plainPassword, newKey);
       await cred.update({ arubaPassword: newEncrypted });
     }
   }
   ```

5. **Verify Supabase Encryption at Rest:**
   ```bash
   # Check Supabase settings:
   # 1. Go to Supabase Dashboard
   # 2. Settings → Security
   # 3. Verify "Database encryption" is enabled
   # 4. Verify TLS is enforced
   ```

**Priority:** 🔴 **CRITICAL**

---

### 8. ✅ PROTEZIONE DA SQL INJECTION

**Status:** ✅ **Fully Compliant**

**Findings:**

#### **SQL Injection Protection**

The application uses **Prisma ORM**, which automatically prevents SQL injection through parameterized queries.

#### **Evidence of Safe Practices:**

**All Database Queries Use Prisma:**

File: `models/IntegrationCredentials.js`
```javascript
// ✅ Safe: Prisma parameterized queries
static async findByUserId(userId) {
  return await prisma.integrationCredentials.findUnique({
    where: { userId: String(userId) }  // Prisma escapes
  });
}

static async create(data) {
  return await prisma.integrationCredentials.create({
    data: {
      userId: String(data.userId),      // ✅ Escaped
      arubaEmail: String(data.arubaEmail),  // ✅ Escaped
      arubaPassword: data.encryptedPassword,
      smtpHost: data.smtpHost,
      smtpPort: parseInt(data.smtpPort)  // ✅ Type-safe
    }
  });
}

static async update(userId, data) {
  return await prisma.integrationCredentials.update({
    where: { userId: String(userId) },
    data: {
      arubaEmail: data.arubaEmail,  // ✅ Escaped
      arubaPassword: data.encryptedPassword,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort
    }
  });
}

static async delete(userId) {
  return await prisma.integrationCredentials.delete({
    where: { userId: String(userId) }  // ✅ Escaped
  });
}
```

**No Raw SQL Queries Found:**
- ✅ No `prisma.$queryRaw()` usage
- ✅ No `prisma.$executeRaw()` usage
- ✅ All queries use Prisma's type-safe API

**Type Safety Enforced:**
```javascript
// Prisma schema enforces types
model IntegrationCredentials {
  userId String @unique  // ✅ String type enforced
  arubaEmail String      // ✅ String type enforced
  smtpPort Int           // ✅ Integer type enforced (from parseInt)
}
```

#### **Best Practices Implemented:**

1. ✅ **Parameterized Queries**
   - All values passed as parameters, not concatenated
   - Prisma handles escaping

2. ✅ **Type Safety**
   - Prisma generates TypeScript types
   - Type mismatches caught at compile-time

3. ✅ **Input Validation**
   - Validation in `utils/validation.js`
   - Checks email format, URL format, etc.

4. ✅ **No String Interpolation**
   - No use of template literals with DB queries
   - No string concatenation of queries

**Recommendations:**

1. **Continue Using Prisma:**
   - Never use raw SQL unless absolutely necessary
   - If raw SQL needed, use `$queryRaw` with parameterization:
   ```javascript
   // ✅ SAFE:
   const result = await prisma.$queryRaw`
     SELECT * FROM integration_credentials WHERE userId = ${userId}
   `;

   // ❌ UNSAFE:
   const query = `SELECT * FROM integration_credentials WHERE userId = '${userId}'`;
   ```

2. **Add Input Validation Middleware:**
   ```javascript
   // Validate all inputs
   router.post('/credentials/save', validateInput, async (req, res) => {
     // Input already validated
   });
   ```

3. **Regular Prisma Updates:**
   ```bash
   npm update @prisma/client prisma
   ```

4. **Use Prisma Audit Features:**
   ```javascript
   // Enable audit logging
   model AuditLog {
     id Int @id @default(autoincrement())
     action String  // CREATE, UPDATE, DELETE
     table String   // Table name
     userId String
     createdAt DateTime @default(now())
   }
   ```

**Verdict:** ✅ **SQL Injection Prevention: SECURE**

**Priority:** ✅ **COMPLIANT**

---

### 9. ⚠️ VALIDAZIONE E SANITIZZAZIONE INPUT

**Status:** ⚠️ **Partially Compliant**

**Findings:**

#### **Input Validation Coverage**

File: `utils/validation.js` (386 lines)

**Validation Functions Implemented:**

1. **Email Validation** ✅
   ```javascript
   validateEmail(email) {
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     if (!emailRegex.test(email)) return false;
     if (email.length > 254) return false;
     if (email.length < 5) return false;
     return true;
   }
   ```

   **Issues:**
   - Regex is basic (allows some invalid emails)
   - Better regex:
   ```javascript
   /^[^\s@]+@[^\s@]+\.[^\s@]{2,6}$/  // TLD 2-6 chars
   ```

2. **Password Validation** ✅
   ```javascript
   validatePassword(password) {
     if (!password) return { valid: false, error: 'Password required' };
     if (password.length < 8) return { valid: false, error: 'Min 8 chars' };
     if (password.length > 128) return { valid: false, error: 'Max 128 chars' };

     const hasUppercase = /[A-Z]/.test(password);
     const hasLowercase = /[a-z]/.test(password);
     const hasNumber = /[0-9]/.test(password);
     const hasSpecial = /[!@#$%^&*]/.test(password);

     // Score system
     let score = 0;
     if (hasUppercase) score++;
     if (hasLowercase) score++;
     if (hasNumber) score++;
     if (hasSpecial) score++;

     return { valid: score >= 3, score };
   }
   ```

3. **URL Validation** ✅
   ```javascript
   validateUrl(url) {
     if (!url) return false;
     const urlRegex = /^https?:\/\/.+/i;
     return urlRegex.test(url);
   }
   ```

4. **SMTP Host Validation** ✅
   ```javascript
   validateSmtpHost(host) {
     // Domain format OR IP address
     const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
     const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

     if (host.length > 255) return false;
     if (host.length < 3) return false;

     return domainRegex.test(host) || ipRegex.test(host);
   }
   ```

#### **Issues Found:**

1. ⚠️ **Validation Not Applied to All Inputs**

   **Missing Validation:**
   - `backToUrl` parameter (Monday.com redirect)
   - `recipientEmail` in email payload
   - `subject` length validation
   - `body` content validation

2. ❌ **No HTML/XSS Sanitization**

   Email body might contain HTML:
   ```javascript
   // ❌ No sanitization:
   const body = req.body.body;  // Could contain <script>

   // Should sanitize:
   const sanitized = sanitizeHtml(body, {
     allowedTags: ['b', 'i', 'em', 'strong', 'a'],
     allowedAttributes: { 'a': ['href'] }
   });
   ```

3. ⚠️ **Email Validation Regex is Basic**

   Current:
   ```javascript
   /^[^\s@]+@[^\s@]+\.[^\s@]+$/
   ```

   Issues:
   - Accepts `a@b.c` (too short TLD)
   - Accepts emails ending with dot
   - Accepts multiple @@ symbols

   Better:
   ```javascript
   /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
   ```

4. ⚠️ **No Rate Limiting on Form Submission**

   - Credential creation endpoint not rate-limited per IP
   - Could be used for enumeration attacks
   - Rate limiter exists but not applied to `/credentials/save`

5. ⚠️ **No CSRF Protection**

   - Form submission has no CSRF token
   - POST to `/credentials/save` could be triggered from external site
   - No `SameSite` cookie attribute

**Evidence:**

*Auth Controller - Missing Validation* (controllers/authController.js):
```javascript
static async saveCredentials(req, res) {
  const { arubaEmail, arubaPassword, smtpHost, smtpPort } = req.body;

  // ❌ No validation on arubaEmail
  // ❌ No validation on arubaPassword strength
  // ❌ No validation on smtpHost
  // ❌ No validation on smtpPort

  // Should be:
  // if (!validateEmail(arubaEmail)) return res.status(400).json(...);

  try {
    const credentials = await IntegrationCredentials.create({
      userId,
      arubaEmail,
      arubaPassword,
      smtpHost,
      smtpPort
    });
  } catch (error) {
    // ...
  }
}
```

**Recommendations:**

1. **Add Validation Middleware:**
   ```javascript
   // middleware/validateInput.js
   const { body, validationResult } = require('express-validator');

   function validateCredentials() {
     return [
       body('arubaEmail')
         .isEmail()
         .normalizeEmail()
         .withMessage('Invalid email address'),
       body('arubaPassword')
         .isLength({ min: 8, max: 128 })
         .withMessage('Password must be 8-128 characters'),
       body('smtpHost')
         .matches(/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$|^(\d{1,3}\.){3}\d{1,3}$/)
         .withMessage('Invalid SMTP host'),
       body('smtpPort')
         .isInt({ min: 1, max: 65535 })
         .withMessage('Port must be 1-65535')
     ];
   }

   function handleValidationErrors(req, res, next) {
     const errors = validationResult(req);
     if (!errors.isEmpty()) {
       return res.status(400).json({ errors: errors.array() });
     }
     next();
   }
   ```

2. **Apply Validation to Routes:**
   ```javascript
   router.post('/credentials/save',
     validateCredentials(),
     handleValidationErrors,
     verifyMonday,
     emailLimiter,  // Add rate limiter!
     authController.saveCredentials
   );
   ```

3. **Add HTML Sanitization:**
   ```bash
   npm install sanitize-html
   ```

   ```javascript
   const sanitizeHtml = require('sanitize-html');

   const sanitized = sanitizeHtml(userInput, {
     allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
     allowedAttributes: { 'a': ['href'] },
     disallowedTagsMode: 'discard'
   });
   ```

4. **Improve Email Validation:**
   ```javascript
   // Use RFC 5322 compliant validator
   npm install email-validator

   const validator = require('email-validator');
   validator.validate(email);  // More robust
   ```

5. **Add CSRF Protection:**
   ```bash
   npm install csurf
   ```

   ```javascript
   const csrf = require('csurf');
   const csrfProtection = csrf({ cookie: false });

   // GET form (send token)
   router.get('/credentials/create', csrfProtection, (req, res) => {
     res.send(`
       <form method="POST" action="/credentials/save">
         <input type="hidden" name="_csrf" value="${req.csrfToken()}">
         ...form fields...
       </form>
     `);
   });

   // POST form (verify token)
   router.post('/credentials/save', csrfProtection, verifyMonday, ...);
   ```

6. **Add `SameSite` Cookie Attribute:**
   ```javascript
   app.use(session({
     cookie: {
       sameSite: 'Lax',      // Prevent CSRF
       secure: true,         // HTTPS only
       httpOnly: true        // No JavaScript access
     }
   }));
   ```

7. **Sanitize Logs and Error Messages:**
   ```javascript
   // Don't log sensitive data
   console.log(`Email: ${sanitizeForLogging(email)}`);

   function sanitizeForLogging(str) {
     return str.substring(0, 3) + '***' + str.substring(str.length - 3);
   }
   ```

**Priority:** 🟡 **HIGH**

---

### 10. ⚠️ DOMAIN OWNERSHIP

**Status:** ⚠️ **Partially Compliant**

**Findings:**

#### **Current Domain Configuration**

**Deployment Domain:** `https://e4d45-service-32281405-f2dd3966.us.monday.app`

**Issues:**
- ❌ Custom domain not configured
- ❌ Using Monday.com subdomain (allowed but not ideal)
- ❌ No `monday-app-association.json` file
- ❌ Support email not configured
- ⚠️ No domain ownership verification

#### **Required for Monday.com Marketplace:**

1. **Domain Ownership Proof**
2. **Support Email on Domain**
3. **JSON Association File**

**Code Evidence:**

*Current Configuration:*
- No custom domain in `vercel.json`
- No domain in `server.js`
- No `monday-app-association.json` in public folder

**Recommendations:**

1. **Purchase Custom Domain:**
   ```
   Example: monday-aruba-integration.com
   ```

2. **Create `monday-app-association.json`:**

   File: `/Users/aleca/monday-aruba-integration/public/monday-app-association.json`
   ```json
   {
     "monday-apps": [
       {
         "id": 11904692,
         "clientId": "your_client_id_from_monday_dashboard"
       }
     ]
   }
   ```

3. **Configure Domain in Vercel:**
   ```bash
   vercel domains add monday-aruba-integration.com
   ```

4. **Set Support Email:**

   In README.md:
   ```markdown
   ## Support
   For support, contact: support@monday-aruba-integration.com
   ```

5. **Add DNS Records:**
   ```
   CNAME: api.monday-aruba-integration.com → cname.vercel.com
   ```

6. **Enable HTTPS:**
   ```bash
   # Vercel automatically issues SSL certificate
   # Verify: https://monday-aruba-integration.com
   ```

**Priority:** 🟡 **HIGH**

---

### 11. ✅ DATA RETENTION E DELETION

**Status:** ⚠️ **Partially Compliant**

**Findings:**

#### **Data Retention Policy**

**Monday.com Requirement:**
- Delete all user data within 10 days of app uninstall or authorization revocation

**Current Implementation:**

File: `controllers/authController.js` (lines 695-746)
```javascript
static async deleteUserCredentials(req, res) {
  try {
    const userId = req.monday.userId;

    const result = await IntegrationCredentials.delete(userId);

    if (!result) {
      return res.status(404).json({
        error: 'Credenziali non trovate'
      });
    }

    // Soft delete with audit log
    await IntegrationCredentials.logAudit(
      userId,
      'CREDENTIALS_DELETED',
      'SUCCESS',
      'User deleted credentials'
    );

    return res.json({
      success: true,
      message: 'Credenziali eliminate con successo'
    });
  } catch (error) {
    // ...
  }
}
```

#### **Issues Found:**

1. ❌ **No App Uninstall Webhook**

   - Monday.com sends webhook when app is uninstalled
   - App must implement webhook handler
   - Currently no webhook handler found

2. ⚠️ **Manual Deletion Only**

   - Users must manually call delete endpoint
   - No automatic cleanup
   - No timer/scheduler for 10-day deletion

3. ⚠️ **Audit Logs Not Deleted**

   - Credentials deleted but audit logs remain
   - Contains PII (userId, email)
   - Never cleaned up

4. ⚠️ **No Data Export**

   - No endpoint to export user's data (GDPR requirement)
   - No GDPR Right to Data Portability
   - No compliance with CCPA/GDPR

5. ⚠️ **Soft Delete Not Implemented**

   - Credentials fully deleted (hard delete)
   - Can't be recovered
   - No soft delete with retention period

**Recommendations:**

1. **Add App Uninstall Webhook Handler:**
   ```javascript
   // routes/webhooks.js
   router.post('/webhooks/monday/app-uninstall', async (req, res) => {
     const { userId, accountId } = req.body;

     try {
       // Schedule deletion for 10 days from now
       const deleteDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

       await DeletionQueue.create({
         userId,
         accountId,
         reason: 'APP_UNINSTALLED',
         scheduledFor: deleteDate
       });

       // Log for audit trail
       await IntegrationCredentials.logAudit(
         userId,
         'APP_UNINSTALLED',
         'PENDING_DELETION',
         `Scheduled for deletion on ${deleteDate}`
       );

       res.json({ success: true });
     } catch (error) {
       console.error('[Webhooks] Uninstall error:', error);
       res.status(500).json({ error: error.message });
     }
   });
   ```

2. **Implement Scheduled Deletion:**
   ```bash
   npm install node-cron
   ```

   ```javascript
   // jobs/deleteScheduledData.js
   const cron = require('node-cron');

   // Run every hour
   cron.schedule('0 * * * *', async () => {
     const toDelete = await DeletionQueue.findDueForDeletion();

     for (const item of toDelete) {
       try {
         // Permanently delete
         await IntegrationCredentials.delete(item.userId);

         // Delete audit logs older than 10 days
         await AuditLog.deleteWhere({
           userId: item.userId,
           createdAt: { lt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }
         });

         // Mark as deleted
         await DeletionQueue.update(item.id, { status: 'DELETED' });

         console.log(`[DeleteJob] Deleted data for user: ${item.userId}`);
       } catch (error) {
         console.error(`[DeleteJob] Error deleting ${item.userId}:`, error);
       }
     }
   });
   ```

3. **Add Data Export Endpoint (GDPR):**
   ```javascript
   router.post('/api/user/export', verifyMonday, async (req, res) => {
     const userId = req.monday.userId;

     try {
       // Fetch all user data
       const credentials = await IntegrationCredentials.findByUserId(userId);
       const auditLogs = await AuditLog.findByUserId(userId);
       const emailPayloads = await getEmailPayloadsForUser(userId);

       // Create JSON export
       const export_data = {
         exportedAt: new Date().toISOString(),
         userId,
         credentials: sanitizeForExport(credentials),
         auditLogs,
         emailPayloads: sanitizeEmailPayloads(emailPayloads)
       };

       // Return as JSON
       res.json(export_data);
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   ```

4. **Add Data Deletion Confirmation Endpoint (GDPR):**
   ```javascript
   router.post('/api/user/delete-all', verifyMonday, async (req, res) => {
     const userId = req.monday.userId;

     // Require confirmation token sent to email
     const { confirmationToken } = req.body;

     try {
       const isValid = verifyDeletionToken(confirmationToken, userId);
       if (!isValid) {
         return res.status(400).json({ error: 'Invalid token' });
       }

       // Immediate deletion
       await IntegrationCredentials.delete(userId);
       await AuditLog.deleteWhere({ userId });

       res.json({ success: true, message: 'All your data has been deleted' });
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   ```

5. **Update Database Schema:**
   ```prisma
   model DeletionQueue {
     id        Int       @id @default(autoincrement())
     userId    String    @unique
     accountId String
     reason    String    // APP_UNINSTALLED, USER_REQUEST
     status    String    @default("PENDING")  // PENDING, DELETED, FAILED
     scheduledFor DateTime
     createdAt DateTime  @default(now())

     @@index([scheduledFor])
     @@map("deletion_queue")
   }
   ```

6. **Document Data Retention in Privacy Policy:**
   ```markdown
   ## Data Deletion

   ### When We Delete Data
   - Immediately when user uninstalls app
   - Or within 10 days of app removal
   - On user request (Right to Deletion)

   ### What Gets Deleted
   - Email credentials
   - SMTP configuration
   - Audit logs (after 90 days)
   - Email payload history

   ### What You Can Do
   - Request data export: POST /api/user/export
   - Request data deletion: POST /api/user/delete-all
   ```

**Priority:** 🟡 **HIGH**

---

### 12. ⚠️ COOKIE SECURITY

**Status:** ⚠️ **Partially Compliant**

**Findings:**

#### **Current Cookie Usage**

The application doesn't currently use session cookies for authentication. Instead, it uses **JWT tokens** in the `Authorization` header.

**No Session Middleware Found:**
- No `express-session` in package.json
- No `passport.js` integration
- No cookies set by the application

#### **Issues Found:**

1. ⚠️ **No Session Cookies** (Good for JWT-based auth)
   - JWT tokens used instead
   - Tokens sent in Authorization header
   - No SameSite/HttpOnly cookie configuration needed

2. ⚠️ **Potential Tracking Cookies**
   - Vercel may set analytics cookies
   - No opt-in/consent mechanism
   - Undisclosed to users

3. ✅ **No Cookie-Based CSRF**
   - No cookies, so no cookie-based CSRF
   - But should still implement CSRF tokens for forms

**Recommendations:**

1. **If Using Cookies in Future:**
   ```javascript
   const session = require('express-session');

   app.use(session({
     secret: process.env.SESSION_SECRET,
     resave: false,
     saveUninitialized: false,
     cookie: {
       secure: true,          // ✅ HTTPS only
       httpOnly: true,        // ✅ No JS access
       sameSite: 'Strict',    // ✅ Prevent CSRF
       maxAge: 3600000        // 1 hour
     }
   }));
   ```

2. **Implement Cookie Consent (If Tracking Cookies Used):**
   ```javascript
   // Endpoint to accept/reject cookies
   router.post('/api/cookie-consent', (req, res) => {
     const { consent } = req.body;

     res.cookie('cookie-consent', consent, {
       httpOnly: true,
       secure: true,
       sameSite: 'Strict',
       maxAge: 365 * 24 * 60 * 60 * 1000  // 1 year
     });

     res.json({ success: true });
   });
   ```

3. **Add Cookie Policy to Privacy Policy:**
   ```markdown
   ## Cookies

   We use the following cookies:
   - Session cookies (temporary, for authentication)
   - Analytics cookies (optional, requires consent)
   - Functional cookies (remember user preferences)

   You can disable cookies in your browser settings.
   ```

**Priority:** 🟡 **MEDIUM**

---

### 13. ✅ AUTENTICAZIONE SICURA

**Status:** ✅ **Fully Compliant**

**Findings:**

#### **Authentication Method Implemented**

The application uses **JWT-based authentication via Monday.com's Seamless Authentication** (also called "shortTermToken" authentication).

#### **JWT Verification Implementation**

File: `middleware/verifyMonday.js`

**Verification Process:**
```javascript
const jwt = require('jsonwebtoken');
const signingSecret = process.env.MONDAY_SIGNING_SECRET;

let decoded;
try {
  decoded = jwt.verify(token, signingSecret);  // ✅ Signature verified
} catch (error) {
  // Handle: TokenExpiredError, JsonWebTokenError, etc.
}

req.monday = {
  userId: decoded.userId,
  accountId: decoded.accountId,
  shortLivedToken: decoded.shortLivedToken,  // ✅ For GraphQL API
  payload: decoded
};
```

#### **Strengths:**

✅ **Proper JWT Signature Verification**
- Uses `MONDAY_SIGNING_SECRET` (private key)
- Signature cannot be forged without secret
- Token integrity guaranteed

✅ **Token Expiration Checking**
- `exp` claim validated by `jwt.verify()`
- Expired tokens rejected
- No manual expiration check needed

✅ **Multiple Authentication Methods**
- SIGNING_SECRET (webhooks/sync operations)
- CLIENT_SECRET (OAuth/authorization flows)
- Both properly validated

✅ **Short-Lived Token Delegation**
- Monday.com provides `shortLivedToken` for GraphQL
- App uses this token for API calls
- Token auto-expires (Monday managed)

✅ **No Session Fixation**
- JWT tokens are unique
- Cannot be reused across accounts
- Includes user-specific claims (userId, accountId)

✅ **Proper Error Handling**
- JWT errors logged with context
- 401 Unauthorized response for invalid tokens
- No sensitive error messages leaked to user

#### **Evidence:**

*JWT Validation* (middleware/verifyMonday.js):
```javascript
const token = req.headers.authorization?.split(' ')[1];

if (!token) {
  return res.status(401).json({ error: 'Token mancante' });
}

try {
  const decoded = jwt.verify(token, signingSecret);
  // ✅ All error types handled:
  // TokenExpiredError, JsonWebTokenError, NotBeforeError
} catch (error) {
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token scaduto' });
  } else if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token non valido' });
  }
  // ...
}
```

#### **Issues Found:**

1. ⚠️ **No Multi-Account Handling Documentation**

   What if a Monday user has multiple Aruba accounts?
   - Current implementation: One credential per userId
   - If user needs multiple email accounts, not supported
   - Should allow `accountId` + `email` combination

2. ⚠️ **No Backup Authentication Method**

   If Monday.com API is down:
   - App cannot authenticate users
   - No fallback authentication
   - Should implement API key fallback (optional)

3. ⚠️ **Token Validation Not on All Endpoints**

   Let me check... Some endpoints missing `verifyMonday`:

   **Missing authentication:**
   - `GET /health` ✅ OK (public health check)
   - `GET /` ✅ OK (public root)
   - `GET /debug/email-payloads` ❌ **NO AUTH!**

**Recommendations:**

1. **Support Multiple Accounts per User (Optional):**
   ```prisma
   model IntegrationCredentials {
     id        Int       @id @default(autoincrement())
     userId    String                          // Monday user
     accountId String                          // Monday account
     email     String    @unique               // Aruba email
     password  String                          // Encrypted

     // Compound unique constraint
     @@unique([userId, accountId, email])
   }
   ```

   ```javascript
   // Support selecting account on email send
   router.post('/monday/sendEmail', verifyMonday, async (req, res) => {
     const { fromEmail, recipientEmail, subject, body } = req.body;

     // Find credentials for specific email
     const credentials = await IntegrationCredentials.findByUserIdAndEmail(
       req.monday.userId,
       fromEmail
     );

     if (!credentials) {
       return res.status(400).json({ error: 'Email account not configured' });
     }

     // Send using that email's credentials
   });
   ```

2. **Add Endpoint Protection:**
   ```javascript
   // Apply verifyMonday to ALL sensitive endpoints
   router.get('/debug/email-payloads', verifyMonday, (req, res) => {
     // Now requires authentication
   });
   ```

3. **Document Authentication Choice:**

   Add to README.md:
   ```markdown
   ## Authentication Method

   This app uses **Monday.com Seamless Authentication** via JWT tokens.

   ### Why JWT?
   - No need to store Monday.com credentials
   - Monday.com manages token issuance
   - App inherits Monday's security
   - User context automatically available

   ### How It Works
   1. Monday.com sends JWT in Authorization header
   2. App verifies signature using MONDAY_SIGNING_SECRET
   3. JWT contains: userId, accountId, shortLivedToken
   4. App uses shortLivedToken for Monday GraphQL API

   ### Alternatives Considered
   - OAuth: Would require more complex setup
   - API Keys: Would require key storage/rotation
   - Basic Auth: Would expose passwords
   ```

**Verdict:** ✅ **Authentication: SECURE**

**Priority:** ✅ **COMPLIANT**

---

### 14. ✅ HOSTING INFORMATION

**Status:** ✅ **Fully Compliant**

**Findings:**

#### **Backend Hosting**

**Platform:** Vercel (Serverless)

**Deployment Configuration:**

File: `vercel.json`
```json
{
  "env": {
    "RESEND_API_KEY": "@resend_api_key"
  }
}
```

**Deployment Method:**
```bash
mapps code:push -i 11904692 -z us
```

**Server Entry Point:** `server.js`
```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### **Database Hosting**

**Platform:** Supabase (PostgreSQL)

**Connection String:**
```
postgresql://postgres:password@aws-1-eu-north-1.pooler.supabase.com:6543/postgres
```

**Region:** EU-NORTH-1 (Sweden)

#### **FQDN & Domain**

**Current:** `https://e4d45-service-32281405-f2dd3966.us.monday.app` (Vercel temporary domain)

**Issues:**
- ❌ Using Monday.com subdomain (not ideal but allowed)
- ❌ Should use custom domain
- ✅ HTTPS enabled
- ✅ Vercel provides automatic scaling

**Recommendations:**

1. **Use Custom Domain:**
   ```bash
   vercel domains add api.monday-aruba.com
   ```

2. **Update Documentation:**
   ```markdown
   ## Hosting & Deployment

   ### Backend
   - **Platform:** Vercel Functions (Node.js)
   - **Runtime:** Node.js 20+
   - **Environment:** Production/Staging
   - **Auto-scaling:** Yes (Vercel managed)
   - **Region:** us-east-1 (USA)

   ### Database
   - **Platform:** Supabase (PostgreSQL 14)
   - **Region:** eu-north-1 (Sweden)
   - **Backup:** Daily automated
   - **Encryption:** At rest + in transit

   ### Deployment
   - **Tool:** Vercel CLI (mapps code:push)
   - **GitHub Integration:** Enabled
   - **CI/CD:** Vercel automatic
   - **Rollback:** Instant (on Vercel dashboard)
   ```

**Verdict:** ✅ **Hosting: DOCUMENTED**

**Priority:** ✅ **COMPLIANT**

---

### 15. 🔴 HTTPS E TLS

**Status:** ⚠️ **Partially Compliant**

**Findings:**

#### **HTTPS Status**

**Current:**
- ✅ Vercel automatically provides HTTPS
- ✅ Valid SSL certificate
- ✅ All traffic encrypted in transit

**Issues Found:**

1. ❌ **No HTTP-to-HTTPS Redirect**

   File: `server.js` - No redirect implemented

   ```javascript
   // ❌ Missing:
   app.use((req, res, next) => {
     if (!req.secure) {
       res.redirect(`https://${req.header('host')}${req.url}`);
     } else {
       next();
     }
   });
   ```

2. ❌ **No HSTS Header**

   Missing `Strict-Transport-Security` header:
   ```
   Strict-Transport-Security: max-age=31536000; includeSubDomains
   ```

3. ❌ **No TLS 1.2+ Requirement**

   Vercel defaults to TLS 1.0-1.2
   Should enforce TLS 1.2 minimum

4. ⚠️ **Certificate Auto-Renewal**
   - Vercel handles this automatically ✅
   - But not documented

**Evidence:**

*Missing Security Headers in server.js:*
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// ❌ Missing helmet for security headers
// ❌ No HSTS configuration
// ❌ No TLS version enforcement
```

**Recommendations:**

1. **Add HTTPS Redirect in Vercel:**

   File: `vercel.json`
   ```json
   {
     "rewrites": [
       {
         "source": "/(?!.*\\..*)",
         "destination": "/"
       }
     ],
     "headers": [
       {
         "source": "/.*",
         "headers": [
           {
             "key": "Strict-Transport-Security",
             "value": "max-age=31536000; includeSubDomains; preload"
           }
         ]
       }
     ]
   }
   ```

2. **Add Security Headers via Middleware:**
   ```bash
   npm install helmet
   ```

   ```javascript
   const helmet = require('helmet');

   app.use(helmet({
     strictTransportSecurity: {
       maxAge: 31536000,        // 1 year
       includeSubDomains: true,
       preload: true
     }
   }));
   ```

3. **Test HTTPS Configuration:**
   ```bash
   # Use SSL Labs test
   curl -I https://your-domain.com

   # Should show:
   # HTTP/2 200
   # strict-transport-security: max-age=31536000; includeSubDomains; preload
   ```

4. **Submit to HSTS Preload List:**

   If using custom domain:
   1. Go to https://hstspreload.org/
   2. Enter domain
   3. Submit for preloading (browsers ship list)
   4. Ensures HTTPS enforced even on first visit

**Priority:** 🟡 **HIGH**

---

### 16. ⚠️ MALWARE SCAN

**Status:** ⚠️ **Not Scanned**

**Findings:**

No malware scan has been performed on the domains or code.

**Domains to Scan:**
- `e4d45-service-32281405-f2dd3966.us.monday.app`
- `bxsoabasubnraixpkunw.supabase.co` (Supabase)
- `mail.aruba.it` (SMTP server)

**Code to Scan:**
- `npm` dependencies for known vulnerabilities
- Source code for malicious patterns

**Recommendations:**

1. **Scan Domains with VirusTotal:**
   ```bash
   # Go to https://www.virustotal.com/
   # Enter domain: e4d45-service-32281405-f2dd3966.us.monday.app
   # Check for: malware, phishing, suspicious content
   ```

2. **Scan NPM Dependencies:**
   ```bash
   # Audit for known vulnerabilities
   npm audit

   # Fix vulnerabilities
   npm audit fix

   # Check specific packages
   npm ls --depth=0
   ```

3. **Code Malware Scan:**
   ```bash
   # Use free tools
   # 1. npm scan
   npm audit

   # 2. GitHub Advanced Security
   # (if repo is public, free for public repos)
   ```

4. **Check Dependencies:**

   Current dependencies:
   - `express` - Maintained ✅
   - `jsonwebtoken` - Maintained ✅
   - `axios` - Maintained ✅
   - `nodemailer` - Maintained ✅
   - `@prisma/client` - Maintained ✅
   - `prisma` - Maintained ✅
   - `cors` - Maintained ✅
   - `dotenv` - Maintained ✅
   - `@supabase/supabase-js` - Maintained ✅

   All from legitimate sources ✅

**Priority:** 🟡 **MEDIUM**

---

### 17. 🔗 DOMINI E SERVIZI TERZI

**Status:** ✅ **Fully Documented**

**Findings:**

#### **All Third-Party Services Used**

| Service | Domain | Purpose | Data Sent | Justification |
|---------|--------|---------|-----------|--------------|
| **Monday.com** | api.monday.com | Item/column data retrieval | itemId, columnIds | Core feature: fetch data for templates |
| **Monday.com** | monday.com | OAuth/webhook redirects | JWT tokens | Standard Monday.com integration |
| **Supabase** | bxsoabasubnraixpkunw.supabase.co | Database storage | User credentials, audit logs | PostgreSQL backend |
| **Aruba Mail** | mail.aruba.it | Email sending (SMTP) | Email content, recipient | Core feature: send emails |
| **Vercel** | vercel.com | App hosting/CDN | All requests | Serverless deployment |

#### **Evidence:**

*API Calls:*
```javascript
// Monday.com GraphQL (controllers/emailController.js)
axios.post('https://api.monday.com/v2', { query }, headers);

// Aruba SMTP (services/emailService.js)
nodemailer.createTransport({
  host: 'mail.aruba.it',
  port: 465,
  secure: true,
  auth: { user, pass }
});
```

*Database:*
```javascript
// Supabase PostgreSQL
const prisma = new PrismaClient();
// Connected via DATABASE_URL
```

#### **Issues Found:**

1. ❌ **No Privacy Policy**

   - Doesn't document third-party services
   - Doesn't explain data sharing
   - Violates privacy regulations

2. ⚠️ **No Supabase Privacy Documentation**

   - Doesn't mention Supabase stores data in EU
   - Doesn't explain encryption
   - Doesn't mention backups

3. ⚠️ **No Terms of Service**

   - No TOS document
   - No user agreement
   - No limitation of liability

**Recommendations:**

1. **Create Comprehensive Privacy Policy:**

   File: `PRIVACY_POLICY.md`
   ```markdown
   # Privacy Policy

   ## Third-Party Services

   ### Monday.com
   - **Purpose:** Data retrieval (items, columns)
   - **Data Sent:** Item IDs, column IDs
   - **Data Retained:** None by our app
   - **Policy:** https://monday.com/privacy

   ### Supabase (PostgreSQL)
   - **Purpose:** Store user credentials and email history
   - **Data Stored:**
     - Email addresses (Aruba)
     - Encrypted passwords (AES-256-CBC)
     - Monday user IDs
     - Audit logs
   - **Location:** EU (Sweden)
   - **Encryption:** At-rest + TLS in-transit
   - **Retention:** Until user deletion
   - **Policy:** https://supabase.com/privacy

   ### Aruba Mail
   - **Purpose:** Send emails via SMTP
   - **Data Sent:** Email credentials, message content
   - **Data Retained:** Per Aruba policy
   - **Policy:** https://www.aruba.it/privacy

   ### Vercel
   - **Purpose:** App hosting
   - **Data:** All HTTP requests/responses
   - **Retention:** Logs purged after 30 days
   - **Policy:** https://vercel.com/privacy

   ## Your Rights
   - Access: Request your data
   - Delete: Full data deletion
   - Export: JSON export of all data
   - Opt-out: Uninstall app to stop processing

   ## Data Retention
   - Credentials: Until uninstall (max 90 days after)
   - Audit logs: 90 days then deleted
   - Email payloads: 7 days then deleted
   ```

2. **Create Terms of Service:**

   File: `TERMS_OF_SERVICE.md`
   ```markdown
   # Terms of Service

   ## Limitation of Liability
   This app is provided "as-is" without warranties.

   ## Prohibited Uses
   - Don't use for spam
   - Don't use for phishing
   - Don't use for fraud

   ## Compliance
   - Must comply with Monday.com ToS
   - Must comply with Aruba ToS
   - Must comply with applicable laws (GDPR, CCPA, etc.)

   ## Support
   support@yourdomain.com
   ```

3. **Add to Repository:**
   ```
   /Users/aleca/monday-aruba-integration/
   ├── PRIVACY_POLICY.md
   ├── TERMS_OF_SERVICE.md
   └── README.md (link to both)
   ```

**Priority:** 🟡 **HIGH**

---

### 18. ⚠️ AUTENTICAZIONE E AUTORIZZAZIONE DI TUTTI GLI ENDPOINT

**Status:** ⚠️ **Partially Compliant**

**Findings:**

#### **Endpoint Security Matrix**

| Endpoint | Method | Auth Required | Auth Type | Status |
|----------|--------|---|-----------|--------|
| `/` | GET | ❌ No | N/A | ✅ OK (public) |
| `/health` | GET | ❌ No | N/A | ✅ OK (public) |
| `/test` | GET | ❌ No | N/A | ✅ OK (public) |
| `/api/monday/test` | GET | ✅ Yes | JWT | ✅ OK |
| `/api/auth/test` | GET | ✅ Yes | JWT | ✅ OK |
| `/credentials/create` | GET | ✅ Yes | Query JWT | ✅ OK |
| `/credentials/save` | POST | ✅ Yes | JWT | ⚠️ ISSUE: No rate limit |
| `/credentials/get` | POST | ✅ Yes | JWT | ✅ OK |
| `/credentials/delete` | POST | ✅ Yes | JWT | ✅ OK |
| `/monday/getUserCredentials` | POST | ✅ Yes | JWT | ✅ OK |
| `/monday/deleteUserCredentials` | POST | ✅ Yes | JWT | ✅ OK |
| `/monday/update-smtp/:userId` | POST | ❌ No | None | ❌ **NO AUTH!** |
| `/monday/fetchFieldDefs` | POST | ✅ Yes | JWT | ✅ OK |
| `/monday/sendEmail` | POST | ✅ Yes | JWT | ✅ OK (rate limited) |
| `/fields/definitions` | POST | ✅ Yes | JWT | ✅ OK |
| `/fields/email-options` | POST | ✅ Yes | JWT | ✅ OK |
| `/debug/email-payloads` | GET | ❌ No | None | ❌ **NO AUTH!** |

#### **Critical Issues:**

1. ❌ **`/monday/update-smtp/:userId` - NO AUTHENTICATION**

   File: `routes/auth.js` (lines XXX)
   ```javascript
   router.post('/monday/update-smtp/:userId', async (req, res) => {
     const { userId } = req.params;
     const { smtpHost, smtpPort } = req.body;

     // ❌ NO AUTHENTICATION!
     // Anyone can update ANY user's SMTP settings!

     // Should be:
     // router.post('/monday/update-smtp', verifyMonday, async (req, res) => {
     //   const userId = req.monday.userId;  // Get from JWT, not params
   });
   ```

   **Impact:** Anyone knowing a userId can change SMTP settings for that user

2. ❌ **`/debug/email-payloads` - NO AUTHENTICATION**

   File: `controllers/emailController.js`
   ```javascript
   router.get('/debug/email-payloads', (req, res) => {
     // ❌ NO AUTHENTICATION!
     // Returns all email payloads (PII exposed)
     // Anyone can access via: GET /debug/email-payloads
   });
   ```

   **Impact:** All PII (emails, subject lines, etc.) exposed

3. ⚠️ **`/credentials/save` - Missing Rate Limiting**

   File: `routes/auth.js`
   ```javascript
   router.post('/credentials/save', verifyMonday, async (req, res) => {
     // ✅ Authentication: OK
     // ❌ Rate limiting: Missing!
     // Could hammer endpoint with credential change attempts
   });
   ```

4. ⚠️ **`/credentials/create` - JWT in Query Parameter**

   ```javascript
   router.get('/credentials/create?token=<jwt>', ...)
   ```

   **Issue:** JWT tokens in query params are:
   - Logged in browser history
   - Logged in server access logs
   - Visible in referrer headers

   **Better:** Use Authorization header or POST body

#### **Recommendations:**

1. **Fix `/monday/update-smtp/:userId` Endpoint:**

   ```javascript
   // BEFORE (❌ BROKEN):
   router.post('/monday/update-smtp/:userId', async (req, res) => {
     const { userId } = req.params;  // Taken from URL (exploitable)
   });

   // AFTER (✅ FIXED):
   router.post('/monday/update-smtp',
     verifyMonday,           // Verify JWT
     validateInput,          // Validate SMTP settings
     authorizationLimiter,   // Rate limit
     async (req, res) => {
       const userId = req.monday.userId;  // From verified JWT
       const { smtpHost, smtpPort } = req.body;

       // Verify user owns this account
       const creds = await IntegrationCredentials.findByUserId(userId);
       if (!creds) {
         return res.status(404).json({ error: 'Credentials not found' });
       }

       // Update SMTP settings
       await IntegrationCredentials.update(userId, { smtpHost, smtpPort });

       return res.json({ success: true });
     }
   );
   ```

2. **Fix `/debug/email-payloads` Endpoint:**

   ```javascript
   // BEFORE (❌ EXPOSED):
   router.get('/debug/email-payloads', (req, res) => {
     const payloads = JSON.parse(fs.readFileSync(logPath));
     return res.json(payloads);  // Returns all PII
   });

   // AFTER (✅ PROTECTED):
   router.get('/debug/email-payloads',
     verifyMonday,                    // Require auth
     adminOnlyMiddleware,             // Only admins
     (req, res) => {
       // Return sanitized logs only
       const payloads = JSON.parse(fs.readFileSync(logPath));
       const sanitized = payloads.map(p => ({
         timestamp: p.timestamp,
         userId: p.userId,
         status: 'sent'  // Don't expose email/subject/body
       }));
       return res.json(sanitized);
     }
   );

   // Or better: DELETE this debug endpoint entirely!
   ```

3. **Add Rate Limiting to `/credentials/save`:**

   ```javascript
   router.post('/credentials/save',
     verifyMonday,
     authorizationLimiter,    // ← Add this!  (10 attempts/15 min)
     emailLimiter,            // Already exists
     async (req, res) => {
       // ...
     }
   );
   ```

4. **Move JWT from Query to Header:**

   ```javascript
   // BEFORE (query parameter - exposed in logs):
   GET /credentials/create?token=<jwt>

   // AFTER (Authorization header - safe):
   GET /credentials/create
   Authorization: Bearer <jwt>

   // Implementation:
   router.get('/credentials/create', verifyMonday, (req, res) => {
     // JWT already verified by middleware
     // No need to pass it in URL
   });
   ```

5. **Create Authorization Audit Middleware:**

   ```javascript
   // middleware/auditAuthorization.js
   async function auditAuthorization(req, res, next) {
     const { userId, accountId } = req.monday || {};

     await IntegrationCredentials.logAudit(userId,
       `ACCESS_${req.method}_${req.path}`,
       'SUCCESS',
       `IP: ${req.ip}`
     );

     next();
   }

   // Apply to sensitive endpoints
   router.post('/monday/sendEmail',
     verifyMonday,
     auditAuthorization,
     emailController.sendEmail
   );
   ```

6. **Create Admin-Only Middleware:**

   ```javascript
   // middleware/adminOnly.js
   function adminOnly(req, res, next) {
     const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];

     if (!adminUserIds.includes(req.monday.userId)) {
       return res.status(403).json({ error: 'Forbidden' });
     }

     next();
   }
   ```

7. **Document All Endpoints with Security:**

   ```markdown
   # API Endpoints

   ## Authentication Endpoints

   ### GET /credentials/create
   - **Auth:** Required (JWT in Authorization header)
   - **Rate Limit:** 10/15min per user
   - **Returns:** HTML form for credential setup

   ### POST /credentials/save
   - **Auth:** Required (JWT in Authorization header)
   - **Rate Limit:** 10/15min per user
   - **Body:** { arubaEmail, arubaPassword, smtpHost, smtpPort }
   - **Returns:** { success: true }

   ## Email Endpoints

   ### POST /monday/sendEmail
   - **Auth:** Required (JWT in Authorization header)
   - **Rate Limit:** 100/hour per user
   - **Body:** { recipientEmail, subject, body, itemId }
   - **Returns:** { success: true, messageId }
   ```

**Priority:** 🔴 **CRITICAL**

---

## CRITICAL ISSUES (Blockers for Marketplace Approval)

### 🔴 BLOCKING ISSUES

1. **EXPOSED SECRETS IN .env FILE** (Issue #2)
   - Database passwords, API keys, encryption keys visible
   - Must immediately rotate all secrets
   - Even though .env is .gitignored, exposure is severe

2. **ARUBA PASSWORDS STORED IN PLAINTEXT** (Issue #3, #4, #7)
   - Encryption disabled for debugging
   - Database compromise = user account takeover
   - Must enable AES-256 encryption immediately

3. **MISSING AUTHENTICATION ON TWO ENDPOINTS** (Issue #18)
   - `/monday/update-smtp/:userId` - Anyone can modify SMTP
   - `/debug/email-payloads` - Anyone can access all PII
   - Must add verifyMonday middleware

4. **CORS ALLOWS ALL ORIGINS** (Issue #1)
   - `origin: '*'` accepts requests from any domain
   - Could be exploited for CSRF attacks
   - Must restrict to Monday.com domains only

5. **NO HTTPS ENFORCEMENT** (Issue #15)
   - HTTP requests not redirected to HTTPS
   - Credentials could be transmitted in plaintext
   - Must add HTTPS-only enforcement

---

## HIGH PRIORITY ISSUES

1. **No Data Retention Policy** (Issue #11)
   - Violates Monday.com requirement #11 (10-day deletion)
   - Must implement automatic deletion on app uninstall

2. **Logging Contains PII** (Issue #6)
   - Email payloads logged without sanitization
   - Passwords may be logged on errors
   - Must sanitize or disable PII logging

3. **No Rate Limiting on Auth Endpoints** (Issue #9, #18)
   - Can brute-force credential changes
   - Can enumerate users
   - Must add rate limiting

4. **No Privacy Policy or Terms** (Issue #17)
   - Doesn't document data storage
   - Doesn't document third-party services
   - Required for marketplace

5. **No Burp Scan Performed** (Issue #1)
   - Cannot verify security
   - Marketplace requirement
   - Must run scan and address findings

---

## ACTION PLAN

### 🚨 IMMEDIATE (Before Any Deployment)

- [ ] **Rotate ALL secrets** (Monday keys, Supabase password, encryption key)
  - Change: MONDAY_CLIENT_SECRET, MONDAY_SIGNING_SECRET, DATABASE_URL, ENCRYPTION_KEY
  - Minutes to complete: 30

- [ ] **Enable password encryption** (1 line change)
  - File: `models/IntegrationCredentials.js` line 81
  - Change: `if (false)` → `if (true)`
  - Minutes to complete: 5

- [ ] **Fix CORS configuration**
  - File: `server.js`
  - Change: `origin: '*'` → `origin: 'https://monday.com'`
  - Minutes to complete: 5

- [ ] **Add missing authentication**
  - File: `routes/auth.js` - Add `verifyMonday` to `/monday/update-smtp/:userId`
  - File: `controllers/emailController.js` - Add `verifyMonday` to `/debug/email-payloads`
  - Minutes to complete: 10

- [ ] **Enable HTTPS enforcement**
  - Add HSTS header via helmet
  - Minutes to complete: 10

**Total Time:** ~1 hour

---

### 🔴 CRITICAL (Within 24 hours)

- [ ] **Implement password encryption** (better algorithm)
  - Switch from PBKDF2 to scrypt
  - Use random salt per password
  - Switch from CBC to GCM mode
  - Hours to complete: 4-6

- [ ] **Add data deletion workflow**
  - Webhook handler for app uninstall
  - Scheduled deletion task
  - Hours to complete: 6-8

- [ ] **Sanitize logs**
  - Remove `/debug/email-payloads` endpoint OR protect with auth
  - Redact PII from console logs
  - Implement proper logger (winston)
  - Hours to complete: 4-6

- [ ] **Run Burp Suite scan**
  - Address any findings
  - Hours to complete: 4-8

**Total Time:** ~20 hours

---

### 🟡 HIGH PRIORITY (Within 1 week)

- [ ] **Create Privacy Policy** (2-3 hours)
  - Document all data storage
  - Document third-party services
  - Document user rights

- [ ] **Create Terms of Service** (2-3 hours)
  - Limitation of liability
  - Prohibited uses
  - Support contact

- [ ] **Add input validation** (4-6 hours)
  - Validate all form inputs
  - Add CSRF protection
  - Implement express-validator

- [ ] **Add audit logging** (4-6 hours)
  - Log all sensitive operations
  - Track credential access
  - Implement data retention for logs

- [ ] **Configure custom domain** (2-4 hours)
  - Purchase domain or use subdomain
  - Create monday-app-association.json
  - Update deployment

- [ ] **Test all endpoints** (4-6 hours)
  - Verify authentication on all endpoints
  - Test rate limiting
  - Test error handling

**Total Time:** ~20-30 hours

---

### 🟢 MEDIUM PRIORITY (Within 2 weeks)

- [ ] **Implement token refresh** (2-4 hours)
- [ ] **Add row-level security** (2-4 hours)
- [ ] **Implement key rotation** (4-6 hours)
- [ ] **Set up monitoring** (2-4 hours)
- [ ] **Document architecture** (2-4 hours)

---

## COMPLIANCE CHECKLIST FOR MONDAY.COM SUBMISSION

### Required Before Approval

- [ ] **1. Burp Scan Compliance** - ⚠️ NOT DONE
- [ ] **2. Storage dei Segreti** - ❌ CRITICAL ISSUE
- [ ] **3. Crittografia dei Token** - ⚠️ CRITICAL ISSUE
- [ ] **4. Storage Dati Utente** - ❌ CRITICAL ISSUE
- [ ] **5. Scopes Utilizzati** - ⚠️ PARTIALLY DONE
- [ ] **6. Logging e Retention** - ⚠️ CRITICAL ISSUE
- [ ] **7. Crittografia Data at Rest** - ❌ CRITICAL ISSUE
- [ ] **8. Protezione SQL Injection** - ✅ COMPLIANT
- [ ] **9. Validazione Input** - ⚠️ PARTIALLY DONE
- [ ] **10. Domain Ownership** - ⚠️ PARTIALLY DONE
- [ ] **11. Data Retention/Deletion** - ❌ NOT IMPLEMENTED
- [ ] **12. Cookie Security** - ✅ COMPLIANT (N/A - using JWT)
- [ ] **13. Autenticazione Sicura** - ✅ COMPLIANT
- [ ] **14. Hosting Information** - ✅ COMPLIANT
- [ ] **15. HTTPS e TLS** - ⚠️ CRITICAL ISSUE
- [ ] **16. Malware Scan** - ❌ NOT DONE
- [ ] **17. Domini e Servizi Terzi** - ⚠️ PARTIALLY DONE
- [ ] **18. Autenticazione Endpoint** - ❌ CRITICAL ISSUE

---

## SUPPORTING EVIDENCE & CODE REFERENCES

### Critical Issue: Plaintext Passwords

**File:** `models/IntegrationCredentials.js` (lines 80-84)

```javascript
static async encryptPassword(plainPassword) {
  // ENCRYPTION DISABLED FOR DEBUGGING
  if (false) {  // ❌ ENCRYPTION DISABLED!
    // Encrypt password with AES-256-CBC
    return encryptPassword(plainPassword);
  }
  return plainPassword;  // ❌ STORING PLAIN TEXT!
}
```

**Evidence:** Database query shows plaintext:
```sql
SELECT userId, arubaPassword FROM integration_credentials LIMIT 1;
-- Result: user@example.com password in plaintext
```

---

### Critical Issue: Exposed Secrets

**File:** `.env`

```env
MONDAY_SIGNING_SECRET=d722023b89262b8dc22227f3dcfa448a
DATABASE_URL=postgresql://postgres:Santini97!@...
ENCRYPTION_KEY=9d302675229d6e015e3cf85981c116e21402409bd6bed5fa8a8cf93d42704651
```

**Evidence:** File readable by anyone with access to repository

---

### Critical Issue: Missing Authentication

**File:** `routes/auth.js` (Missing verifyMonday)

```javascript
router.post('/monday/update-smtp/:userId', async (req, res) => {
  // ❌ NO AUTHENTICATION - Anyone can modify any user's SMTP!
});
```

**File:** `controllers/emailController.js`

```javascript
router.get('/debug/email-payloads', (req, res) => {
  // ❌ NO AUTHENTICATION - PII exposed!
  const payloads = JSON.parse(fs.readFileSync(logPath));
  return res.json(payloads);
});
```

---

### Critical Issue: CORS Configuration

**File:** `server.js`

```javascript
app.use(cors({
  origin: '*',  // ❌ ALLOWS ALL ORIGINS
  credentials: true
}));
```

---

## SUMMARY

This application has **solid architecture** but **critical security gaps** that must be fixed before any marketplace submission:

### ✅ Strengths:
- Using Prisma ORM (prevents SQL injection)
- JWT-based authentication (Monday-managed)
- Database encryption at rest (Supabase)
- Proper error handling
- Comprehensive logging infrastructure

### ❌ Critical Weaknesses:
- **Secrets exposed** in .env
- **Passwords plaintext** in database
- **Missing authentication** on sensitive endpoints
- **CORS misconfigured** (allows all origins)
- **No HTTPS enforcement**
- **No data deletion** workflow
- **PII in logs** without protection

### 📈 Estimated Effort:
- **Immediate Fixes (1 hour):** Enable encryption, fix CORS, add auth
- **Critical Fixes (20 hours):** Rotate secrets, implement deletion, sanitize logs
- **High Priority (20-30 hours):** Privacy policy, input validation, audit logging
- **Total:** ~45-50 hours of work

### 🎯 Recommended Path:
1. Fix immediate issues (1 hour)
2. Fix critical issues (20 hours)
3. Deploy to staging and test
4. Run Burp scan
5. Fix findings
6. Create documentation
7. Submit to Monday.com Marketplace

---

**Report Generated:** December 3, 2025
**Compliance Score:** 33% (4/18 requirements)
**Ready for Production:** ❌ **NO** (5 critical blockers)
**Ready for Marketplace:** ❌ **NO** (multiple critical issues)
