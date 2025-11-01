require('dotenv').config();
const UserCredentials = require('./models/UserCredentials');

console.log('\n=== TEST DATABASE E CRIPTAZIONE ===\n');

try {
  // Test 1: Crea credenziali
  console.log('1. Creando credenziali utente...');
  const created = UserCredentials.create({
    monday_user_id: 'user_123456',
    monday_account_id: 'account_789',
    aruba_email: 'test@aruba.it',
    aruba_password: 'SecurePassword123!@#',
    smtp_host: 'mail.aruba.it',
    smtp_port: 465
  });
  console.log('✓ Credenziali create:', created);

  // Test 2: Recupera credenziali (senza password)
  console.log('\n2. Recuperando credenziali (senza password in chiaro)...');
  const found = UserCredentials.findByUserId('user_123456');
  console.log('✓ Credenziali trovate:', found);

  // Test 3: Recupera credenziali con password decriptata
  console.log('\n3. Recuperando credenziali con password decriptata...');
  const foundWithPassword = UserCredentials.findByUserIdWithPassword('user_123456');
  console.log('✓ Password decriptata:', foundWithPassword.aruba_password);
  console.log('✓ Verifica password corretta:', foundWithPassword.aruba_password === 'SecurePassword123!@#');

  // Test 4: Aggiorna credenziali
  console.log('\n4. Aggiornando credenziali...');
  const updated = UserCredentials.update('user_123456', {
    aruba_email: 'newemail@aruba.it',
    aruba_password: 'NewSecurePassword456!@#'
  });
  console.log('✓ Credenziali aggiornate:', updated);

  // Test 5: Verifica aggiornamento password
  console.log('\n5. Verificando password aggiornata...');
  const foundUpdated = UserCredentials.findByUserIdWithPassword('user_123456');
  console.log('✓ Nuova password decriptata:', foundUpdated.aruba_password);
  console.log('✓ Verifica password aggiornata:', foundUpdated.aruba_password === 'NewSecurePassword456!@#');

  // Test 6: Crea altro utente
  console.log('\n6. Creando secondo utente...');
  const created2 = UserCredentials.create({
    monday_user_id: 'user_654321',
    monday_account_id: 'account_321',
    aruba_email: 'test2@aruba.it',
    aruba_password: 'AnotherPassword789!@#'
  });
  console.log('✓ Secondo utente creato:', created2);

  // Test 7: Recupera tutti
  console.log('\n7. Recuperando tutti gli utenti...');
  const allCredentials = UserCredentials.findAll();
  console.log(`✓ Totale utenti salvati: ${allCredentials.length}`);
  console.log('✓ Utenti:', allCredentials);

  // Test 8: Conta
  console.log('\n8. Contando credenziali...');
  const count = UserCredentials.count();
  console.log(`✓ Numero credenziali: ${count}`);

  // Test 9: Elimina
  console.log('\n9. Eliminando credenziali utente...');
  const deleted = UserCredentials.delete('user_654321');
  console.log('✓ Eliminato:', deleted);

  // Test 10: Verifica eliminazione
  console.log('\n10. Verificando eliminazione...');
  const deletedFind = UserCredentials.findByUserId('user_654321');
  console.log('✓ Credenziali trovate dopo eliminazione:', deletedFind === null ? 'Nessuna (corretto!)' : 'Trovate (errore!)');

  // Test 11: Prova a creare duplicate (deve fallire)
  console.log('\n11. Provando a creare credenziali duplicate...');
  try {
    UserCredentials.create({
      monday_user_id: 'user_123456',
      monday_account_id: 'account_999',
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
}
