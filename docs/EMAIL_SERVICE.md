# Email Service - Aruba SMTP Integration

## Panoramica

Il servizio email consente agli utenti autenticati di inviare email tramite le loro credenziali Aruba Mail configurate.

## Endpoint API

### 1. POST /monday/sendEmail

**Descrizione:** Invia un'email usando le credenziali SMTP dell'utente

**Header Richiesto:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body (application/json):**
```json
{
  "recipient_email": "user@example.com",
  "subject": "Email Subject",
  "body": "Email content",
  "cc": "cc@example.com",
  "bcc": "bcc@example.com"
}
```

**Parametri:**
- `recipient_email` (required) - Email destinatario
- `subject` (required) - Oggetto email (max 998 caratteri)
- `body` (required) - Corpo email (testo o JSON)
- `cc` (optional) - CC recipient(s), string o array
- `bcc` (optional) - BCC recipient(s), string o array

**Risposta di Successo (200):**
```json
{
  "success": true,
  "message": "Email inviata con successo",
  "messageId": "...",
  "timestamp": "2025-11-01T14:49:06.123Z",
  "duration_ms": 1234,
  "details": {
    "from": "sender@aruba.it",
    "to": "recipient@example.com",
    "subject": "Email Subject"
  }
}
```

**Errore - Credenziali non configurate (401):**
```json
{
  "success": false,
  "error": "Credenziali non configurate",
  "message": "L'utente non ha configurato le credenziali Aruba. Completare il flusso di autorizzazione."
}
```

**Errore - Autenticazione SMTP fallita (401):**
```json
{
  "success": false,
  "error": "Autenticazione SMTP fallita",
  "message": "Le credenziali Aruba non sono valide. Riconfigurare le credenziali."
}
```

**Errore - Server SMTP non raggiungibile (503):**
```json
{
  "success": false,
  "error": "Server SMTP non raggiungibile",
  "message": "Il server Aruba SMTP non è raggiungibile. Riprovare più tardi."
}
```

**Errore - Parametri invalidi (400):**
```json
{
  "success": false,
  "error": "Parametri invalidi",
  "message": "recipient_email non è valido"
}
```

**Errori Possibili:**
- `400 Bad Request` - Parametri mancanti o invalidi
- `401 Unauthorized` - Token mancante/invalido o credenziali non configurate
- `500 Internal Server Error` - Errore generico invio
- `503 Service Unavailable` - Server SMTP non raggiungibile

**Esempio di Utilizzo (cURL):**
```bash
curl -X POST http://localhost:3000/monday/sendEmail \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_email": "user@example.com",
    "subject": "Test Email",
    "body": "This is a test email",
    "cc": ["cc1@example.com", "cc2@example.com"]
  }'
```

**Esempio JavaScript:**
```javascript
const response = await fetch('/monday/sendEmail', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recipient_email: 'user@example.com',
    subject: 'Test Email',
    body: 'Email content here',
    cc: 'cc@example.com',
    bcc: 'bcc@example.com'
  })
});

const result = await response.json();
if (result.success) {
  console.log(`Email inviata: ${result.messageId}`);
} else {
  console.error(`Errore: ${result.error}`);
}
```

---

### 2. POST /monday/testSMTP

**Descrizione:** Verifica la configurazione SMTP dell'utente

**Header Richiesto:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:** Nessuno

**Risposta di Successo (200):**
```json
{
  "success": true,
  "message": "Configurazione SMTP valida",
  "details": {
    "host": "mail.aruba.it",
    "port": 465,
    "email": "user@aruba.it"
  }
}
```

**Errore - Credenziali non configurate (401):**
```json
{
  "success": false,
  "error": "Credenziali non configurate"
}
```

**Errore - Configurazione non valida (401):**
```json
{
  "success": false,
  "error": "Configurazione SMTP non valida",
  "message": "Invalid login credentials"
}
```

