const IntegrationCredentials = require('../models/IntegrationCredentials');
const { logAuthSuccess, logAuthFailure } = require('../middleware/authLogger');
const EmailService = require('../services/emailService');
const fs = require('fs');
const path = require('path');
const emailService = new EmailService();

// Helper per salvare payload in file
function savePayloadLog(payload, userId) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      userId,
      payload
    };
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'email-payloads.json');
    let logs = [];
    if (fs.existsSync(logFile)) {
      const existing = fs.readFileSync(logFile, 'utf8');
      logs = JSON.parse(existing || '[]');
    }
    logs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    console.log('[EmailController] Payload saved to file');
  } catch (err) {
    console.error('[EmailController] Error saving payload:', err.message);
  }
}

/**
 * Controller per gestire l'invio di email tramite SMTP di Aruba
 * NOTA: Su Monday Code non è bloccato l'accesso alle porte SMTP
 */
class EmailController {
  /**
   * Valida i parametri email
   */
  static validateEmailParams(params) {
    const { recipient_email, subject, body } = params;

    if (!recipient_email) {
      throw new Error('recipient_email è obbligatorio');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient_email)) {
      throw new Error('recipient_email non è valido');
    }

    if (!subject) {
      throw new Error('subject è obbligatorio');
    }

    if (!body) {
      throw new Error('body è obbligatorio');
    }
  }

  /**
   * Invia un'email usando SMTP di Aruba
   * POST /monday/sendEmail
   */
  static async sendEmail(req, res) {
    const startTime = Date.now();
    let userId;

    try {
      // Estrai userId dal JWT
      const rawUserId = req.monday?.userId;
      userId = String(rawUserId);

      console.log('=============================================');
      console.log('SEND EMAIL - ARUBA SMTP');
      console.log('=============================================');
      console.log('UserId:', userId);
      console.log('Payload:', JSON.stringify(req.body, null, 2));

      // Salva il payload per debugging
      savePayloadLog(req.body, userId);

      if (!userId || userId === 'undefined') {
        return res.status(400).json({
          success: false,
          error: 'User ID mancante'
        });
      }

      // Estrai campi da payload Monday
      const payload = req.body.payload || req.body;
      const inputFields = req.body.inputFields || payload.inputFields || {};
      const inboundFieldValues = req.body.inboundFieldValues || payload.inboundFieldValues || {};

      console.log('[EmailController] inboundFieldValues:', JSON.stringify(inboundFieldValues, null, 2));
      console.log('[EmailController] inputFields:', JSON.stringify(inputFields, null, 2));
      console.log('[EmailController] req.body keys:', Object.keys(req.body));

      // DEBUG: Mostra TUTTI i campi inviati da Monday
      console.log('[EmailController] ========== MONDAY PAYLOAD ANALYSIS ==========');
      console.log('[EmailController] Payload keys:', Object.keys(payload));
      if (inboundFieldValues) {
        console.log('[EmailController] inboundFieldValues keys:', Object.keys(inboundFieldValues));
        Object.entries(inboundFieldValues).forEach(([key, value]) => {
          console.log(`[EmailController]   - ${key}:`, typeof value === 'object' ? JSON.stringify(value) : value);
        });
      }
      console.log('[EmailController] ================================================');

      // ESTRAZIONE EMAIL DESTINATARIO
      let recipient_email =
        inboundFieldValues.email ||
        inboundFieldValues.recipient_email ||
        inboundFieldValues.to ||
        inputFields.email ||
        inputFields.recipient_email ||
        req.body.recipient_email ||
        null;

      // Se è oggetto, estrai il valore
      if (recipient_email && typeof recipient_email === 'object') {
        recipient_email = recipient_email.value || recipient_email.email || recipient_email.text;
      }

      // Fallback: cerca in tutte le chiavi di inboundFieldValues
      if (!recipient_email && inboundFieldValues) {
        for (const [key, value] of Object.entries(inboundFieldValues)) {
          if (value && typeof value === 'string' && value.includes('@')) {
            recipient_email = value;
            console.log(`[EmailController] Found email in key "${key}":`, recipient_email);
            break;
          }
        }
      }

      recipient_email = String(recipient_email || '').trim();

      // ESTRAZIONE SUBJECT
      let subject =
        inboundFieldValues.subject ||
        (inboundFieldValues.email && inboundFieldValues.email.subject) ||
        inputFields.subject ||
        req.body.subject ||
        'Email da Monday.com';

      if (subject && typeof subject === 'object') {
        subject = subject.value || subject.text || subject.message;
      }
      subject = String(subject).trim();

      // ESTRAZIONE BODY
      let body =
        inboundFieldValues.body ||
        (inboundFieldValues.email && inboundFieldValues.email.body) ||
        inboundFieldValues.message ||
        (inboundFieldValues.email && inboundFieldValues.email.message) ||
        inboundFieldValues.text ||
        (inboundFieldValues.email && inboundFieldValues.email.text) ||
        inputFields.body ||
        inputFields.message ||
        req.body.body ||
        'Messaggio da Monday.com';

      if (body && typeof body === 'object') {
        body = body.value || body.text || body.message;
      }
      body = String(body).trim();

      console.log('[EmailController] Extracted fields:');
      console.log('  - recipient:', recipient_email);
      console.log('  - subject:', subject);
      console.log('  - body:', body.substring(0, 100));

      // Validazione
      if (!recipient_email) {
        console.error('[EmailController] recipient_email mancante!');
        return res.status(400).json({
          success: false,
          error: 'recipient_email è obbligatorio',
          debug: {
            inboundFieldValues,
            inputFields
          }
        });
      }

      try {
        this.validateEmailParams({ recipient_email, subject, body });
      } catch (validationError) {
        console.warn(`[EmailController] Validazione fallita: ${validationError.message}`);
        return res.status(400).json({
          success: false,
          error: validationError.message
        });
      }

      // Recupera credenziali Aruba (OBBLIGATORIE per SMTP)
      console.log('[EmailController] ========================================');
      console.log('[EmailController] Retrieving Aruba credentials for userId:', userId);
      console.log('[EmailController] userId type:', typeof userId, 'value:', userId);
      console.log('[EmailController] ========================================');

      const credentials = await IntegrationCredentials.findByUserIdWithPassword(userId);

      console.log('[EmailController] Credentials query result:', !!credentials);
      if (credentials) {
        console.log('[EmailController] Credentials keys:', Object.keys(credentials));
      }

      if (!credentials) {
        console.error('[EmailController] ❌ No credentials found for user:', userId);
        console.error('[EmailController] This means the user has NOT logged in with Aruba credentials yet');
        return res.status(400).json({
          success: false,
          error: 'Credenziali Aruba non configurate. Accedi con le tue credenziali Aruba.',
          code: 'NO_CREDENTIALS'
        });
      }

      console.log('[EmailController] ✓ Credentials found:');
      console.log('  - Aruba Email:', credentials.aruba_email);
      console.log('  - SMTP Host:', credentials.smtp_host);
      console.log('  - SMTP Port:', credentials.smtp_port);

      // ========== INVIO VIA SMTP ARUBA ==========
      console.log('[EmailController] ========================================');
      console.log('[EmailController] SENDING VIA ARUBA SMTP');
      console.log('[EmailController] From (Aruba):', credentials.aruba_email);
      console.log('[EmailController] To:', recipient_email);
      console.log('[EmailController] Subject:', subject);
      console.log('[EmailController] ========================================');

      try {
        const result = await emailService.sendEmail({
          to: recipient_email,
          subject: subject,
          body: body,
          from: credentials.aruba_email, // Email Aruba come mittente
          arubaEmail: credentials.aruba_email, // Username SMTP
          arubaPassword: credentials.aruba_password, // Password SMTP
          smtpHost: credentials.smtp_host,
          smtpPort: credentials.smtp_port
        });

        const duration = Date.now() - startTime;
        console.log('[EmailController] ✅ Email sent successfully!');
        console.log('[EmailController] Message ID:', result.messageId);
        console.log('[EmailController] Response:', result.response);
        console.log('[EmailController] Duration:', duration, 'ms');

        logAuthSuccess({
          userId,
          method: 'sendEmail',
          source: 'Aruba SMTP'
        });

        return res.status(200).json({
          success: true,
          message: 'Email inviata con successo tramite Aruba SMTP',
          messageId: result.messageId,
          provider: 'aruba_smtp',
          from: credentials.aruba_email,
          timestamp: new Date().toISOString(),
          duration_ms: duration
        });

      } catch (emailError) {
        console.error('[EmailController] ❌ SMTP error:', emailError.message);

        logAuthFailure({
          reason: 'Email send failed: ' + emailError.message,
          method: 'sendEmail',
          statusCode: 500,
          userId
        });

        return res.status(500).json({
          success: false,
          error: 'Impossibile inviare email tramite Aruba SMTP',
          message: emailError.message,
          provider: 'aruba_smtp',
          code: emailError.code || 'SMTP_ERROR'
        });
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[EmailController] Errore: ${error.message}`, error);

      logAuthFailure({
        reason: error.message,
        method: 'sendEmail',
        statusCode: 500,
        userId
      });

      return res.status(500).json({
        success: false,
        error: 'Errore interno',
        message: error.message,
        duration_ms: duration
      });
    }
  }
}

module.exports = EmailController;
