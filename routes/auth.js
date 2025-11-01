const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const verifyMonday = require('../middleware/verifyMonday');

/**
 * Route di autenticazione per Monday.com
 */

/**
 * GET /monday/authorize
 * Mostra il form di autorizzazione per configurare le credenziali Aruba
 *
 * Query parameters:
 * - token: JWT token da decodificare (CLIENT_SECRET)
 * - backToUrl: URL di ritorno dopo il salvataggio
 */
router.get('/monday/authorize', AuthController.authorizeForm);

/**
 * POST /monday/save-credentials
 * Salva le credenziali Aruba per l'utente
 *
 * Body parameters:
 * - userId: Monday user ID
 * - accountId: Monday account ID
 * - email: Email Aruba
 * - password: Password Aruba
 * - smtp_host: Server SMTP (opzionale)
 * - smtp_port: Porta SMTP (opzionale)
 * - backToUrl: URL di ritorno (opzionale)
 */
router.post('/monday/save-credentials', AuthController.saveCredentials);

/**
 * POST /monday/getUserCredentials
 * Recupera le credenziali dell'utente autenticato
 *
 * Header richiesto:
 * - Authorization: Bearer <JWT_TOKEN>
 *
 * Risposta:
 * {
 *   exists: true/false,
 *   userId: "user_123",
 *   accountId: "acc_123",
 *   email: "user@aruba.it",
 *   smtp_host: "mail.aruba.it",
 *   smtp_port: 465,
 *   created_at: "2025-11-01...",
 *   updated_at: "2025-11-01..."
 * }
 */
router.post('/monday/getUserCredentials', verifyMonday, AuthController.getUserCredentials);

/**
 * POST /monday/deleteUserCredentials
 * Elimina le credenziali dell'utente autenticato
 *
 * Header richiesto:
 * - Authorization: Bearer <JWT_TOKEN>
 */
router.post('/monday/deleteUserCredentials', verifyMonday, AuthController.deleteUserCredentials);

module.exports = router;
