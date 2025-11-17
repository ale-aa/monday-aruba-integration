/**
 * EmailController - Gestione invio email tramite SMTP Aruba
 *
 * Flusso automation Monday con Input Field:
 * Riceve {{recipientEmail}} come campo input direttamente dal form
 * Riceve {{email}} con subject e body
 *
 * Invia via SMTP Aruba con credenziali dell'utente
 *
 * Updated: 2025-11-17 - Simplified to Input Field mapping
 */

const IntegrationCredentials = require('../models/IntegrationCredentials');
const { logAuthSuccess, logAuthFailure } = require('../middleware/authLogger');
const EmailService = require('../services/emailService');
const { verifyJWT } = require('../utils/jwtUtils');
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
   * Invia un'email usando SMTP di Aruba
   * Riceve {{recipientEmail}} come input field direttamente dal form
   *
   * Input Fields (Recipe Sentence):
   * - recipientEmail: Email address - Required
   * - email: Email (Subject/Body) - Required
   *
   * POST /monday/sendEmail
   */
  static async sendEmail(req, res) {
    console.log('🔥 SENDEMAIL CALLED');
    console.log('[EmailController] req.body:', JSON.stringify(req.body, null, 2));

    const payload = req.body.payload || req.body;
    const { inboundFieldValues, inputFields } = payload;

    const startTime = Date.now();
    let userId;

    try {
      // ===== VERIFICA JWT =====
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new Error('Authorization header mancante');
      }

      const token = authHeader.replace('Bearer ', '');
      const jwtPayload = verifyJWT(token, process.env.MONDAY_SIGNING_SECRET);

      userId = String(jwtPayload?.user_id || req.monday?.userId || payload.userId || 'unknown');
      console.log('[EmailController] userId:', userId);

      if (!userId || userId === 'unknown') {
        throw new Error('userId non trovato nel JWT');
      }

      // Salva payload per debugging
      savePayloadLog(payload, userId);

      // ===== ESTRAI EMAIL DESTINATARIO =====
      console.log('[EmailController] ========== EXTRACTING RECIPIENT EMAIL ==========');

      let recipient_email = null;
      const recipientField = inboundFieldValues?.recipientEmail || inputFields?.recipientEmail;

      console.log('[EmailController] recipientField:', recipientField);
      console.log('[EmailController] recipientField type:', typeof recipientField);

      // Gestisci formato oggetto { email: "..." }
      if (recipientField && typeof recipientField === 'object') {
        recipient_email = recipientField.email || recipientField.text || recipientField.value;
        console.log('[EmailController] ✓ Extracted email from object:', recipient_email);
      }
      // Gestisci formato stringa
      else if (typeof recipientField === 'string') {
        recipient_email = recipientField;
        console.log('[EmailController] ✓ Extracted email from string:', recipient_email);
      }

      if (!recipient_email || !recipient_email.includes('@')) {
        console.error('[EmailController] ❌ Email destinatario non valida!');
        console.error('[EmailController] inboundFieldValues:', JSON.stringify(inboundFieldValues, null, 2));
        console.error('[EmailController] inputFields:', JSON.stringify(inputFields, null, 2));
        throw new Error('Email destinatario non trovata. Assicurati di aver mappato il campo recipientEmail.');
      }

      console.log('[EmailController] ✅ Recipient email:', recipient_email);
      console.log('[EmailController] ==========================================');

      // ===== ESTRAI SUBJECT E BODY =====
      const emailObj = inboundFieldValues?.email || {};
      let subject = emailObj.subject || inputFields?.subject || 'Email da Monday.com';
      let body = emailObj.body || inputFields?.body || '';

      if (subject && typeof subject === 'object') {
        subject = subject.value || subject.text || 'Email da Monday.com';
      }
      if (body && typeof body === 'object') {
        body = body.value || body.text || '';
      }

      subject = String(subject).trim();
      body = String(body).trim();

      console.log('[EmailController] Subject:', subject);
      console.log('[EmailController] Body length:', body.length);

      // ===== RECUPERA CREDENZIALI ARUBA =====
      console.log('[EmailController] ========== RETRIEVING CREDENTIALS ==========');

      const credentials = await IntegrationCredentials.findByUserIdWithPassword(userId);

      if (!credentials) {
        throw new Error('Credenziali Aruba non trovate. Accedi con le tue credenziali.');
      }

      console.log('[EmailController] ✓ Credentials found');
      console.log('[EmailController] Aruba Email:', credentials.aruba_email);

      // ===== INVIA EMAIL VIA ARUBA SMTP =====
      console.log('[EmailController] ========== SENDING VIA ARUBA SMTP ==========');
      console.log('[EmailController] From:', credentials.aruba_email);
      console.log('[EmailController] To:', recipient_email);
      console.log('[EmailController] Subject:', subject);

      const result = await emailService.sendEmail({
        to: recipient_email,
        subject: subject,
        body: body,
        from: credentials.aruba_email,
        arubaEmail: credentials.aruba_email,
        arubaPassword: credentials.aruba_password,
        smtpHost: credentials.smtp_host,
        smtpPort: credentials.smtp_port
      });

      const duration = Date.now() - startTime;
      console.log('[EmailController] ✅ Email sent successfully!');
      console.log('[EmailController] Message ID:', result.messageId);
      console.log('[EmailController] Duration:', duration, 'ms');

      logAuthSuccess({
        userId,
        method: 'sendEmail',
        source: 'Aruba SMTP via Monday API'
      });

      return res.status(200).json({
        success: true,
        message: 'Email inviata con successo',
        messageId: result.messageId,
        provider: 'aruba_smtp',
        from: credentials.aruba_email,
        to: recipient_email,
        timestamp: new Date().toISOString(),
        duration_ms: duration
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[EmailController] ❌ ERROR:', error.message);
      console.error('[EmailController] Stack:', error.stack);

      logAuthFailure({
        reason: error.message,
        method: 'sendEmail',
        statusCode: 500,
        userId
      });

      return res.status(500).json({
        success: false,
        error: error.message,
        code: error.code || 'ERROR',
        duration_ms: duration
      });
    }
  }
}

module.exports = EmailController;
