require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');
const querystring = require('querystring');

console.log('\n=== TEST AUTHORIZATION ENDPOINTS ===\n');

const MONDAY_CLIENT_SECRET = process.env.MONDAY_CLIENT_SECRET;
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
            body: data,
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
      req.write(body);
    }
    req.end();
  });
};

/**
 * Esegui i test
 */
const runTests = async () => {
  try {
    console.log('1. Test: GET /monday/authorize - Token valido\n');
    const authToken = jwt.sign(
      { userId: 'user_test_123', accountId: 'acc_test_456' },
      MONDAY_CLIENT_SECRET,
      { expiresIn: '1h' }
    );
    const backToUrl = encodeURIComponent('https://example.com/callback');
    const authorizeUrl = `/monday/authorize?token=${authToken}&backToUrl=${backToUrl}`;

    const test1 = await testEndpoint({
      hostname: 'localhost',
      port: 3000,
      path: authorizeUrl,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`Status: ${test1.status}`);
    console.log(`✓ Form caricato: ${test1.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Form contiene campo email: ${test1.body.includes('email') ? 'PASS' : 'FAIL'}\n`);

    console.log('2. Test: GET /monday/authorize - Token mancante\n');
    const test2 = await testEndpoint({
      hostname: 'localhost',
      port: 3000,
      path: '/monday/authorize',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`Status: ${test2.status}`);
    console.log(`✓ Errore 400: ${test2.status === 400 ? 'PASS' : 'FAIL'}\n`);

    console.log('3. Test: POST /monday/save-credentials - Salva credenziali\n');
    const formData = querystring.stringify({
      userId: 'user_test_123',
      accountId: 'acc_test_456',
      email: 'test@aruba.it',
      password: 'TestPassword123!',
      smtp_host: 'mail.aruba.it',
      smtp_port: '465',
      backToUrl: ''
    });

    const test3 = await testEndpoint({
      hostname: 'localhost',
      port: 3000,
      path: '/monday/save-credentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': formData.length
      }
    }, formData);

    console.log(`Status: ${test3.status}`);
    console.log(`Response:`, test3.body.substring(0, 200));
    console.log(`✓ Salvataggio riuscito: ${test3.status === 201 ? 'PASS' : 'FAIL'}\n`);

    console.log('4. Test: POST /monday/getUserCredentials - Recupera credenziali (con token valido)\n');
    const getUserToken = jwt.sign(
      { userId: 'user_test_123', accountId: 'acc_test_456' },
      MONDAY_SIGNING_SECRET,
      { expiresIn: '1h' }
    );

    const test4 = await testEndpoint({
      hostname: 'localhost',
      port: 3000,
      path: '/monday/getUserCredentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getUserToken}`
      }
    });

    console.log(`Status: ${test4.status}`);
    let resp4 = {};
    try {
      resp4 = JSON.parse(test4.body);
      console.log(`Response:`, JSON.stringify(resp4, null, 2));
    } catch (e) {
      console.log(`Response:`, test4.body);
    }
    console.log(`✓ Credenziali recuperate: ${test4.status === 200 && resp4.exists ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Password non ritornata: ${!resp4.password ? 'PASS' : 'FAIL'}\n`);

    console.log('5. Test: POST /monday/getUserCredentials - Senza token\n');
    const test5 = await testEndpoint({
      hostname: 'localhost',
      port: 3000,
      path: '/monday/getUserCredentials',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`Status: ${test5.status}`);
    console.log(`✓ Errore 401: ${test5.status === 401 ? 'PASS' : 'FAIL'}\n`);

    console.log('6. Test: POST /monday/deleteUserCredentials - Elimina credenziali\n');
    const deleteToken = jwt.sign(
      { userId: 'user_test_123', accountId: 'acc_test_456' },
      MONDAY_SIGNING_SECRET,
      { expiresIn: '1h' }
    );

    const test6 = await testEndpoint({
      hostname: 'localhost',
      port: 3000,
      path: '/monday/deleteUserCredentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deleteToken}`
      }
    });

    console.log(`Status: ${test6.status}`);
    let resp6 = {};
    try {
      resp6 = JSON.parse(test6.body);
      console.log(`Response:`, JSON.stringify(resp6, null, 2));
    } catch (e) {
      console.log(`Response:`, test6.body);
    }
    console.log(`✓ Eliminazione riuscita: ${test6.status === 200 && resp6.success ? 'PASS' : 'FAIL'}\n`);

    console.log('7. Test: Verifica eliminazione - getUserCredentials per user eliminato\n');
    const verifyToken = jwt.sign(
      { userId: 'user_test_123', accountId: 'acc_test_456' },
      MONDAY_SIGNING_SECRET,
      { expiresIn: '1h' }
    );

    const test7 = await testEndpoint({
      hostname: 'localhost',
      port: 3000,
      path: '/monday/getUserCredentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${verifyToken}`
      }
    });

    console.log(`Status: ${test7.status}`);
    let resp7 = {};
    try {
      resp7 = JSON.parse(test7.body);
      console.log(`Response:`, JSON.stringify(resp7, null, 2));
    } catch (e) {
      console.log(`Response:`, test7.body);
    }
    console.log(`✓ Credenziali eliminate: ${test7.status === 200 && !resp7.exists ? 'PASS' : 'FAIL'}\n`);

    console.log('=== TEST COMPLETATI ===\n');
    process.exit(0);

  } catch (error) {
    console.error('Errore durante i test:', error.message);
    console.error('\nAssicurati che il server sia in esecuzione su http://localhost:3000');
    process.exit(1);
  }
};

// Aspetta un momento per assicurarti che il server sia pronto
setTimeout(runTests, 500);
