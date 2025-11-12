/**
 * EmailController - Gestione invio email tramite SMTP Aruba
 *
 * Flusso automation Monday:
 * When status changes → send {{email}} to {{someone}}
 *
 * Estrae da inboundFieldValues:
 * - {{someone}} → destinatario email
 * - {{email.subject}} → oggetto email
 * - {{email.body}} → corpo email
 *
 * Invia via SMTP Aruba con credenziali dell'utente
 *
 * Updated: 2025-11-08 - Test completo OK, flusso automation verificato
 */

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
   * Legge l'email destinatario via API di Monday usando shortLivedToken
   *
   * Input Fields (Recipe Sentence):
   * - itemId: Item (Trigger Output) - Required
   * - email_column_id: Column (Email) - Required
   * - email: Email (Subject/Body) - Required
   *
   * POST /monday/sendEmail
   */
  static async sendEmail(req, res) {
    console.log('🔥🔥🔥 SENDEMAIL CALLED 🔥🔥🔥');
    console.log('[DEBUG] ========== FULL PAYLOAD DUMP ==========');
    console.log('[DEBUG] req.body:', JSON.stringify(req.body, null, 2));

    const payload = req.body.payload || req.body;
    console.log('[DEBUG] payload keys:', Object.keys(payload));

    if (payload.inboundFieldValues) {
      console.log('[DEBUG] inboundFieldValues keys:', Object.keys(payload.inboundFieldValues));
      console.log('[DEBUG] inboundFieldValues FULL:', JSON.stringify(payload.inboundFieldValues, null, 2));

      // Log ogni campo separatamente
      for (const [key, value] of Object.entries(payload.inboundFieldValues)) {
        console.log(`[DEBUG] Field "${key}":`, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (payload.inputFields) {
      console.log('[DEBUG] inputFields:', JSON.stringify(payload.inputFields, null, 2));
    }

    if (payload.outputFields) {
      console.log('[DEBUG] outputFields:', JSON.stringify(payload.outputFields, null, 2));
    }

    console.log('[DEBUG] =======================================');

    const startTime = Date.now();
    let userId;

    try {
      // ===== ESTRAI E VERIFICA JWT =====
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new Error('Authorization header mancante');
      }

      const token = authHeader.replace('Bearer ', '');
      console.log('[EmailController] JWT token extracted');

      // Estrai shortLivedToken dal JWT via req.monday
      const shortLivedToken = req.monday?.shortLivedToken;
      if (!shortLivedToken) {
        throw new Error('shortLivedToken mancante nel JWT. Verifica che il token sia valido.');
      }

      console.log('[EmailController] ✓ shortLivedToken present');

      // Estrai payload e userId
      const { inboundFieldValues, inputFields } = payload;
      userId = String(req.monday?.userId || payload.userId || 'unknown');

      console.log('[EmailController] userId:', userId);
      console.log('[EmailController] inboundFieldValues keys:', Object.keys(inboundFieldValues || {}));
      console.log('[EmailController] inputFields keys:', Object.keys(inputFields || {}));

      // Salva payload per debugging
      savePayloadLog(payload, userId);

      if (!userId || userId === 'unknown') {
        throw new Error('userId non trovato nel JWT');
      }

      // ===== ESTRAI ITEM ID =====
      const itemData = inboundFieldValues?.itemId;
      let itemId;

      if (typeof itemData === 'object' && itemData?.id) {
        itemId = itemData.id;
      } else if (typeof itemData === 'object' && itemData?.value?.id) {
        itemId = itemData.value.id;
      } else if (typeof itemData === 'number' || typeof itemData === 'string') {
        itemId = itemData;
      }

      console.log('[EmailController] itemId:', itemId);
      console.log('[EmailController] Item object:', itemData);

      if (!itemId) {
        throw new Error('itemId mancante! Aggiungi un campo "itemId" con Type: Item e Source: Trigger Output');
      }

      // ===== ESTRAI EMAIL COLUMN ID =====
      const emailColumnData = inboundFieldValues?.email_column_id;
      let emailColumnId;

      if (typeof emailColumnData === 'object' && emailColumnData?.id) {
        emailColumnId = emailColumnData.id;
      } else if (typeof emailColumnData === 'object' && emailColumnData?.value?.id) {
        emailColumnId = emailColumnData.value.id;
      } else if (typeof emailColumnData === 'string') {
        emailColumnId = emailColumnData;
      }

      console.log('[EmailController] emailColumnId:', emailColumnId);
      console.log('[EmailController] Email column object:', emailColumnData);

      if (!emailColumnId) {
        throw new Error('email_column_id mancante! Aggiungi un campo "email_column_id" con Type: Column e Restrict to: Email');
      }

      // ===== CHIAMA API MONDAY PER LEGGERE EMAIL =====
      console.log('[EmailController] ========== CALLING MONDAY API ==========');
      console.log('[EmailController] itemId:', itemId);
      console.log('[EmailController] columnId:', emailColumnId);

      const query = `
        query ($itemId: [Int!]!, $colId: [String!]!) {
          items (ids: $itemId) {
            id
            name
            column_values (ids: $colId) {
              id
              text
              value
            }
          }
        }
      `;

      const apiResponse = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': shortLivedToken
        },
        body: JSON.stringify({
          query,
          variables: {
            itemId: [Number(itemId)],
            colId: [String(emailColumnId)]
          }
        })
      });

      const apiData = await apiResponse.json();

      console.log('[EmailController] API Response status:', apiResponse.status);
      if (apiData.errors) {
        console.error('[EmailController] API Errors:', apiData.errors);
        throw new Error('Monday API error: ' + JSON.stringify(apiData.errors));
      }

      // Estrai l'item e il valore della colonna
      const item = apiData.data?.items?.[0];
      if (!item) {
        throw new Error('Item non trovato con ID: ' + itemId);
      }

      console.log('[EmailController] ✓ Item found:', item.name);

      const columnValue = item.column_values?.[0];
      if (!columnValue) {
        throw new Error('Colonna email non trovata nell\'item');
      }

      console.log('[EmailController] Column value text:', columnValue.text);
      console.log('[EmailController] Column value value:', columnValue.value?.substring?.(0, 100));

      // Estrai email dal column value
      let recipient_email = columnValue.text || columnValue.value;

      // Se è JSON, prova a parsare
      if (recipient_email && recipient_email.startsWith('{')) {
        try {
          const parsed = JSON.parse(recipient_email);
          recipient_email = parsed.email || parsed.text || recipient_email;
        } catch (e) {
          console.error('[EmailController] Non-JSON column value, using as-is');
        }
      }

      recipient_email = String(recipient_email || '').trim();
      console.log('[EmailController] ✅ Recipient email from API:', recipient_email);

      if (!recipient_email || !recipient_email.includes('@')) {
        throw new Error('Email non valida nella colonna: ' + recipient_email);
      }

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
      console.log('[EmailController] userId:', userId);

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

      try {
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

      } catch (emailError) {
        console.error('[EmailController] ❌ SMTP error:', emailError.message);
        throw emailError;
      }

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
