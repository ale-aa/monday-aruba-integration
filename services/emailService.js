const { Resend } = require('resend');

class EmailService {
  constructor() {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      console.warn('[EmailService] RESEND_API_KEY not configured — emails will be skipped');
      this.resend = null;
      return;
    }

    this.resend = new Resend(apiKey.trim());
  }

  /**
   * Invia un'email tramite Resend API
   * @param {Object} options - Opzioni email
   * @param {string} options.to - Email destinatario
   * @param {string} options.subject - Subject dell'email
   * @param {string} options.body - Corpo dell'email (testo semplice o HTML)
   * @param {string} options.from - Email mittente
   * @returns {Promise<{messageId: string, id: string}>}
   */
  async sendEmail({ to, subject, body, from = 'onboarding@resend.dev' }) {
    if (!this.resend) {
      throw new Error('RESEND_API_KEY non configurata');
    }

    console.log('[EmailService] Sending email via Resend API');
    console.log('  - To:', to);
    console.log('  - Subject:', subject);
    console.log('  - From:', from);

    try {
      const response = await this.resend.emails.send({
        from: from,
        to: to,
        subject: subject,
        html: body, // Resend API usa 'html' per il corpo del messaggio
      });

      console.log('[EmailService] Email sent successfully. Response ID:', response.id);

      // Ritorna con 'messageId' per compatibilità con il controller
      return {
        messageId: response.id,
        id: response.id,
        ...response
      };
    } catch (error) {
      console.error('[EmailService] Resend API error:', error);
      throw new Error(`Resend API error: ${error.message}`);
    }
  }
}

module.exports = EmailService;
