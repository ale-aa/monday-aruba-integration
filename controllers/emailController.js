const nodemailer = require('nodemailer');
const IntegrationCredentials = require('../models/IntegrationCredentials');
const { logAuthSuccess, logAuthFailure } = require('../middleware/authLogger');

/**
 * Controller per gestire l'invio di email via SMTP Aruba
 */
class EmailController {
  /**
   * Valida i parametri email
   * @param {Object} params - Parametri da validare
   * @throws {Error} Se validation fallisce
   */
  static validateEmailParams(params) {
    const { recipient_email, subject, body, cc, bcc } = params;

    // Validazione recipient_email (ora garantito stringa)
    if (!recipient_email) {
      throw new Error('recipient_email è obbligatorio');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient_email)) {
      throw new Error('recipient_email non è valido');
    }

    // Validazione subject (ora garantito stringa)
    if (!subject) {
      throw new Error('subject è obbligatorio');
    }

    if (subject.length > 998) {
      throw new Error('subject non può superare 998 caratteri');
    }

    // Validazione body (ora garantito stringa)
    if (!body) {
      throw new Error('body è obbligatorio');
    }

    // Validazione cc (opzionale)
    if (cc) {
      const ccArray = Array.isArray(cc) ? cc : [cc];
      for (const email of ccArray) {
        if (email && !emailRegex.test(String(email).trim())) {
          throw new Error(`Email CC non valida: ${email}`);
        }
      }
    }

