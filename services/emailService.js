/**
 * Email Service using Resend API
 * Bypasses Vercel SMTP port blocking by using HTTPS (port 443)
 */

const { Resend } = require('resend');

class EmailService {
  constructor() {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[EmailService] ⚠️ RESEND_API_KEY not configured');
    }
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  /**
   * Invia email tramite Resend API
   * @param {Object} params - Email parameters
   * @param {string} params.to - Recipient email
   * @param {string} params.subject - Email subject
   * @param {string} params.body - Email body (plain text)
   * @param {string} params.from - Sender email (must be verified on Resend)
   * @returns {Promise<Object>} Result with messageId and provider
   */
  async sendEmail({ to, subject, body, from = 'onboarding@resend.dev' }) {
    try {
      console.log('[EmailService] ========================================');
      console.log('[EmailService] Sending via Resend API...');
      console.log('[EmailService] To:', to);
      console.log('[EmailService] From:', from);
      console.log('[EmailService] Subject:', subject);
      console.log('[EmailService] Body length:', body.length);
      console.log('[EmailService] ========================================');

      // Chiama Resend API
      const { data, error } = await this.resend.emails.send({
        from: from,
        to: [to],
        subject: subject,
        html: `<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
          <p>${body.replace(/\n/g, '<br>')}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">Inviato via Resend Email API</p>
        </div>`,
        text: body
      });

      if (error) {
        console.error('[EmailService] ❌ Resend API error:', error);
        throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
      }

      console.log('[EmailService] ✅ Email sent successfully!');
      console.log('[EmailService] Email ID:', data.id);
      console.log('[EmailService] ========================================');

      return {
        success: true,
        messageId: data.id,
        provider: 'resend'
      };
    } catch (error) {
      console.error('[EmailService] ❌ Error sending email:', error.message);
      throw error;
    }
  }
}

module.exports = new EmailService();
