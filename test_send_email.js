const jwt = require('jsonwebtoken');
const https = require('https');

// Usa una signing secret di test
const SECRET = 'test-secret-key';

// Genera token JWT
const token = jwt.sign(
  {
    userId: 'andrea-user-1',
    accountId: '32281405'
  },
  SECRET,
  { expiresIn: '1h' }
);

console.log('Generated Token:', token);
console.log('\n🚀 Testing SMTP with smtp.aruba.it:465 (SSL)...\n');

// Payload da inviare
const payload = JSON.stringify({
  payload: {
    inboundFieldValues: {
      email: {
        subject: 'Test Email - SMTP Port 465',
        body: 'This is a test email from Andrea to verify SMTP smtp.aruba.it:465 configuration with SSL'
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

console.log('Request Details:');
console.log('- URL: https://b03da-service-32281405-f2dd3966.us.monday.app/monday/sendEmail');
console.log('- From: andrea@itsallready.it');
console.log('- To: andrea@itsallready.it');
console.log('- Server: smtp.aruba.it:465 (SSL)');
console.log('\nSending request...\n');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('✅ Response Status:', res.statusCode);
    console.log('Response Data:', data);
    
    if (res.statusCode === 200) {
      console.log('\n🎉 EMAIL SENT SUCCESSFULLY!');
    } else if (res.statusCode === 400 || res.statusCode === 500) {
      console.log('\n❌ ERROR: Check server logs for details');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
});

req.write(payload);
req.end();
