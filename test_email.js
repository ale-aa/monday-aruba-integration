const jwt = require('jsonwebtoken');
const https = require('https');

// Usa una signing secret di test
const SECRET = 'test-secret-key';

// Genera token JWT
const token = jwt.sign(
  {
    userId: 'test-user-1',
    accountId: '32281405'
  },
  SECRET,
  { expiresIn: '1h' }
);

console.log('Generated Token:', token);

// Payload da inviare
const payload = JSON.stringify({
  payload: {
    inboundFieldValues: {
      email: {
        subject: 'Test Email from Andrea',
        body: 'This is a test email to verify SMTP configuration with Aruba Mail Server'
      },
      someone: 'andrea@itsallready.it'
    }
  }
});

// Options per HTTPS
const options = {
  hostname: 'b03da-service-32281405-f2dd3966.us.monday.app',
  path: '/monday/sendEmail',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log('\nSending request...');
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(payload);
req.end();
