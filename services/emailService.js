const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Non abbiamo bisogno di inizializzare nulla qui
    // Le credenziali verranno passate al metodo sendEmail
    console.log('[EmailService] Initialized (credentials will be passed per-call)');
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
        logger: true,
        debug: true
      });

      // Verifica la connessione
      console.log('[EmailService] Verifying SMTP connection...');
      await transporter.verify();
      console.log('[EmailService] ✓ SMTP connection verified');

      // Invia l'email
      const mailOptions = {
        from: from, // Email Aruba dell'utente come mittente
        to: to,
        subject: subject,
        html: body
      };

      console.log('[EmailService] Sending mail...');
      const info = await transporter.sendMail(mailOptions);

      console.log('[EmailService] ✅ Email sent successfully!');
      console.log('[EmailService] Response:', info.response);
      console.log('[EmailService] Message ID:', info.messageId);

      // Chiudi la connessione
      transporter.close();

      return {
        messageId: info.messageId || 'no-message-id',
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      };
    } catch (error) {
      console.error('[EmailService] ❌ SMTP error:', error.message);
      console.error('[EmailService] Error code:', error.code);
      console.error('[EmailService] Error details:', error);
      throw new Error(`SMTP error (${error.code}): ${error.message}`);
    }
  }
}

module.exports = EmailService;
