/**
 * EmailController - Gestione invio email tramite SMTP Aruba
 *
 * Flusso automation Monday con Dynamic Mapping Field:
 * When status changes → send {{email}} with {{dynamic_email}}
 *
 * Dynamic Mapping Field passa automaticamente il valore della colonna email mappata dall'utente
 *
 * Estrae da inboundFieldValues:
 * - {{dynamic_email}} → destinatario email (da Dynamic Mapping Field)
 * - {{email.subject}} → oggetto email
 * - {{email.body}} → corpo email
 *
 * Invia via SMTP Aruba con credenziali dell'utente
 *
 * Updated: 2025-11-14 - Switched to Monday Dynamic Mapping Field
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
 * Recupera il valore email da Monday.com usando GraphQL
 * Dynamic Mapping Field passa solo l'ID della colonna, non il valore
 * Bisogna usare itemId + columnId per recuperare il valore
 */
async function fetchEmailFromColumn(opts) {
  const { shortLivedToken, itemId, columnId } = opts;

  if (!shortLivedToken || !itemId || !columnId) {
    console.error('[EmailController] Missing required parameters for GraphQL query');
    return null;
  }

  const query = `
    query($itemId: [Int], $columnId: [String]) {
      items(ids: $itemId) {
        id
        name
        column_values(ids: $columnId) {
          id
          title
          text
          value
        }
      }
    }
  `;

  try {
    console.log('[EmailController] Fetching email from column via GraphQL...');
    console.log('[EmailController] itemId:', itemId, 'columnId:', columnId);

    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': shortLivedToken
      },
      body: JSON.stringify({
        query,
        variables: {
          itemId: [parseInt(itemId)],
          columnId: [columnId]
        }
      })
    });

    const data = await response.json();
    console.log('[EmailController] GraphQL response:', JSON.stringify(data, null, 2));

    if (data.errors) {
      console.error('[EmailController] GraphQL error:', data.errors);
      return null;
    }

    const columnValue = data?.data?.items?.[0]?.column_values?.[0];
    if (!columnValue) {
      console.warn('[EmailController] Column value not found');
      return null;
    }

    // Estrai email da text o value
    let email = columnValue.text;

    // Se text è vuoto, prova a parsare value
    if (!email && columnValue.value) {
      try {
        const parsed = JSON.parse(columnValue.value);
        email = parsed.email || parsed.text;
      } catch (e) {
        email = columnValue.value;
      }
    }

    console.log('[EmailController] Extracted email from column:', email);
    return email;

  } catch (error) {
    console.error('[EmailController] Error fetching email from column:', error.message);
    return null;
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
   * - columnId: Column (Email) - Required
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

      // ===== ESTRAI EMAIL DAL DYNAMIC MAPPING FIELD =====
      // Dynamic Mapping Field può passare:
      // 1. Il valore email diretto (stringa con @)
      // 2. L'ID della colonna (se il trigger non espone itemValues)
      // 3. Un oggetto con proprietà email/text
      let recipient_email = null;
      let columnId = null;
      let itemId = null;

      console.log('[EmailController] ========== EXTRACTING EMAIL ==========');

      // Estrai itemId (necessario per GraphQL)
      itemId = inboundFieldValues?.itemId ||
               inputFields?.itemId ||
               inboundFieldValues?.item_id ||
               payload.itemId;

      console.log('[EmailController] itemId:', itemId);

      // Estrai dynamic_email (potrebbe essere valore o columnId)
      const dynamicEmailValue = inboundFieldValues?.dynamic_email || inputFields?.dynamic_email;
      console.log('[EmailController] dynamic_email value:', dynamicEmailValue);

      // Opzione 1: Se è una stringa con @ -> è il valore email diretto
      if (typeof dynamicEmailValue === 'string' && dynamicEmailValue.includes('@')) {
        recipient_email = dynamicEmailValue;
        console.log('[EmailController] ✓ Found email directly in dynamic_email (string)');
      }

      // Opzione 2: Se è una stringa senza @ -> è probabilmente un columnId, usa GraphQL
      if (!recipient_email && typeof dynamicEmailValue === 'string' && !dynamicEmailValue.includes('@')) {
        columnId = dynamicEmailValue;
        console.log('[EmailController] ✓ Found columnId in dynamic_email:', columnId);

        // Recupera il valore email via GraphQL usando itemId + columnId
        if (itemId && columnId && shortLivedToken) {
          console.log('[EmailController] Attempting to fetch email via GraphQL...');
          recipient_email = await fetchEmailFromColumn({
            shortLivedToken,
            itemId,
            columnId
          });

          if (recipient_email) {
            console.log('[EmailController] ✓ Email fetched via GraphQL:', recipient_email);
          }
        }
      }

      // Opzione 3: Se è un oggetto con proprietà email/text
      if (!recipient_email && typeof dynamicEmailValue === 'object' && dynamicEmailValue) {
        recipient_email = dynamicEmailValue.email || dynamicEmailValue.text;
        if (recipient_email) {
          console.log('[EmailController] ✓ Found email in dynamic_email object');
        }
      }

      // Opzione 4: Fallback su recipient_email per compatibilità
      if (!recipient_email && inboundFieldValues?.recipient_email) {
        recipient_email = inboundFieldValues.recipient_email;
        console.log('[EmailController] ✓ Found email in recipient_email (fallback)');
      }

      // Opzione 5: Cerca in tutte le chiavi che contengono email
      if (!recipient_email) {
        for (const [key, value] of Object.entries(inboundFieldValues || {})) {
          if (typeof value === 'string' && value.includes('@')) {
            recipient_email = value;
            console.log('[EmailController] ✓ Found email in field:', key);
            break;
          }
          if (typeof value === 'object' && value?.email) {
            recipient_email = value.email;
            console.log('[EmailController] ✓ Found email in object field:', key);
            break;
          }
        }
      }

      console.log('[EmailController] Final recipient_email:', recipient_email);

      if (!recipient_email || !recipient_email.includes('@')) {
        console.error('[EmailController] ❌ Email destinatario non valida!');
        console.error('[EmailController] inboundFieldValues keys:', Object.keys(inboundFieldValues || {}));
        console.error('[EmailController] inboundFieldValues:', JSON.stringify(inboundFieldValues, null, 2));
        console.error('[EmailController] inputFields:', JSON.stringify(inputFields, null, 2));
        throw new Error('Email destinatario non trovata. Assicurati che il trigger passi itemId e che hai mappato la colonna email nel Dynamic Mapping Field.');
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
