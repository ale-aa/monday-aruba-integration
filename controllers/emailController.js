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
const axios = require('axios');
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

// Helper per recuperare il valore della colonna email da Monday API tramite GraphQL
async function fetchEmailFromColumn(itemId, columnId, userToken) {
  try {
    console.log('[EmailController] ========== FETCHING EMAIL FROM COLUMN ==========');
    console.log('[EmailController] itemId:', itemId);
    console.log('[EmailController] columnId:', columnId);

    const query = `
      query {
        items(ids: [${itemId}]) {
          id
          column_values(ids: ["${columnId}"]) {
            id
            text
            value
            type
          }
        }
      }
    `;

    const response = await axios.post('https://api.monday.com/graphql',
      { query },
      {
        headers: {
          'Authorization': userToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const columnValues = response.data?.data?.items?.[0]?.column_values;
    if (!columnValues || columnValues.length === 0) {
      throw new Error(`Colonna email non trovata per itemId: ${itemId}`);
    }

    const emailField = columnValues[0];
    const email = emailField.text || emailField.value;

    console.log('[EmailController] ✓ Email retrieved from column:', email);
    console.log('[EmailController] Column type:', emailField.type);
    console.log('[EmailController] ==========================================');

    return email;
  } catch (err) {
    console.error('[EmailController] ❌ Error fetching email from column:', err.message);
    throw new Error(`Errore nel recupero email dalla colonna: ${err.message}`);
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

    // Log completo della struttura del payload
    console.log('[EmailController] ========== PAYLOAD STRUCTURE DEBUG ==========');
    console.log('[EmailController] payload keys:', Object.keys(payload));
    console.log('[EmailController] payload:', JSON.stringify(payload, null, 2));

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
      console.log('[EmailController] Available fields in inboundFieldValues:', Object.keys(inboundFieldValues || {}));
      console.log('[EmailController] Available fields in inputFields:', Object.keys(inputFields || {}));
      console.log('[EmailController] Payload root keys:', Object.keys(payload || {}));

      // Cerca itemId in varie posizioni
      console.log('[EmailController] Searching for itemId...');
      console.log('[EmailController] payload.itemId:', payload.itemId);
      console.log('[EmailController] inboundFieldValues.itemId:', inboundFieldValues?.itemId);
      console.log('[EmailController] inputFields.itemId:', inputFields?.itemId);

      let recipient_email = null;

      // Metodo 1: Input Field approach (recipientEmail passato direttamente)
      const recipientField = inboundFieldValues?.dynamic_email || inboundFieldValues?.recipientEmail || inputFields?.dynamic_email || inputFields?.recipientEmail;

      console.log('[EmailController] recipientField raw value:', JSON.stringify(recipientField));
      console.log('[EmailController] recipientField type:', typeof recipientField);

      // Estrazione email con fallback completo
      if (recipientField) {
        // Caso 1: Formato oggetto { email: "..." }
        if (typeof recipientField === 'object' && recipientField !== null) {
          console.log('[EmailController] → recipientField is OBJECT');
          console.log('[EmailController] → Object keys:', Object.keys(recipientField));
          console.log('[EmailController] → recipientField.email:', recipientField.email);
          console.log('[EmailController] → recipientField.text:', recipientField.text);
          console.log('[EmailController] → recipientField.value:', recipientField.value);

          // Prova email -> text -> value
          recipient_email = recipientField.email;
          if (!recipient_email) {
            console.log('[EmailController] → email field empty, trying text field...');
            recipient_email = recipientField.text;
          }
          if (!recipient_email) {
            console.log('[EmailController] → text field empty, trying value field...');
            recipient_email = recipientField.value;
          }

          if (recipient_email) {
            console.log('[EmailController] ✓ Extracted email from object (via fallback):', recipient_email);
          } else {
            console.log('[EmailController] ❌ Object has no valid email field');
          }
        }
        // Caso 2: Formato stringa diretta
        else if (typeof recipientField === 'string') {
          console.log('[EmailController] → recipientField is STRING');
          recipient_email = recipientField;
          console.log('[EmailController] ✓ Extracted email from string:', recipient_email);
        }
        // Caso 3: Altro formato non riconosciuto
        else {
          console.log('[EmailController] ❌ recipientField has unexpected type:', typeof recipientField);
        }
      } else if (payload.itemId && (payload.columnId || inboundFieldValues?.columnId)) {
        // Metodo 2: Column ID approach (richiede GraphQL query)
        const itemId = payload.itemId;
        const columnId = payload.columnId || inboundFieldValues?.columnId;
        console.log('[EmailController] → Input Field not found, trying Column ID approach...');
        console.log('[EmailController] → Using itemId:', itemId, 'columnId:', columnId);
        recipient_email = await fetchEmailFromColumn(itemId, columnId, token);
      } else {
        console.log('[EmailController] ❌ recipientField is null/undefined');
        console.log('[EmailController] → Checking all inboundFieldValues for email patterns...');

        // Fallback: Cerca qualsiasi campo che contenga "@"
        for (const [key, value] of Object.entries(inboundFieldValues || {})) {
          console.log(`[EmailController] → Checking field "${key}":`, typeof value === 'object' ? JSON.stringify(value) : value);
          if (typeof value === 'string' && value.includes('@')) {
            recipient_email = value;
            console.log(`[EmailController] ✓ Found email in field "${key}":`, recipient_email);
            break;
          }
          if (typeof value === 'object' && value?.email && value.email.includes('@')) {
            recipient_email = value.email;
            console.log(`[EmailController] ✓ Found email in object field "${key}":`, recipient_email);
            break;
          }
        }
      }

      // Validazione finale
      if (!recipient_email || !recipient_email.includes('@')) {
        console.error('[EmailController] ❌ Email destinatario NON VALIDA o MANCANTE!');
        console.error('[EmailController] Extracted value:', recipient_email);
        console.error('[EmailController] Full inboundFieldValues:', JSON.stringify(inboundFieldValues, null, 2));
        console.error('[EmailController] Full inputFields:', JSON.stringify(inputFields, null, 2));
        console.error('[EmailController] Full payload:', JSON.stringify(payload, null, 2));
        throw new Error('Email destinatario non trovata. Assicurati di aver mappato il campo recipientEmail correttamente nel form o di aver passato itemId e columnId.');
      }

      console.log('[EmailController] ✅ FINAL Recipient email:', recipient_email);
      console.log('[EmailController] ==========================================');

      // ===== ESTRAI SUBJECT E BODY =====
      console.log('[EmailController] ========== EXTRACTING SUBJECT AND BODY ==========');

      // Metodo 1: Campi separati (emailSubject e emailBody)
      let subject = inboundFieldValues?.emailSubject || inputFields?.emailSubject;
      let body = inboundFieldValues?.emailBody || inputFields?.emailBody;

      // Metodo 2: Campi direttamente nel payload (subject/body al root)
      if (!subject) {
        subject = payload?.subject || inboundFieldValues?.subject;
      }
      if (!body) {
        body = payload?.body || inboundFieldValues?.body;
      }

      // Fallback: Campo email oggetto (se presente)
      const emailObj = inboundFieldValues?.email || {};
      if (!subject) {
        subject = emailObj.subject || 'Email da Monday.com';
      }
      if (!body) {
        body = emailObj.body || '';
      }

      // Gestione campi oggetto
      if (subject && typeof subject === 'object') {
        subject = subject.value || subject.text || 'Email da Monday.com';
      }
      if (body && typeof body === 'object') {
        body = body.value || body.text || '';
      }

      subject = String(subject || 'Email da Monday.com').trim();
      body = String(body || '').trim();

      console.log('[EmailController] Subject:', subject);
      console.log('[EmailController] Body length:', body.length);
      console.log('[EmailController] ==========================================');

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
