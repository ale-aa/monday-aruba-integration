# Privacy Policy

**Last Updated:** December 3, 2025

---

## 1. Overview

This Privacy Policy explains how the Monday.com Email Automation Integration ("App", "We", "Our", or "Us") collects, uses, discloses, and otherwise processes personal information in connection with our services.

The App is designed to help users send automated emails through their Monday.com workspace using Aruba SMTP infrastructure. We are committed to protecting your privacy and ensuring you have a positive experience on our platform.

---

## 2. Information We Collect

### 2.1 Information You Provide Directly

We collect the following information when you use our App:

- **Monday.com Account Information**: Your Monday.com user ID and account ID
- **Email Credentials**: Your Aruba SMTP email address and password (encrypted)
- **Email Content**: Email subject lines, body text, and recipient email addresses
- **Usage Data**: Records of automation executions, including timestamps and status

### 2.2 Information Collected Automatically

When you interact with the App, we automatically collect:

- **Log Data**: Request/response logs with timestamps and status codes
- **Error Information**: Error messages and stack traces for debugging
- **API Metrics**: Performance data and API call statistics

### 2.3 Information from Third Parties

We may receive information from:

- **Monday.com**: Your account ID, user ID, and workspace information (via OAuth)
- **Aruba SMTP Server**: Email delivery status and bounce notifications

---

## 3. How We Use Your Information

We use the collected information for the following purposes:

### 3.1 Core Service Delivery
- Authenticate your requests to Monday.com and Aruba
- Send automated emails on your behalf
- Store your email credentials securely
- Process template substitutions with column data

### 3.2 Service Improvement
- Identify and fix technical bugs and issues
- Monitor system performance and reliability
- Analyze usage patterns to improve features
- Debug delivery failures and troubleshoot problems

### 3.3 Security & Compliance
- Detect and prevent unauthorized access
- Comply with legal and regulatory requirements
- Respond to law enforcement requests
- Maintain audit trails for compliance purposes

### 3.4 Communication
- Send service announcements about outages or updates
- Respond to support requests
- Notify you of security incidents

---

## 4. Data Storage & Security

### 4.1 Where We Store Data

**Primary Storage**: Supabase PostgreSQL Database (Stockholm, Sweden - EU Region)
- This ensures your data remains within the European Union in compliance with GDPR
- Database is encrypted at rest with industry-standard encryption

**Log Storage**: Encrypted log files stored on application server
- Error logs retained for 90 days
- Audit logs retained for 1 year
- Automatic log rotation at 10MB per file

**Backup**: Automatic daily backups to Supabase cloud backup system

### 4.2 Data Encryption

- **At Rest**: AES-256-CBC encryption for email credentials
- **In Transit**: TLS 1.2 or higher for all network communications
- **Passwords**: Hashed using bcrypt with salt
- **Logs**: Automatically sanitized to remove PII

### 4.3 Access Controls

- Role-based access control (RBAC) on database
- API authentication via JWT tokens
- Session-based authentication for user sessions
- Rate limiting on all endpoints (3 requests/second for general API)

---

## 5. Data Retention & Deletion

### 5.1 Retention Periods

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Email Credentials | 10 days after app uninstall | Monday.com requirement |
| Audit Logs | 1 year | Compliance & forensics |
| Error Logs | 90 days | Debugging & troubleshooting |
| Deletion Records | 1 year | Proof of deletion |
| User Sessions | 24 hours | Security |

### 5.2 Automatic Deletion Process

When you uninstall the App from your Monday.com workspace:

1. **Day 1**: We receive the `app-uninstall` webhook from Monday.com
2. **Day 1**: Your credentials are marked for deletion (scheduled for Day 10)
3. **Day 10**: Automatic cron job processes the deletion:
   - Your email credentials are permanently deleted
   - Old audit logs (>90 days) are purged
   - Deletion is recorded in audit log with timestamp
   - Status is marked as `DELETED`

### 5.3 User-Requested Deletion

