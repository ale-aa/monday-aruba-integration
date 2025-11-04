const IntegrationCredentials = require('../models/IntegrationCredentials');
const { logAuthSuccess, logAuthFailure } = require('../middleware/authLogger');
const emailService = require('../services/emailService');

/**
 * Controller per gestire l'invio di email tramite Resend API
 * NOTA: Non usa più SMTP per evitare il blocco porte di Vercel
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
   * Invia un'email usando Resend API
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
      console.log('SEND EMAIL - RESEND API');
      console.log('=============================================');
      console.log('UserId:', userId);
      console.log('Payload:', JSON.stringify(req.body, null, 2));

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
        inboundFieldValues.message ||
        inboundFieldValues.text ||
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

      // Recupera credenziali (opzionale, per compatibilità futura)
      console.log('[EmailController] Checking credentials for userId:', userId);
      const credentials = await IntegrationCredentials.findByUserIdWithPassword(userId);

      if (credentials) {
        console.log('[EmailController] Credentials found:', credentials.aruba_email);
      } else {
        console.log('[EmailController] No credentials found (not required for Resend)');
      }

      // ========== INVIO VIA RESEND API ==========
      console.log('[EmailController] ========================================');
      console.log('[EmailController] SENDING VIA RESEND API');
      console.log('[EmailController] To:', recipient_email);
      console.log('[EmailController] Subject:', subject);
      console.log('[EmailController] ========================================');

      try {
        const result = await emailService.sendEmail({
          to: recipient_email,
          subject: subject,
          body: body,
          from: 'onboarding@resend.dev'
        });

        const duration = Date.now() - startTime;
        console.log('[EmailController] ✅ Email sent successfully!');
        console.log('[EmailController] Message ID:', result.messageId);
        console.log('[EmailController] Duration:', duration, 'ms');

        logAuthSuccess({
          userId,
          method: 'sendEmail',
          source: 'Resend API'
        });

        return res.status(200).json({
          success: true,
          message: 'Email inviata con successo tramite Resend',
          messageId: result.messageId,
          provider: 'resend',
          timestamp: new Date().toISOString(),
          duration_ms: duration
        });

      } catch (emailError) {
        console.error('[EmailController] ❌ Resend error:', emailError.message);

        logAuthFailure({
          reason: 'Email send failed',
          method: 'sendEmail',
          statusCode: 500,
          userId
        });

        return res.status(500).json({
          success: false,
          error: 'Impossibile inviare email',
          message: emailError.message,
          provider: 'resend'
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