**Esempio di Utilizzo (cURL):**
```bash
curl -X POST http://localhost:3000/monday/testSMTP \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

---

## Validazione Input

### Email Validation
- Formato: `user@domain.com`
- Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Applicato a: recipient_email, cc, bcc

### Subject Validation
- Non vuoto
- Massimo 998 caratteri

### Body Validation
- Non vuoto (stringa o oggetto)

---

## Configurazione SMTP

Le credenziali SMTP vengono recuperate dal database durante il flusso di autorizzazione:

```javascript
{
  smtp_host: "mail.aruba.it",      // Default
  smtp_port: 465,                  // Default
  secure: true,                    // TLS
  auth: {
    user: "user@aruba.it",         // Email
    pass: "encrypted_password"     // Decriptata dal database
  }
}
```

### Timeout e Opzioni
- Connection Timeout: 10 secondi
- Socket Timeout: 10 secondi
- TLS: Abilitato
- Logger: Abilitato se `DEBUG_EMAIL=true`

---

## Error Handling

### Errori JWT
- Token mancante: `401 Unauthorized`
- Token invalido: `401 Unauthorized`
- Token scaduto: `401 Unauthorized`

### Errori Credenziali
- Non configurate: `401 Unauthorized`
- Non valide: `401 Unauthorized`

### Errori SMTP
- Connessione: `503 Service Unavailable`
- Autenticazione: `401 Unauthorized`
- Timeout: `500 Internal Server Error`

### Errori Validazione
- Email invalida: `400 Bad Request`
- Subject mancante: `400 Bad Request`
- Body mancante: `400 Bad Request`

---

## Logging

Il servizio registra:

```
[EmailController] Invio email per user: user_123
[EmailController] Recuperando credenziali per user: user_123
[EmailController] Creando transporter SMTP per test@aruba.it @ mail.aruba.it:465
[EmailController] Invio email: from=test@aruba.it, to=user@example.com, subject="Test Email"
[EmailController] Email inviata con successo: <messageid> (1234ms)
```

### Debug Mode
Abilita debug SMTP:
```bash
DEBUG_EMAIL=true npm start
```

Visualizzerà i log di nodemailer dettagliati.

---

## Sicurezza

### Credenziali
- Password criptate nel database
- Decriptate solo quando necessario
- Mai salvate nei log

### Validazione
- Input validation su tutti i campi
- Email validation con regex
- Limiti di lunghezza

### Autenticazione
- JWT validation obbligatoria
- Token con scadenza

---

## Limiti e Rate Limiting

Attualmente non implementati. Considerare di aggiungere:

```javascript
// Rate limiting per email
- 100 email/ora per utente
- 1000 email/giorno per applicazione
- Throttling per bulk emails
```

---

## Best Practices

### Per gli Sviluppatori

1. **Sempre valida i parametri:**
   ```javascript
   if (!recipient_email || !subject || !body) {
     // Handle error
   }
   ```

2. **Gestisci gli errori:**
   ```javascript
   try {
     const result = await sendEmail();
     if (result.success) {
       // Success handling
     }
   } catch (error) {
     // Error handling
   }
   ```

3. **Usa template per email:**
   ```javascript
   const body = `
     Caro ${userName},

     Questo è un messaggio automatico.

     Saluti,
     Sistema Monday.com - Aruba Integration
   `;
   ```

4. **Test SMTP prima di inviare:**
   ```javascript
   const testResult = await testSMTP();
   if (!testResult.success) {
     // Riconfigurare le credenziali
   }
   ```

### Per gli Utenti

1. Completa il flusso di autorizzazione per configurare le credenziali
2. Testa la configurazione SMTP tramite `/monday/testSMTP`
3. Se il test fallisce, riconfigura le credenziali
4. Invia email tramite `/monday/sendEmail`

---

## Troubleshooting

### "Credenziali non configurate"
- Completare il flusso di autorizzazione
- GET `/monday/authorize`
- Compilare il form
- POST `/monday/save-credentials`

### "Autenticazione SMTP fallita"
- Verificare email e password Aruba
- Riconfigurare le credenziali
- Testare con `/monday/testSMTP`

### "Server SMTP non raggiungibile"
- Verificare la connessione internet
- Verificare che Aruba SMTP sia online
- Riprovare più tardi

### "Email non ricevuta"
- Controllare la cartella SPAM del destinatario
- Verificare l'indirizzo email destinatario
- Controllare i log del server

---

## Testing

Esegui il test suite:
```bash
node test-email-endpoints.js
```

I test coprono:
1. ✓ Errore senza token
2. ✓ Credenziali non configurate
3. ✓ Email invalida
4. ✓ Subject mancante
5. ✓ Body mancante
6. ✓ Test SMTP senza token
7. ✓ Test SMTP credenziali non configurate

Per testare l'invio effettivo:
```javascript
// 1. Configura credenziali
GET /monday/authorize

// 2. Invia email
POST /monday/sendEmail
{
  "recipient_email": "test@example.com",
  "subject": "Test",
  "body": "Test email"
}

// 3. Verifica configurazione
POST /monday/testSMTP
```

---

## Roadmap

- [ ] Template email supportati
- [ ] Allegati email
- [ ] HTML email support
- [ ] Rate limiting
- [ ] Email queue per retry
- [ ] Webhook per delivery status
- [ ] Email tracking
- [ ] Unsubscribe management

