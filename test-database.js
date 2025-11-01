require('dotenv').config();
const IntegrationCredentials = require('./models/IntegrationCredentials');

console.log('\n=== TEST DATABASE (SUPABASE / POSTGRES) ===\n');

const run = async () => {
  try {
    // Test 1: Crea credenziali
    console.log('1. Creando credenziali utente...');
    const created = await IntegrationCredentials.create({
      userId: 'user_123456',
      accountId: 'account_789',
      aruba_email: 'test@aruba.it',
      aruba_password: 'SecurePassword123!@#',
      smtp_host: 'mail.aruba.it',
      smtp_port: 465
    });
    console.log('✓ Credenziali create:', {
      id: created.id,
      userId: created.userId,
      accountId: created.accountId,
      arubaEmail: created.arubaEmail
    });

    // Test 2: Recupera credenziali (senza password)
    console.log('\n2. Recuperando credenziali (senza password in chiaro)...');
    const found = await IntegrationCredentials.findByUserId('user_123456');
    console.log('✓ Credenziali trovate:', found);

    // Test 3: Recupera credenziali con password decriptata
    console.log('\n3. Recuperando credenziali con password decriptata...');
    const foundWithPassword = await IntegrationCredentials.findByUserIdWithPassword('user_123456');
    console.log('✓ Password decriptata:', foundWithPassword.aruba_password);
    console.log('✓ Verifica password corretta:', foundWithPassword.aruba_password === 'SecurePassword123!@#');

    // Test 4: Aggiorna credenziali
    console.log('\n4. Aggiornando credenziali...');
    await IntegrationCredentials.update('user_123456', {
      aruba_email: 'newemail@aruba.it',
      aruba_password: 'NewSecurePassword456!@#'
    });
    console.log('✓ Credenziali aggiornate');

    // Test 5: Verifica aggiornamento password
    console.log('\n5. Verificando password aggiornata...');
    const foundUpdated = await IntegrationCredentials.findByUserIdWithPassword('user_123456');
    console.log('✓ Nuova password decriptata:', foundUpdated.aruba_password);
    console.log('✓ Verifica password aggiornata:', foundUpdated.aruba_password === 'NewSecurePassword456!@#');

    // Test 6: Crea altro utente
    console.log('\n6. Creando secondo utente...');
    await IntegrationCredentials.create({
      userId: 'user_654321',
      accountId: 'account_321',
      aruba_email: 'test2@aruba.it',
      aruba_password: 'AnotherPassword789!@#'
    });
    console.log('✓ Secondo utente creato');

    // Test 7: Recupera tutti
    console.log('\n7. Recuperando tutti gli utenti...');
    const allCredentials = await IntegrationCredentials.findAll();
    console.log(`✓ Totale utenti salvati: ${allCredentials.length}`);
    console.log('✓ Utenti:', allCredentials);

    // Test 8: Conta
    console.log('\n8. Contando credenziali...');
    const count = await IntegrationCredentials.count();
    console.log(`✓ Numero credenziali: ${count}`);

    // Test 9: Elimina
    console.log('\n9. Eliminando credenziali utente...');
    await IntegrationCredentials.delete('user_654321');
    console.log('✓ Eliminato');

    // Test 10: Verifica eliminazione
    console.log('\n10. Verificando eliminazione...');
    const deletedFind = await IntegrationCredentials.findByUserId('user_654321');
    console.log('✓ Credenziali trovate dopo eliminazione:', deletedFind === null ? 'Nessuna (corretto!)' : 'Trovate (errore!)');

    // Test 11: Prova a creare duplicate (deve fallire)
    console.log('\n11. Provando a creare credenziali duplicate...');
    try {
      await IntegrationCredentials.create({
        userId: 'user_123456',
        accountId: 'account_999',
        aruba_email: 'duplicate@aruba.it',
        aruba_password: 'DummyPassword'
      });
      console.log('✗ ERRORE: Dovrebbe aver lanciato un errore per duplicati');
    } catch (error) {
      console.log('✓ Errore catturato correttamente:', error.message);
    }

    console.log('\n=== TUTTI I TEST PASSATI CON SUCCESSO ===\n');
  } catch (error) {
    console.error('✗ ERRORE:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await IntegrationCredentials.disconnect();
  }
};

run();
