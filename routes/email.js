const express = require('express');
const router = express.Router();
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

module.exports = router;
