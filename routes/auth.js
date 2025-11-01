const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const verifyMonday = require('../middleware/verifyMonday');

/**
 * Route di autenticazione per Monday.com
 */

/**
 * GET /credentials/create
 * Mostra il form di creazione/modifica credenziali Aruba
 *
 * Query parameters:
 * - token: JWT token da decodificare (firmato con SIGNING_SECRET di Monday.com)
 *   Payload contiene: userId, accountId, backToUrl
 *
 * Comportamento:
 * - Se credenziali già esistono per questo userId: redirect immediato a backToUrl
 * - Se non esistono: mostra form HTML per configurarle
 *
 * Segue lo standard Monday.com "Credentials Field"
 */
router.get('/credentials/create', AuthController.createCredentials);

/**
 * POST /credentials/save
 * Salva o aggiorna le credenziali Aruba per l'utente
 *
 * Body parameters:
 * - userId: Monday user ID
 * - accountId: Monday account ID
 * - email: Email Aruba (obbligatorio)
 * - password: Password Aruba (obbligatorio)
 * - smtp_host: Server SMTP (opzionale, default: mail.aruba.it)
 * - smtp_port: Porta SMTP (opzionale, default: 465)
 * - backToUrl: URL di ritorno a Monday.com (dal JWT payload)
 *
 * Risposta:
 * - Redirect a backToUrl (HTTP 302)
 */
router.post('/credentials/save', AuthController.saveCredentials);

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
