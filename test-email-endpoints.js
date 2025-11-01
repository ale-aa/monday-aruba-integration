require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');

console.log('\n=== TEST EMAIL ENDPOINTS ===\n');

const MONDAY_SIGNING_SECRET = process.env.MONDAY_SIGNING_SECRET;

/**
 * Testa un endpoint HTTP
 */
const testEndpoint = (options, body = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data),
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

/**
 * Esegui i test
 */
const runTests = async () => {
  try {
    console.log('1. Test: POST /monday/sendEmail - Senza token\n');
    const test1 = await testEndpoint({
      hostname: 'localhost',
      port: 3000,
      path: '/monday/sendEmail',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      recipient_email: 'test@example.com',
      subject: 'Test',
      body: 'Test email'
    });

    console.log(`Status: ${test1.status}`);
    console.log(`Response:`, test1.body);
    console.log(`✓ Errore 401: ${test1.status === 401 ? 'PASS' : 'FAIL'}\n`);

    console.log('2. Test: POST /monday/sendEmail - Token valido ma credenziali non configurate\n');
    const token = jwt.sign(
      { userId: 'user_no_creds_999', accountId: 'acc_999' },
      MONDAY_SIGNING_SECRET,
      { expiresIn: '1h' }
    );

    const test2 = await testEndpoint({
      hostname: 'localhost',
      port: 3000,
      path: '/monday/sendEmail',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      recipient_email: 'test@example.com',
      subject: 'Test',
      body: 'Test email'
    });

    console.log(`Status: ${test2.status}`);
    console.log(`Response:`, test2.body);
    console.log(`✓ Credenziali non configurate (401): ${test2.status === 401 ? 'PASS' : 'FAIL'}\n`);

    console.log('3. Test: POST /monday/sendEmail - Email invalida\n');
    const test3 = await testEndpoint({
      hostname: 'localhost',
      port: 3000,
      path: '/monday/sendEmail',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      recipient_email: 'invalid-email',
      subject: 'Test',
      body: 'Test email'
    });

    console.log(`Status: ${test3.status}`);
    console.log(`Response:`, test3.body);
    console.log(`✓ Validazione email (400): ${test3.status === 400 ? 'PASS' : 'FAIL'}\n`);

    console.log('4. Test: POST /monday/sendEmail - Subject mancante\n');
    const test4 = await testEndpoint({
      hostname: 'localhost',
      port: 3000,
      path: '/monday/sendEmail',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      recipient_email: 'test@example.com',
      body: 'Test email'
    });

    console.log(`Status: ${test4.status}`);
    console.log(`Response:`, test4.body);
    console.log(`✓ Subject obbligatorio (400): ${test4.status === 400 ? 'PASS' : 'FAIL'}\n`);

    console.log('5. Test: POST /monday/sendEmail - Body mancante\n');
    const test5 = await testEndpoint({
      hostname: 'localhost',
      port: 3000,
      path: '/monday/sendEmail',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      recipient_email: 'test@example.com',
      subject: 'Test'
    });

    console.log(`Status: ${test5.status}`);
    console.log(`Response:`, test5.body);
    console.log(`✓ Body obbligatorio (400): ${test5.status === 400 ? 'PASS' : 'FAIL'}\n`);

    console.log('6. Test: POST /monday/testSMTP - Senza token\n');
    const test6 = await testEndpoint({
      hostname: 'localhost',
      port: 3000,
      path: '/monday/testSMTP',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`Status: ${test6.status}`);
    console.log(`Response:`, test6.body);
    console.log(`✓ Errore 401: ${test6.status === 401 ? 'PASS' : 'FAIL'}\n`);

    console.log('7. Test: POST /monday/testSMTP - Token valido ma credenziali non configurate\n');
    const test7 = await testEndpoint({
      hostname: 'localhost',
      port: 3000,
      path: '/monday/testSMTP',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Status: ${test7.status}`);
    console.log(`Response:`, test7.body);
    console.log(`✓ Credenziali non configurate (401): ${test7.status === 401 ? 'PASS' : 'FAIL'}\n`);

    console.log('=== TEST COMPLETATI ===\n');
    console.log('Nota: I test di invio email reale richiedono credenziali Aruba valide.');
    console.log('Per testare l\'invio effettivo:');
    console.log('  1. Configura le credenziali via GET /monday/authorize');
    console.log('  2. Invia email con POST /monday/sendEmail');
    console.log('  3. Verifica la configurazione con POST /monday/testSMTP\n');

    process.exit(0);

  } catch (error) {
    console.error('Errore durante i test:', error.message);
    console.error('\nAssicurati che il server sia in esecuzione su http://localhost:3000');
    process.exit(1);
  }
};

// Aspetta un momento per assicurarti che il server sia pronto
setTimeout(runTests, 500);
