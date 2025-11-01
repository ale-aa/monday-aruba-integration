/**
 * Aruba Mail configuration for nodemailer
 */

module.exports = {
  host: process.env.ARUBA_MAIL_HOST || 'mail.aruba.it',
  port: parseInt(process.env.ARUBA_MAIL_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.ARUBA_MAIL_USER,
    pass: process.env.ARUBA_MAIL_PASSWORD
  },
  from: process.env.ARUBA_MAIL_USER || 'noreply@example.com'
};
