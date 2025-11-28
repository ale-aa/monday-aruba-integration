const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const verifyMonday = require('../middleware/verifyMonday');
const EmailController = require('../controllers/emailController');

/**
 * POST /monday/fetchFieldDefs
 * Returns field definitions for Monday.com Dynamic Mapping Field
 *
 * Called by Monday when opening the field selector in the automation builder
 * This endpoint defines what columns/fields are available for selection
 *
 * Header richiesto:
 * - Authorization: Bearer <JWT_TOKEN> (verificato da verifyMonday middleware)
 *
 * Risposta (200):
 * {
 *   "kind": "field_definitions",
 *   "fields": [
 *     {
 *       "id": "dynamic_email",
 *       "title": "Email column",
 *       "type": "column",
 *       "allowed_column_types": ["email"],
 *       "required": true
 *     }
 *   ]
 * }
 */
router.post('/monday/fetchFieldDefs', verifyMonday, (req, res) => {
  console.log('[FieldDefs] Request body:', JSON.stringify(req.body, null, 2));

  res.status(200).json({
    kind: 'field_definitions',
    fields: [
      {
        id: 'dynamic_email',
        title: 'Email column',
        type: 'column',
        allowed_column_types: ['email'],
        required: true
      }
    ]
  });
});

/**
 * POST /monday/sendEmail
 * Invia un'email usando SMTP di Aruba
 *
 * ═══════════════════════════════════════════════════════════════════════
 * HOW TO CONFIGURE IN MONDAY.COM RECIPE BUILDER
 * ═══════════════════════════════════════════════════════════════════════
 *
 * This endpoint supports dynamic column selection via fetchFieldDefs:
 *
 * 1. Create an automation in Monday
 *    Trigger: Item Updated (or Custom Button)
 *    Action: Send Custom Request
 *
 * 2. Configure the Custom Request:
 *    URL: https://your-app.com/monday/sendEmail
 *    Method: POST
 *    Authorization: Bearer <JWT_TOKEN>
 *
 * 3. In the recipe sentence, add field selector:
 *    {dynamic_email, column} - This will show a column picker UI
 *    Users can select any email column from their board
 *
 * 4. When automation runs:
 *    - Monday passes the selected columnId in the payload
 *    - Backend uses GraphQL to fetch the column value for that item
 *    - Email is extracted from column_values (text or value field)
 *    - SMTP sends the email via Aruba
 *
 * ═══════════════════════════════════════════════════════════════════════
 * DELIVERY METHODS
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Method 1: Direct Input Field (Fast)
 * • Monday passes selected column value directly in inboundFieldValues
 * • No additional GraphQL query needed
 * • Single HTTP request
 * • Performance: FAST ⚡
 *
 * Method 2: Column ID + GraphQL Fallback (Reliable)
 * • If Method 1 not available, uses itemId + columnId
 * • Queries Monday GraphQL API to fetch column data
 * • Returns text (display value) and value (raw data)
 * • Two HTTP requests (slower but always works)
 * • Performance: MEDIUM ⚡⚡
 *
 * ═══════════════════════════════════════════════════════════════════════
 * REQUEST & RESPONSE
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Header richiesto:
 * - Authorization: Bearer <JWT_TOKEN>
 *
 * Body (application/json):
 * {
 *   "inboundFieldValues": {
 *     "dynamic_email": "recipient@example.com",    // Method 1: Direct value
 *     "email": {
 *       "subject": "Email Subject",
 *       "body": "Email content"
 *     }
 *   },
 *   "itemId": 12345,                                // Method 2: GraphQL params
 *   "columnId": "email_column_id"
 * }
 *
 * Risposta di Successo (200):
 * {
 *   "success": true,
 *   "message": "Email inviata con successo",
 *   "messageId": "...",
 *   "provider": "aruba_smtp",
 *   "from": "your_email@aruba.it",
 *   "to": "recipient@example.com",
 *   "timestamp": "2025-11-27T...",
 *   "duration_ms": 1234
 * }
 *
 * Errore - Credenziali mancanti (401):
 * {
 *   "success": false,
 *   "error": "Credenziali Aruba non trovate. Accedi con le tue credenziali.",
 *   "code": "NO_CREDENTIALS"
 * }
 *
 * Errore - Email non valida (400):
 * {
 *   "success": false,
 *   "error": "Email destinatario non trovata o non valida",
 *   "code": "INVALID_EMAIL"
 * }
 *
 * Errore - Invio fallito (503):
 * {
 *   "success": false,
 *   "error": "Server SMTP non raggiungibile",
 *   "code": "SMTP_ERROR"
 * }
 * ═══════════════════════════════════════════════════════════════════════
 */
router.post('/monday/sendEmail', verifyMonday, (req, res) => EmailController.sendEmail(req, res));

/**
 * GET /debug/email-payloads
 * Legge i payload ricevuti da Monday per debugging
 */
router.get('/debug/email-payloads', (req, res) => {
  try {
    const logFile = path.join(process.cwd(), 'logs', 'email-payloads.json');
    if (!fs.existsSync(logFile)) {
      return res.status(200).json({
        message: 'No payloads logged yet',
        payloads: []
      });
    }
    const content = fs.readFileSync(logFile, 'utf8');
    const payloads = JSON.parse(content || '[]');
    res.status(200).json({
      count: payloads.length,
      payloads: payloads.slice(-10) // Ultimi 10
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;