    // Validazione bcc (opzionale)
    if (bcc) {
      const bccArray = Array.isArray(bcc) ? bcc : [bcc];
      for (const email of bccArray) {
        if (email && !emailRegex.test(String(email).trim())) {
          throw new Error(`Email BCC non valida: ${email}`);
        }
      }
    }
  }

  /**
   * Crea un transporter nodemailer configurato per Aruba SMTP
   * @param {Object} credentials - Credenziali dall'utente
   * @returns {Object} Nodemailer transporter
   * @throws {Error} Se credenziali sono invalide
   */
  static createSMTPTransport(credentials) {
    if (!credentials) {
      throw new Error('Credenziali non disponibili');
    }

    const { aruba_email, aruba_password, smtp_host, smtp_port } = credentials;

    if (!aruba_email || !aruba_password || !smtp_host || !smtp_port) {
      throw new Error('Credenziali SMTP incomplete');
    }

    console.log('[EmailController] Tentativo connessione SMTP...');
    console.log('[EmailController] Host:', smtp_host);
    console.log('[EmailController] Port:', smtp_port);
    console.log(
      `[EmailController] Creando transporter SMTP per ${aruba_email} @ ${smtp_host}:${smtp_port}`
    );

    // Crea transporter nodemailer
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: parseInt(smtp_port),
      secure: smtp_port == 465, // true per porta 465 (SSL), false per 587 (STARTTLS)
      auth: {
        user: aruba_email,
        pass: aruba_password
      },
      // Opzioni aggiuntive
      logger: process.env.DEBUG_EMAIL === 'true',
      debug: process.env.DEBUG_EMAIL === 'true',
      connectionTimeout: 30000, // 30 secondi invece di 10
      greetingTimeout: 30000,
      socketTimeout: 30000,
      tls: {
        rejectUnauthorized: false // accetta certificati self-signed
      }
    });

    return transporter;
  }

  /**
   * Invia un'email usando le credenziali dell'utente
   * POST /monday/sendEmail
   *
   * Body:
   * {
   *   recipient_email: "user@example.com",
   *   subject: "Test Email",
   *   body: "Email content",
   *   cc: "cc@example.com" or ["cc1@example.com", "cc2@example.com"],
   *   bcc: "bcc@example.com" or ["bcc1@example.com", "bcc2@example.com"]
   * }
   */
  static async sendEmail(req, res) {
    const startTime = Date.now();
    let userId;

    try {
      // Estrai userId dal middleware di autenticazione
      const rawUserId = req.monday?.userId;
      // Converti userId a stringa per il database Prisma
      userId = String(rawUserId);

      // ===== COMPREHENSIVE FLOW DEBUG =====
      console.log('=============================================');
      console.log('SEND EMAIL - FULL FLOW DEBUG');
      console.log('=============================================');
      console.log('1. UserId from JWT:', userId);
      console.log('2. UserId type:', typeof userId);

      // ===== DETAILED REQUEST LOGGING =====
      console.log('=== SEND EMAIL REQUEST ===');
      console.log('UserId:', userId, '(type: string)');
      console.log('Payload:', JSON.stringify(req.body, null, 2));
      console.log('==========================');

      if (!userId || userId === 'undefined') {
        return res.status(400).json({
          success: false,
          error: 'User ID mancante',
          message: 'Impossibile estrarre userId dal token'
        });
      }

      console.log(`[EmailController] SendEmail for userId: ${userId}`);

      // ===== FULL PAYLOAD DEBUG LOGGING =====
      console.log('=== FULL PAYLOAD DEBUG ===');
      console.log('Full req.body:', JSON.stringify(req.body, null, 2));
      console.log('inputFields:', JSON.stringify(req.body.inputFields, null, 2));
      console.log('payload.inputFields:', JSON.stringify(req.body.payload?.inputFields, null, 2));
      console.log('credentialsValues:', JSON.stringify(req.body.payload?.credentialsValues, null, 2));
      console.log('========================');

      // Check for Monday.com specific payload structures
      const payload = req.body.payload || req.body;
      // IMPORTANT: inputFields might be directly in req.body or in payload
      const inputFields = req.body.inputFields || payload.inputFields || {};
      const inboundFieldValues = req.body.inboundFieldValues || payload.inboundFieldValues || {};

      console.log('[EmailController] === EXTRACTED STRUCTURES ===');
      console.log('[EmailController] payload:', JSON.stringify(payload, null, 2));
      console.log('[EmailController] inputFields:', JSON.stringify(inputFields, null, 2));
      console.log('[EmailController] inboundFieldValues:', JSON.stringify(inboundFieldValues, null, 2));
      console.log('[EmailController] === END EXTRACTED STRUCTURES ===');

      // === DETAILED INBOUND FIELD VALUES LOGGING ===
      console.log('[EmailController] === INBOUND FIELD VALUES DETAILS ===');
      console.log('[EmailController] inboundFields:', JSON.stringify(inboundFieldValues, null, 2));
      console.log('[EmailController] inboundFields.email:', inboundFieldValues.email);
      console.log('[EmailController] Type:', typeof inboundFieldValues.email);
      console.log('[EmailController] =========================================');

      // === DIRECT EMAIL FIELD INSPECTION ===
      console.log('[EmailController] ========== DIRECT EMAIL CHECK ==========');
      console.log('[EmailController] inboundFieldValues.email EXISTS?', 'email' in inboundFieldValues);
      console.log('[EmailController] inboundFieldValues.email VALUE:', inboundFieldValues.email);
      console.log('[EmailController] inboundFieldValues.email TYPE:', typeof inboundFieldValues.email);
      console.log('[EmailController] inboundFieldValues.email JSON:', JSON.stringify(inboundFieldValues.email, null, 2));
      console.log('[EmailController] =======================================');

      // FLEXIBLE FIELD EXTRACTION with fallback chains
      // The REAL data is in inboundFieldValues! Search there FIRST
      let recipient_email =
        inboundFieldValues.email ||           // ← QUI È L'EMAIL!
        inboundFieldValues.recipient_email ||
        inboundFieldValues.to ||
        inboundFieldValues.recipient ||
        inputFields.email ||
        inputFields.recipient_email ||
        inputFields.to ||
        inputFields.recipient ||
        req.body.recipient_email ||
        req.body.email ||
        req.body.to ||
        req.body.recipient ||
        payload.recipient_email ||
        payload.email ||
        payload.to ||
        payload.recipient ||
        null;

      // Logging per vedere il TIPO di dato recipient_email
      console.log('[EmailController] recipient_email raw:', recipient_email);
      console.log('[EmailController] recipient_email type:', typeof recipient_email);
      console.log('[EmailController] recipient_email is array?', Array.isArray(recipient_email));

      // Se è un oggetto, loggalo
      if (recipient_email && typeof recipient_email === 'object') {
        console.log('[EmailController] recipient_email is object:', JSON.stringify(recipient_email));
        recipient_email = recipient_email.value || recipient_email.email || recipient_email.text;
      }

      // Se è un array, prendi il primo elemento
      if (Array.isArray(recipient_email) && recipient_email.length > 0) {
        console.log('[EmailController] recipient_email is array, taking first element');
        recipient_email = recipient_email[0];
      }

      // Debug: controlla lo stato di recipient_email prima del fallback
      console.log('[EmailController] Before aggressive extraction - recipient_email:', recipient_email);
      console.log('[EmailController] recipient_email is falsy?', !recipient_email);
      console.log('[EmailController] recipient_email is empty string?', recipient_email === '');

      // Aggressive extraction fallback: se recipient_email è ancora null/undefined/empty
      // prova a estrarre QUALSIASI cosa che assomigli a un'email da inboundFieldValues
      if ((!recipient_email || recipient_email === '') && inboundFieldValues) {
        console.log('[EmailController] Trying aggressive extraction from inboundFieldValues');

        // Cerca in tutte le chiavi
        for (const [key, value] of Object.entries(inboundFieldValues)) {
          console.log(`[EmailController] Checking key "${key}":`, value);

          // Se il valore sembra un'email (contiene @)
          if (value && typeof value === 'string' && value.includes('@')) {
            recipient_email = value;
            console.log(`[EmailController] Found email in key "${key}":`, recipient_email);
            break;
          }

          // Se il valore è un oggetto con proprietà email-like
          if (value && typeof value === 'object') {
            const possibleEmail = value.email || value.value || value.text || value.address;
            if (possibleEmail && String(possibleEmail).includes('@')) {
              recipient_email = possibleEmail;
              console.log(`[EmailController] Found email in object "${key}":`, recipient_email);
              break;
            }
          }
        }
      }

      // Converti a stringa
      recipient_email = String(recipient_email || '').trim();
      console.log('[EmailController] recipient_email extracted:', recipient_email);
      console.log('[EmailController] recipient_email type:', typeof recipient_email);

      // --- SUBJECT HANDLING ---
      let subject =
        inboundFieldValues.subject ||
        inboundFieldValues.oggetto ||
        inputFields.subject ||
        inputFields.oggetto ||
        req.body.subject ||
        payload.subject ||
        'Email da Monday.com';

      console.log('[EmailController] subject raw:', subject);
      console.log('[EmailController] subject type:', typeof subject);

      if (subject && typeof subject === 'object') {
        console.log('[EmailController] subject is object:', JSON.stringify(subject));
        subject = subject.value || subject.text || subject.message;
      }

      if (Array.isArray(subject) && subject.length > 0) {
        console.log('[EmailController] subject is array, taking first element');
        subject = subject[0];
      }

      subject = String(subject || 'Email da Monday.com').trim();
      console.log('[EmailController] subject final:', subject);

      // --- BODY HANDLING ---
      let body =
        inboundFieldValues.body ||
        inboundFieldValues.message ||
        inboundFieldValues.text ||
        inputFields.body ||
        inputFields.message ||
        inputFields.text ||
        req.body.body ||
        req.body.content ||
        req.body.message ||
        payload.body ||
        payload.content ||
        payload.message ||
        'Messaggio da Monday.com';

      console.log('[EmailController] body raw:', body ? (typeof body === 'string' ? body.substring(0, 100) : JSON.stringify(body).substring(0, 100)) : null);
      console.log('[EmailController] body type:', typeof body);

      if (body && typeof body === 'object' && !Array.isArray(body)) {
        console.log('[EmailController] body is object:', JSON.stringify(body));
        body = body.value || body.text || body.message || body.content;
      }

      if (Array.isArray(body) && body.length > 0) {
        console.log('[EmailController] body is array, taking first element');
        body = body[0];
      }

      body = String(body || 'Messaggio da Monday.com').trim();
      console.log('[EmailController] body final:', body.substring(0, 100));

      // --- CC HANDLING ---
      let cc = inboundFieldValues.cc || inputFields.cc || req.body.cc || payload.cc || null;
      if (cc && typeof cc === 'object' && !Array.isArray(cc)) {
        cc = cc.value || cc.email || cc.text;
      }
      if (cc) {
        cc = String(cc).trim();
      }

      // --- BCC HANDLING ---
      let bcc = inboundFieldValues.bcc || inputFields.bcc || req.body.bcc || payload.bcc || null;
      if (bcc && typeof bcc === 'object' && !Array.isArray(bcc)) {
        bcc = bcc.value || bcc.email || bcc.text;
      }
      if (bcc) {
        bcc = String(bcc).trim();
      }

      // DEBUG: Log extracted values
      console.log('[EmailController] === EXTRACTED FIELDS ===');
      console.log('[EmailController] recipient_email:', recipient_email);
      console.log('[EmailController] subject:', subject);
      console.log('[EmailController] body:', body ? body.substring(0, 100) : null);
      console.log('[EmailController] cc:', cc);
      console.log('[EmailController] bcc:', bcc);
      console.log('[EmailController] === END EXTRACTED FIELDS ===');

      // Check if recipient_email is missing and provide detailed error
      if (!recipient_email) {
        console.error('[EmailController] ✗ recipient_email mancante!');
        console.error('[EmailController] Available fields in req.body:', Object.keys(req.body));
        console.error('[EmailController] Available fields in payload:', payload ? Object.keys(payload) : 'N/A');
        console.error('[EmailController] Available fields in inboundFieldValues:', Object.keys(inboundFieldValues));

        return res.status(400).json({
          success: false,
          error: 'Parametri invalidi',
          message: 'recipient_email è obbligatorio',
          debug: {
            requestBodyKeys: Object.keys(req.body),
            payloadKeys: payload ? Object.keys(payload) : [],
            inboundFieldValuesKeys: Object.keys(inboundFieldValues),
            availableData: {
              body: req.body,
              payload,
              inboundFieldValues
            }
          }
        });
      }

      // Valida parametri
      try {
        this.validateEmailParams({ recipient_email, subject, body, cc, bcc });
      } catch (validationError) {
        console.warn(`[EmailController] Validazione fallita: ${validationError.message}`);
        return res.status(400).json({
          success: false,
          error: 'Parametri invalidi',
          message: validationError.message
        });
      }

      // Recupera credenziali dell'utente dal database
      console.log('3. Searching credentials for userId:', userId);

      const credentials = await IntegrationCredentials.findByUserIdWithPassword(userId);

      console.log('4. Credentials found?', !!credentials);
      if (credentials) {
        console.log('5. Credentials details:');
        console.log('   - aruba_email:', credentials.aruba_email);
        console.log('   - smtp_host:', credentials.smtp_host);
        console.log('   - smtp_port:', credentials.smtp_port);
        console.log('   - has password?', !!credentials.aruba_password);
      } else {
        console.log('5. NO CREDENTIALS FOUND!');
        console.log('   - Checking what userIds exist in DB...');

        // Aggiungi query per vedere tutti gli userId nel database
        const allCreds = await IntegrationCredentials.findAll();
        console.log('   - Total credentials in DB:', allCreds?.length || 0);
        if (allCreds && allCreds.length > 0) {
          console.log('   - Available userIds:', allCreds.map(c => c.monday_user_id));
        }
      }
      console.log('=============================================');

      if (!credentials) {
        console.warn(`[EmailController] Credentials not found for userId: ${userId}`);
        logAuthFailure({
          reason: 'Credentials not configured',
          method: 'sendEmail',
          statusCode: 401
        });
        return res.status(401).json({
          success: false,
          error: 'Credenziali non configurate',
          message: 'L\'utente non ha configurato le credenziali Aruba. Completare il flusso di autorizzazione.'
        });
      }

      console.log(`[EmailController] Found credentials: ${credentials.aruba_email}`);

      // Crea transporter SMTP
      let transporter;
      try {
        transporter = this.createSMTPTransport(credentials);
      } catch (transportError) {
        console.error(`[EmailController] Errore creazione transporter: ${transportError.message}`);
        return res.status(500).json({
          success: false,
          error: 'Configurazione SMTP errata',
          message: transportError.message
        });
      }

      // Prepara opzioni email
      const mailOptions = {
        from: credentials.aruba_email,
        to: recipient_email.trim(),
        subject: subject.trim(),
        text: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
        headers: {
          'X-Mailer': 'Monday.com Aruba Integration',
          'X-User-ID': userId
        }
      };

      // Aggiungi CC se presente
      if (cc) {
        const ccArray = Array.isArray(cc) ? cc : [cc];
        mailOptions.cc = ccArray.filter(email => email && email.trim()).join(', ');
      }

      // Aggiungi BCC se presente
      if (bcc) {
        const bccArray = Array.isArray(bcc) ? bcc : [bcc];
        mailOptions.bcc = bccArray.filter(email => email && email.trim()).join(', ');
      }

      console.log(
        `[EmailController] Sending email: to=${mailOptions.to}, subject="${mailOptions.subject}"`
      );

      // Invia email
      let info;
      try {
        info = await transporter.sendMail(mailOptions);
      } catch (smtpError) {
        const errorMessage = smtpError.message || 'Errore sconosciuto SMTP';
        console.error(`[EmailController] Errore SMTP: ${errorMessage}`);

        // Log specifici per errori comuni
        if (errorMessage.includes('Invalid login') || errorMessage.includes('Authentication')) {
          logAuthFailure({
            reason: 'SMTP authentication failed',
            method: 'sendEmail',
            statusCode: 401
          });
          return res.status(401).json({
            success: false,
            error: 'Autenticazione SMTP fallita',
            message: 'Le credenziali Aruba non sono valide. Riconfigurare le credenziali.'
          });
        }

        if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('EHOSTUNREACH')) {
          return res.status(503).json({
            success: false,
            error: 'Server SMTP non raggiungibile',
            message: 'Il server Aruba SMTP non è raggiungibile. Riprovare più tardi.'
          });
        }

        return res.status(500).json({
          success: false,
          error: 'Errore invio email',
          message: errorMessage
        });
      }

      const duration = Date.now() - startTime;
      console.log(
        `[EmailController] Email inviata con successo: ${info.messageId} (${duration}ms)`
      );

      logAuthSuccess({
        userId,
        method: 'sendEmail',
        source: 'Email Sent'
      });

      // Ritorna successo
      res.status(200).json({
        success: true,
        message: 'Email inviata con successo',
        messageId: info.messageId,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        details: {
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[EmailController] Errore non gestito: ${error.message}`, error);

      logAuthFailure({
        reason: error.message,
        method: 'sendEmail',
        statusCode: 500,
        userId
      });

      res.status(500).json({
        success: false,
        error: 'Errore interno',
        message: error.message,
        duration_ms: duration
      });
    }
  }

  /**
   * Testa la configurazione SMTP dell'utente
   * POST /monday/testSMTP
   */
  static async testSMTP(req, res) {
    try {
      const userId = req.monday?.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID mancante'
        });
      }

      console.log(`[EmailController] Test SMTP per user: ${userId}`);

      // Recupera credenziali
      const credentials = await IntegrationCredentials.findByUserIdWithPassword(userId);

      if (!credentials) {
        return res.status(401).json({
          success: false,
          error: 'Credenziali non configurate'
        });
      }

      // Crea transporter
      const transporter = this.createSMTPTransport(credentials);

      // Verifica connessione
      console.log(`[EmailController] Verificando connessione SMTP...`);
      try {
        await transporter.verify();
        console.log(`[EmailController] Connessione SMTP verificata con successo`);

        res.status(200).json({
          success: true,
          message: 'Configurazione SMTP valida',
          details: {
            host: credentials.smtp_host,
            port: credentials.smtp_port,
            email: credentials.aruba_email
          }
        });
      } catch (verifyError) {
        console.error(`[EmailController] Errore verifica SMTP: ${verifyError.message}`);

        res.status(401).json({
          success: false,
          error: 'Configurazione SMTP non valida',
          message: verifyError.message
        });
      }
    } catch (error) {
      console.error(`[EmailController] Errore test SMTP: ${error.message}`);

      res.status(500).json({
        success: false,
        error: 'Errore interno',
        message: error.message
      });
    }
  }
}

module.exports = EmailController;