You can request immediate deletion of your data at any time:

1. Submit a deletion request through the App or contact us
2. Your data is deleted within 24 hours
3. Deletion confirmation is sent to your email
4. Deletion is recorded in audit log with timestamp

### 5.4 What Gets Deleted

- ✅ Email credentials (passwords)
- ✅ Integration configuration
- ✅ Audit logs older than 90 days
- ✅ Error logs
- ❌ Deletion record itself (kept for 1 year for compliance)

---

## 6. Data Sharing & Disclosure

### 6.1 We Do NOT Share Your Data With

- Third-party analytics services
- Marketing or advertising networks
- Data brokers or data aggregators
- Unaffiliated companies (except as required by law)

### 6.2 We MAY Share Your Data With

**Service Providers**:
- Supabase (Database hosting)
- Monday.com (Workspace data)
- Aruba (Email delivery)

**Legal Requirements**:
- Law enforcement (with valid court order)
- Regulatory authorities (for compliance)
- Corporate transactions (in case of merger/acquisition)

**With Your Consent**:
- When you explicitly authorize sharing

---

## 7. Your Privacy Rights

### 7.1 GDPR Rights (EU Residents)

Under the General Data Protection Regulation (GDPR), you have the right to:

| Right | What It Means |
|-------|---------------|
| **Access (Article 15)** | Request a copy of your personal data we hold |
| **Rectification (Article 16)** | Correct inaccurate data |
| **Erasure (Article 17)** | Request deletion of your data ("Right to be Forgotten") |
| **Restrict Processing (Article 18)** | Limit how we use your data |
| **Data Portability (Article 20)** | Receive your data in a portable format |
| **Object (Article 21)** | Oppose certain types of processing |
| **Not Be Subject to Automated Decisions (Article 22)** | Opt-out of automated profiling |

### 7.2 CCPA Rights (California Residents)

Under the California Consumer Privacy Act (CCPA), you have the right to:

| Right | What It Means |
|-------|---------------|
| **Know** | Know what personal information is collected and used |
| **Delete** | Request deletion of personal information collected |
| **Opt-Out** | Opt-out of the sale/sharing of personal information |
| **Non-Discrimination** | Not receive discriminatory treatment for exercising rights |

### 7.3 LGPD Rights (Brazil Residents)

Under the Brazilian General Data Protection Law (LGPD), you have the right to:

- Access your personal data
- Request correction or deletion
- Request confirmation of processing
- Know the legal basis for processing
- Withdraw consent at any time

### 7.4 How to Exercise Your Rights

To exercise any of these rights, please contact us at:

**Email**: support@yourapp.com
**Response Time**: Within 30 days (GDPR), 45 days (CCPA), or 15 days (LGPD)

We will verify your identity before processing any request.

---

## 8. Data Subject Requests

### 8.1 Data Access Request

**Request**: "I want a copy of my personal data"

**What You Get**:
- All stored credentials and configuration
- Complete audit log of your activity
- List of all automations created
- Logs of email sends

**Format**: JSON, CSV, or PDF
**Timeline**: 30 days

**Endpoint**: `GET /api/user/data`

### 8.2 Data Deletion Request

**Request**: "I want my data deleted"

**What Gets Deleted**:
- Email credentials
- Integration configuration
- Automation history
- Old audit logs (>90 days)

**Timeline**: 24 hours for immediate deletion, 10 days for automatic deletion
**Endpoint**: `DELETE /api/user/data`

### 8.3 Data Rectification Request

**Request**: "I want to correct my information"

**Process**:
1. Contact us with correction details
2. We verify your identity
3. We update the information
4. We log the change in audit trail

**Timeline**: 7 days
**Endpoint**: `PATCH /api/user/profile`

### 8.4 Portability Request

**Request**: "I want my data in a portable format"

**What You Get**:
- All your data exported as JSON
- All email credentials (masked)
- Complete automation history
- Full audit log

