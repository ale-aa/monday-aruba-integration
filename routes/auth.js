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
 * POST /credentials/get
 * Recupera credenziali per il dropdown Credentials Field di Monday.com
 *
 * Header richiesto:
 * - Authorization: Bearer <JWT_TOKEN>
 *
 * Risposta (Credentials Field format):
 * [
 *   {
 *     title: "Account Aruba - email@aruba.it",
 *     value: "user_id"
 *   }
 * ]
 * oppure [] se nessuna credenziale
 */
router.post('/credentials/get', verifyMonday, AuthController.getCredentials);

/**
 * POST /credentials/delete
 * Elimina credenziali dell'utente
 *
 * Header richiesto:
 * - Authorization: Bearer <JWT_TOKEN>
 *
 * Risposta:
 * {
 *   success: true/false,
 *   message: "Credenziali eliminate con successo" / "Credenziali non trovate"
 * }
 */
router.post('/credentials/delete', verifyMonday, AuthController.deleteCredentials);

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

/**
 * POST /monday/update-smtp/:userId
 * Aggiorna le impostazioni SMTP per un utente
 *
 * Parametri URL:
 * - userId: ID utente Monday.com
 *
 * Body:
 * {
 *   "smtp_host": "smtp.aruba.it" (opzionale, default: smtp.aruba.it),
 *   "smtp_port": 465 (opzionale, default: 465)
 * }
 *
 * Risposta:
 * {
 *   "success": true/false,
 *   "message": "SMTP settings updated",
 *   "smtp_host": "smtp.aruba.it",
 *   "smtp_port": 465
 * }
 */
router.post('/monday/update-smtp/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { smtp_host, smtp_port } = req.body;

  try {
    const IntegrationCredentials = require('../models/IntegrationCredentials');

    // Validazione input
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId è obbligatorio'
      });
    }

    // Usa valori di default se non forniti
    const updateData = {};
    if (smtp_host) {
      updateData.smtp_host = smtp_host;
    } else {
      updateData.smtp_host = 'smtp.aruba.it';
    }

    if (smtp_port) {
      updateData.smtp_port = parseInt(smtp_port);
    } else {
      updateData.smtp_port = 465;
    }

    console.log(`[AuthController] Updating SMTP settings for user ${userId}:`, updateData);

    // Aggiorna le credenziali nel database
    await IntegrationCredentials.update(userId, updateData);

    console.log(`[AuthController] SMTP settings updated successfully for user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'SMTP settings updated',
      smtp_host: updateData.smtp_host,
      smtp_port: updateData.smtp_port
    });
  } catch (error) {
    console.error(`[AuthController] Error updating SMTP settings: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
