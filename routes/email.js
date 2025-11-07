const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const verifyMonday = require('../middleware/verifyMonday');
const EmailController = require('../controllers/emailController');

/**
 * POST /monday/sendEmail
 * Invia un'email usando Resend API
 *
 * Header richiesto:
 * - Authorization: Bearer <JWT_TOKEN>
 *
 * Body (application/json):
 * {
 *   "recipient_email": "user@example.com",
 *   "subject": "Email Subject",
 *   "body": "Email content"
 * }
 *
 * Risposta di Successo (200):
 * {
 *   "success": true,
 *   "message": "Email inviata con successo tramite Resend",
 *   "messageId": "...",
 *   "provider": "resend",
 *   "timestamp": "2025-11-01T...",
 *   "duration_ms": 1234
 * }
 *
 * Errore - Parametri mancanti (400):
 * {
 *   "success": false,
 *   "error": "recipient_email è obbligatorio"
 * }
 *
 * Errore - Invio fallito (500):
 * {
 *   "success": false,
 *   "error": "Impossibile inviare email",
 *   "message": "...",
 *   "provider": "resend"
 * }
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