**Format**: ZIP file with JSON documents
**Timeline**: 15 days
**Endpoint**: `POST /api/user/export`

---

## 9. Cookies & Tracking

### 9.1 Cookies Used

| Cookie Name | Purpose | Lifetime |
|------------|---------|----------|
| `session_id` | Maintain user session | 24 hours |
| `csrf_token` | Prevent CSRF attacks | Session |
| `preferences` | Remember user preferences | 30 days |

### 9.2 Third-Party Cookies

We do NOT use:
- Google Analytics or similar trackers
- Advertising cookies
- Social media pixels
- Behavioral tracking

### 9.3 Do Not Track

We respect the "Do Not Track" (DNT) signal in your browser. We do not collect behavioral data or serve targeted ads.

---

## 10. Children's Privacy

The App is not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected information from a child under 13, we will delete such information promptly.

---

## 11. International Data Transfers

### 11.1 EU to Non-EU Transfers

If your data is transferred outside the EU (except for Supabase in Stockholm which is within EU):

- Transfers are based on Standard Contractual Clauses (SCCs)
- Adequate safeguards are in place
- You have rights to object to such transfers

### 11.2 Data Localization

Your data is primarily stored in:
- **Supabase PostgreSQL**: Stockholm, Sweden (EU Region)
- **Application Logs**: US Region (with encryption)

---

## 12. Third-Party Links

The App may contain links to third-party websites and services (e.g., Monday.com, Aruba):

- We are not responsible for their privacy practices
- We recommend reviewing their privacy policies
- Your use of third-party services is governed by their terms

---

## 13. Security Measures

### 13.1 Security Standards

- **SSL/TLS Encryption**: All data in transit is encrypted
- **Database Encryption**: AES-256 encryption at rest
- **Password Hashing**: bcrypt with 12-round salt
- **API Authentication**: JWT tokens with expiration
- **Rate Limiting**: Protection against brute-force attacks

### 13.2 Security Incident Response

In the event of a security breach:

1. **Immediate**: We isolate affected systems
2. **Within 24 hours**: We notify affected users
3. **Within 72 hours**: We report to relevant authorities (if required)
4. **Follow-up**: We provide guidance on protective measures

### 13.3 Your Security Responsibilities

- Keep your Monday.com password secure
- Don't share your Aruba email credentials
- Log out of the App when not in use
- Use strong, unique passwords

---

## 14. California Privacy Rights (CPRA)

In addition to CCPA rights, California residents also have these CPRA rights:

| Right | What It Means |
|-------|---------------|
| **Correct** | Request correction of inaccurate data |
| **Delete** | Request deletion of collected data |
| **Opt-Out of Sale** | Opt-out of sale of personal information |
| **Limit Use** | Limit use of sensitive personal information |
| **Appeal** | Appeal our denial of your request |

---

## 15. EU Representative

For EU residents, our Data Protection Representative is:

**DPR Contact**: [Your DPR Contact Information]
**Address**: [EU Office Address]
**Email**: dpr@yourapp.com
**Phone**: [EU Phone Number]

---

## 16. Changes to This Privacy Policy

We may update this Privacy Policy to reflect changes in our practices or for other reasons. We will notify you by:

- Posting the new Privacy Policy on the App
- Sending an email notification
- Requiring your consent (if required by law)

**Effective Date of Changes**: Posted at the top of this document

---

## 17. Contact Us

If you have questions about this Privacy Policy or your privacy, please contact us:

**Email**: privacy@yourapp.com
**Mailing Address**: [Your Company Address]
**Phone**: [Your Phone Number]
**Response Time**: Within 7 business days

### 17.1 Data Protection Authority

If you believe we have violated your privacy rights, you can file a complaint with your local Data Protection Authority:

- **EU**: Your national DPA
- **California**: California Attorney General
- **Brazil**: Autoridade Nacional de Proteção de Dados (ANPD)

---

**Last Updated**: December 3, 2025
**Version**: 1.0
**Status**: Active
