require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');

console.log('\n=== TEST JWT VALIDATION MIDDLEWARE ===\n');

// Recupera i secret dalle variabili d'ambiente
const MONDAY_SIGNING_SECRET = process.env.MONDAY_SIGNING_SECRET || 'test_signing_secret_123456';
const MONDAY_CLIENT_SECRET = process.env.MONDAY_CLIENT_SECRET || 'test_client_secret_123456';

/**
 * Genera un token JWT valido
 * @param {string} secret - Secret per firmare il token
 * @param {Object} payload - Payload del token
 * @param {string} expiresIn - Tempo di scadenza
 * @returns {string} Token JWT
 */
const generateToken = (secret, payload, expiresIn = '24h') => {
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Testa un endpoint con un token
 * @param {string} token - Token da inviare
 * @param {string} endpoint - Endpoint da testare
 * @param {string} method - Metodo HTTP
 * @returns {Promise<Object>} Risposta del server
 */
const testEndpoint = (token, endpoint, method = 'GET') => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Aggiungi il token se fornito
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

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

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
};

/**
 * Esegui i test
 */
const runTests = async () => {
  try {
    console.log('1. Test: Richiesta senza token a /api/monday/test\n');
    const test1 = await testEndpoint(null, '/api/monday/test');
    console.log(`Status: ${test1.status}`);
    console.log(`Response:`, test1.body);
    console.log(`✓ Errore 401 corretto: ${test1.status === 401 ? 'PASS' : 'FAIL'}\n`);

    console.log('2. Test: Token con formato invalido a /api/monday/test\n');
    const test2 = await testEndpoint('invalid_format_token', '/api/monday/test');
    console.log(`Status: ${test2.status}`);
    console.log(`Response:`, test2.body);
    console.log(`✓ Errore 401 per formato invalido: ${test2.status === 401 ? 'PASS' : 'FAIL'}\n`);

    console.log('3. Test: Token valido con SIGNING_SECRET\n');
    const validPayload = {
      userId: 'user_12345',
      accountId: 'account_67890',
      shortLivedToken: 'slt_xyz123'
    };
    const validToken = generateToken(MONDAY_SIGNING_SECRET, validPayload);
    console.log(`Token generato (primi 50 char): ${validToken.substring(0, 50)}...`);
    const test3 = await testEndpoint(validToken, '/api/monday/test');
    console.log(`Status: ${test3.status}`);
    console.log(`Response:`, test3.body);
    console.log(`✓ Autenticazione riuscita: ${test3.status === 404 ? 'PASS' : 'FAIL'} (404 è atteso per endpoint non trovato)\n`);

    console.log('4. Test: Token scaduto\n');
    const expiredToken = generateToken(MONDAY_SIGNING_SECRET, validPayload, '0s');
    // Aspetta 1 secondo per far scadere il token
    await new Promise(resolve => setTimeout(resolve, 1100));
    const test4 = await testEndpoint(expiredToken, '/api/monday/test');
    console.log(`Status: ${test4.status}`);
    console.log(`Response:`, test4.body);
    console.log(`✓ Errore 401 per token scaduto: ${test4.status === 401 ? 'PASS' : 'FAIL'}\n`);

    console.log('5. Test: Token firmato con secret diverso\n');
    const wrongToken = generateToken('wrong_secret_xyz', validPayload);
    const test5 = await testEndpoint(wrongToken, '/api/monday/test');
    console.log(`Status: ${test5.status}`);
    console.log(`Response:`, test5.body);
    console.log(`✓ Errore 401 per secret diverso: ${test5.status === 401 ? 'PASS' : 'FAIL'}\n`);

    console.log('6. Test: Token valido con CLIENT_SECRET\n');
    const clientPayload = {
      userId: 'user_oauth_123',
      clientId: 'client_abc',
      scope: 'read write'
    };
    const clientToken = generateToken(MONDAY_CLIENT_SECRET, clientPayload);
    console.log(`Token generato (primi 50 char): ${clientToken.substring(0, 50)}...`);
    const test6 = await testEndpoint(clientToken, '/api/auth/test');
    console.log(`Status: ${test6.status}`);
    console.log(`Response:`, test6.body);
    console.log(`✓ Autenticazione CLIENT_SECRET riuscita: ${test6.status === 404 ? 'PASS' : 'FAIL'}\n`);

    console.log('7. Test: Health check (senza autenticazione)\n');
    const test7 = await testEndpoint(null, '/health');
    console.log(`Status: ${test7.status}`);
    console.log(`Response:`, test7.body);
    console.log(`✓ Health check accessibile: ${test7.status === 200 ? 'PASS' : 'FAIL'}\n`);

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
