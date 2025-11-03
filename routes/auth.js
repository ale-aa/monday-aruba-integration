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

/**
 * POST /monday/update-credentials/:userId
 * Aggiorna le credenziali complete (email, password, SMTP settings)
 *
 * Parametri URL:
 * - userId: ID utente Monday.com
 *
 * Body:
 * {
 *   "aruba_email": "user@aruba.it" (obbligatorio),
 *   "aruba_password": "password123" (obbligatorio),
 *   "smtp_host": "smtp.aruba.it" (opzionale, default: smtp.aruba.it),
 *   "smtp_port": 465 (opzionale, default: 465)
 * }
 *
 * Risposta:
 * {
 *   "success": true/false,
 *   "message": "Credentials updated successfully",
 *   "email": "user@aruba.it",
 *   "smtp_host": "smtp.aruba.it",
 *   "smtp_port": 465
 * }
 */
router.post('/monday/update-credentials/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { aruba_email, aruba_password, smtp_host, smtp_port } = req.body;

  try {
    console.log('[UpdateCredentials] Updating credentials for userId:', userId);

    // Validazione input
    if (!aruba_email || !aruba_password) {
      console.warn('[UpdateCredentials] Missing required fields: aruba_email or aruba_password');
      return res.status(400).json({
        success: false,
        error: 'aruba_email and aruba_password are required'
      });
    }

    // Validazione email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(aruba_email)) {
      console.warn('[UpdateCredentials] Invalid email format:', aruba_email);
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const IntegrationCredentials = require('../models/IntegrationCredentials');

    // Aggiorna nel database
    const updateData = {
      aruba_email,
      aruba_password, // Il model gestisce la criptazione
      smtp_host: smtp_host || 'smtp.aruba.it',
      smtp_port: smtp_port || 465
    };

    console.log('[UpdateCredentials] Update data prepared for userId:', userId);

    await IntegrationCredentials.update(userId, updateData);

    console.log('[UpdateCredentials] Credentials updated successfully for userId:', userId);

    return res.status(200).json({
      success: true,
      message: 'Credentials updated successfully',
      email: aruba_email,
      smtp_host: updateData.smtp_host,
      smtp_port: updateData.smtp_port
    });
  } catch (error) {
    console.error('[UpdateCredentials] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /monday/check-credentials/:userId
 * Legge le credenziali di un utente (SENZA mostrare la password)
 *
 * Parametri URL:
 * - userId: ID utente Monday.com
 *
 * Risposta (credenziali trovate):
 * {
 *   "success": true,
 *   "credentials": {
 *     "userId": "95416079",
 *     "email": "user@aruba.it",
 *     "smtp_host": "smtp.aruba.it",
 *     "smtp_port": 465,
 *     "hasPassword": true,
 *     "passwordLength": 64,
 *     "created_at": "2025-11-01T10:00:00Z",
 *     "updated_at": "2025-11-03T15:30:00Z"
 *   }
 * }
 *
 * Risposta (credenziali non trovate):
 * {
 *   "success": false,
 *   "message": "No credentials found"
 * }
 */
router.get('/monday/check-credentials/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    console.log('[CheckCredentials] Checking credentials for userId:', userId);

    const IntegrationCredentials = require('../models/IntegrationCredentials');
    const credentials = await IntegrationCredentials.findByUserId(userId);

    if (!credentials) {
      console.warn('[CheckCredentials] No credentials found for userId:', userId);
      return res.status(200).json({
        success: false,
        message: 'No credentials found'
      });
    }

    console.log('[CheckCredentials] Credentials found for userId:', userId);

    // Ritorna credenziali SENZA mostrare la password
    return res.status(200).json({
      success: true,
      credentials: {
        userId: credentials.userId,
        email: credentials.aruba_email,
        smtp_host: credentials.smtp_host,
        smtp_port: credentials.smtp_port,
        hasPassword: !!credentials.aruba_password,
        created_at: credentials.created_at,
        updated_at: credentials.updated_at
      }
    });
  } catch (error) {
    console.error('[CheckCredentials] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /monday/delete-credentials/:userId
 * Elimina le credenziali di un utente
 *
 * Parametri URL:
 * - userId: ID utente Monday.com
 *
 * Risposta:
 * {
 *   "success": true/false,
 *   "message": "Credentials deleted successfully" / error message
 * }
 */
router.delete('/monday/delete-credentials/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    console.log('[DeleteCredentials] Deleting credentials for userId:', userId);

    const IntegrationCredentials = require('../models/IntegrationCredentials');

    // Validazione input
    if (!userId) {
      console.warn('[DeleteCredentials] Missing userId parameter');
      return res.status(400).json({
        success: false,
        error: 'userId è obbligatorio'
      });
    }

    // Elimina le credenziali dal database
    const deleted = await IntegrationCredentials.delete(userId);

    if (!deleted) {
      console.warn('[DeleteCredentials] No credentials found to delete for userId:', userId);
      return res.status(404).json({
        success: false,
        message: 'No credentials found for this user'
      });
    }

    console.log('[DeleteCredentials] Credentials deleted successfully for userId:', userId);

    return res.status(200).json({
      success: true,
      message: 'Credentials deleted successfully'
    });
  } catch (error) {
    console.error('[DeleteCredentials] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /monday/create-credentials/:userId
 * Crea nuove credenziali Aruba per un utente
 *
 * Parametri URL:
 * - userId: ID utente Monday.com
 *
 * Body:
 * {
 *   "aruba_email": "user@aruba.it" (obbligatorio),
 *   "aruba_password": "password123" (obbligatorio),
 *   "smtp_host": "smtp.aruba.it" (opzionale, default: smtp.aruba.it),
 *   "smtp_port": 465 (opzionale, default: 465)
 * }
 *
 * Risposta (successo):
 * {
 *   "success": true,
 *   "message": "Credentials created successfully",
 *   "email": "user@aruba.it",
 *   "smtp_host": "smtp.aruba.it",
 *   "smtp_port": 465
 * }
 *
 * Risposta (errore):
 * {
 *   "success": false,
 *   "error": "error message"
 * }
 */
router.post('/monday/create-credentials/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { aruba_email, aruba_password, smtp_host, smtp_port } = req.body;

  try {
    console.log('[CreateCredentials] Creating credentials for userId:', userId);

    // Validazione input
    if (!aruba_email || !aruba_password) {
      console.warn('[CreateCredentials] Missing required fields: aruba_email or aruba_password');
      return res.status(400).json({
        success: false,
        error: 'aruba_email and aruba_password are required'
      });
    }

    // Validazione email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(aruba_email)) {
      console.warn('[CreateCredentials] Invalid email format:', aruba_email);
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const IntegrationCredentials = require('../models/IntegrationCredentials');

    // Elimina credenziali esistenti se presenti (per evitare unique constraint)
    try {
      const deleted = await IntegrationCredentials.delete(userId);
      if (deleted) {
        console.log('[CreateCredentials] Deleted existing credentials for userId:', userId);
      }
    } catch (deleteError) {
      console.log('[CreateCredentials] No existing credentials to delete for userId:', userId);
    }

    // Crea nuove credenziali
    const credentials = await IntegrationCredentials.create({
      userId,
      accountId: '32281405', // Account ID fisso per Monday.com
      aruba_email,
      aruba_password,
      smtp_host: smtp_host || 'smtp.aruba.it',
      smtp_port: smtp_port || 465
    });

    console.log('[CreateCredentials] Credentials created successfully for userId:', userId);

    return res.status(201).json({
      success: true,
      message: 'Credentials created successfully',
      email: aruba_email,
      smtp_host: credentials.smtpHost,
      smtp_port: credentials.smtpPort
    });
  } catch (error) {
    console.error('[CreateCredentials] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
