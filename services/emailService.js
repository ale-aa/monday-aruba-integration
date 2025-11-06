const nodemailer = require('nodemailer');
const { Resend } = require('resend');

class EmailService {
  constructor() {
    // Inizializza Resend come fallback
    const resendApiKey = process.env.RESEND_API_KEY;
    this.resend = resendApiKey ? new Resend(resendApiKey) : null;

    if (this.resend) {
      console.log('[EmailService] Initialized with Resend fallback');
    } else {
      console.log('[EmailService] Initialized (Resend API not configured)');
    }
  }

  /**
   * Invia un'email tramite SMTP di Aruba
   * @param {Object} options - Opzioni email
   * @param {string} options.to - Email destinatario
   * @param {string} options.subject - Subject dell'email
   * @param {string} options.body - Corpo dell'email (testo semplice o HTML)
   * @param {string} options.from - Email mittente (email Aruba dell'utente)
   * @param {string} options.arubaEmail - Email Aruba (username per SMTP)
   * @param {string} options.arubaPassword - Password Aruba (password per SMTP)
   * @param {string} options.smtpHost - SMTP host (default: smtps.aruba.it)
   * @param {number} options.smtpPort - SMTP port (default: 465)
   * @returns {Promise<{messageId: string, response: string}>}
   */
  async sendEmail({
    to,
    subject,
    body,
    from,
    arubaEmail,
    arubaPassword,
    smtpHost = 'smtps.aruba.it',
    smtpPort = 465
  }) {
    if (!arubaEmail || !arubaPassword) {
      throw new Error('Credenziali Aruba mancanti (email e password richieste)');
    }

    if (!from) {
      throw new Error('Email mittente (from) mancante');
    }

    console.log('[EmailService] ========================================');
    console.log('[EmailService] Sending email via Aruba SMTP');
    console.log('[EmailService] SMTP Host:', smtpHost);
    console.log('[EmailService] SMTP Port:', smtpPort);
    console.log('[EmailService] From:', from);
    console.log('[EmailService] To:', to);
    console.log('[EmailService] Subject:', subject);
    console.log('[EmailService] ========================================');

    try {
      // Crea transporter SMTP di Aruba con SSL/TLS
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: true, // true per porta 465, false per altri (useSTARTTLS)
        auth: {
          user: arubaEmail,
          pass: arubaPassword
        },
        connectionTimeout: 10000, // 10 secondi
        socketTimeout: 10000, // 10 secondi
        logger: true,
        debug: true
      });

      // Verifica la connessione
      console.log('[EmailService] Verifying SMTP connection...');
      try {
        await transporter.verify();
        console.log('[EmailService] ✓ SMTP connection verified');
      } catch (verifyError) {
        console.error('[EmailService] ⚠️ SMTP verification failed:', verifyError.message);
        console.error('[EmailService] SMTP Config:', {
          host: smtpHost,
          port: smtpPort,
          user: arubaEmail.substring(0, 3) + '***' // Nasconde la password
        });
        // Continua anche se verify fallisce - potrebbe essere un problema di timeout
      }

      // Invia l'email
      const mailOptions = {
        from: from, // Email Aruba dell'utente come mittente
        to: to,
        subject: subject,
        html: body
      };

      console.log('[EmailService] Sending mail...');
      const info = await transporter.sendMail(mailOptions);

      console.log('[EmailService] ✅ Email sent successfully via SMTP!');
      console.log('[EmailService] Response:', info.response);
      console.log('[EmailService] Message ID:', info.messageId);

      // Chiudi la connessione
      transporter.close();

      return {
        messageId: info.messageId || 'no-message-id',
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
        provider: 'smtp'
      };
    } catch (smtpError) {
      console.error('[EmailService] ❌ SMTP error:', smtpError.message);
      console.error('[EmailService] SMTP Error code:', smtpError.code);

      // Fallback a Resend se SMTP fallisce
      if (this.resend) {
        console.log('[EmailService] Attempting Resend API fallback...');
        try {
          const resendPayload = {
            from: 'onboarding@resend.dev',
            to: to,
            subject: subject,
            html: body
          };

          const resendResponse = await this.resend.emails.send(resendPayload);

          console.log('[EmailService] ✅ Email sent successfully via Resend (fallback)!');
          console.log('[EmailService] Resend Message ID:', resendResponse.id);

          return {
            messageId: resendResponse.id,
            response: 'Sent via Resend fallback',
            accepted: [to],
            rejected: [],
            provider: 'resend_fallback'
          };
        } catch (resendError) {
          console.error('[EmailService] ❌ Resend fallback also failed:', resendError.message);
          throw new Error(`Both SMTP and Resend failed. SMTP: ${smtpError.message}, Resend: ${resendError.message}`);
        }
      } else {
        throw new Error(`SMTP error (${smtpError.code}): ${smtpError.message}`);
      }
    }
  }
}

module.exports = EmailService;
