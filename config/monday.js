/**
 * Monday.com configuration
 */

module.exports = {
  clientSecret: process.env.MONDAY_CLIENT_SECRET,
  signingSecret: process.env.MONDAY_SIGNING_SECRET,
  apiUrl: 'https://api.monday.com/v2',
  webhookUrl: process.env.WEBHOOK_URL || 'http://localhost:3000/webhooks/monday'
};
