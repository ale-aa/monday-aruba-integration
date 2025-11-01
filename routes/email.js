const express = require('express');
const router = express.Router();
const EmailController = require('../controllers/emailController');
const verifyMonday = require('../middleware/verifyMonday');

/**
 * Route per l'invio di email via Aruba SMTP
 */

/**
 * POST /monday/sendEmail
 * Invia un'email usando le credenziali Aruba dell'utente
 *
 * Header richiesto:
 * - Authorization: Bearer <JWT_TOKEN>
 *
 * Body (application/json):
 * {
 *   "recipient_email": "user@example.com",
 *   "subject": "Email Subject",
 *   "body": "Email content",
 *   "cc": "cc@example.com" or ["cc1@example.com", "cc2@example.com"],
 *   "bcc": "bcc@example.com" or ["bcc1@example.com"]
 * }
 *
 * Risposta di Successo (200):
 * {
 *   "success": true,
 *   "message": "Email inviata con successo",
 *   "messageId": "...",
 *   "timestamp": "2025-11-01T...",
 *   "duration_ms": 1234,
 *   "details": {
 *     "from": "sender@aruba.it",
 *     "to": "recipient@example.com",
 *     "subject": "Subject"
 *   }
 * }
 *
 * Errore - Credenziali non configurate (401):
 * {
 *   "success": false,
 *   "error": "Credenziali non configurate",
 *   "message": "L'utente non ha configurato le credenziali Aruba..."
 * }
 *
 * Errore - Autenticazione SMTP fallita (401):
 * {
 *   "success": false,
 *   "error": "Autenticazione SMTP fallita",
 *   "message": "Le credenziali Aruba non sono valide..."
 * }
 *
 * Errore - Server SMTP non raggiungibile (503):
 * {
 *   "success": false,
 *   "error": "Server SMTP non raggiungibile",
 *   "message": "Il server Aruba SMTP non è raggiungibile..."
 * }
 */
router.post('/monday/sendEmail', verifyMonday, EmailController.sendEmail.bind(EmailController));

/**
 * POST /monday/testSMTP
 * Testa la configurazione SMTP dell'utente
 *
 * Header richiesto:
 * - Authorization: Bearer <JWT_TOKEN>
 *
 * Risposta di Successo (200):
 * {
 *   "success": true,
 *   "message": "Configurazione SMTP valida",
 *   "details": {
 *     "host": "mail.aruba.it",
 *     "port": 465,
 *     "email": "user@aruba.it"
 *   }
 * }
 *
 * Errore - Credenziali non configurate (401):
 * {
 *   "success": false,
 *   "error": "Credenziali non configurate"
 * }
 *
 * Errore - Configurazione SMTP non valida (401):
 * {
 *   "success": false,
 *   "error": "Configurazione SMTP non valida",
 *   "message": "Invalid login credentials..."
 * }
 */
router.post('/monday/testSMTP', verifyMonday, EmailController.testSMTP.bind(EmailController));

module.exports = router;
