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

    // Validazione recipient_email
    if (!recipient_email || !recipient_email.trim()) {
      throw new Error('recipient_email è obbligatorio');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient_email.trim())) {
      throw new Error('recipient_email non è valido');
    }

    // Validazione subject
    if (!subject || !subject.trim()) {
      throw new Error('subject è obbligatorio');
    }

    if (subject.trim().length > 998) {
      throw new Error('subject non può superare 998 caratteri');
    }

    // Validazione body
    if (!body || (typeof body === 'string' && !body.trim())) {
      throw new Error('body è obbligatorio');
    }

    // Validazione cc (opzionale)
    if (cc) {
      const ccArray = Array.isArray(cc) ? cc : [cc];
      for (const email of ccArray) {
        if (email && !emailRegex.test(email.trim())) {
          throw new Error(`Email CC non valida: ${email}`);
        }
      }
    }

    // Validazione bcc (opzionale)
    if (bcc) {
      const bccArray = Array.isArray(bcc) ? bcc : [bcc];
      for (const email of bccArray) {
        if (email && !emailRegex.test(email.trim())) {
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

    console.log(
      `[EmailController] Creando transporter SMTP per ${aruba_email} @ ${smtp_host}:${smtp_port}`
    );

    // Crea transporter nodemailer
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: true, // TLS
      auth: {
        user: aruba_email,
        pass: aruba_password
      },
      // Opzioni aggiuntive
      logger: process.env.DEBUG_EMAIL === 'true',
      debug: process.env.DEBUG_EMAIL === 'true',
      connectionTimeout: 10000,
      socketTimeout: 10000
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
      console.log('[EmailController] === FULL REQUEST DEBUG ===');
      console.log('[EmailController] req.body:', JSON.stringify(req.body, null, 2));

      // Check for Monday.com specific payload structures
      const payload = req.body.payload || req.body;
      const inputFields = req.body.inputFields || [];
      const inboundFieldValues = req.body.inboundFieldValues || {};

      console.log('[EmailController] payload:', JSON.stringify(payload, null, 2));
      console.log('[EmailController] inputFields:', JSON.stringify(inputFields, null, 2));
      console.log('[EmailController] inboundFieldValues:', JSON.stringify(inboundFieldValues, null, 2));
      console.log('[EmailController] === END FULL REQUEST DEBUG ===');

      // FLEXIBLE FIELD EXTRACTION with fallback chains
      // Try multiple possible field names and locations
      let recipient_email =
        req.body.recipient_email ||
        req.body.email ||
        req.body.to ||
        req.body.recipient ||
        payload.recipient_email ||
        payload.email ||
        payload.to ||
        payload.recipient ||
        inboundFieldValues.recipient_email ||
        inboundFieldValues.email ||
        inboundFieldValues.to ||
        inboundFieldValues.recipient ||
        null;

      let subject =
        req.body.subject ||
        payload.subject ||
        inboundFieldValues.subject ||
        null;

      let body =
        req.body.body ||
        req.body.content ||
        req.body.message ||
        payload.body ||
        payload.content ||
        payload.message ||
        inboundFieldValues.body ||
        inboundFieldValues.content ||
        inboundFieldValues.message ||
        null;

      let cc = req.body.cc || payload.cc || inboundFieldValues.cc || null;
      let bcc = req.body.bcc || payload.bcc || inboundFieldValues.bcc || null;

      // DEBUG: Log extracted values
      console.log('[EmailController] === EXTRACTED FIELDS ===');
      console.log('[EmailController] recipient_email:', recipient_email);
      console.log('[EmailController] subject:', subject);
      console.log('[EmailController] body:', body ? (typeof body === 'string' ? body.substring(0, 100) : JSON.stringify(body).substring(0, 100)) : null);
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
      console.log(`[EmailController] Retrieving credentials for userId: ${userId}`);
      const credentials = await IntegrationCredentials.findByUserIdWithPassword(userId);

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
