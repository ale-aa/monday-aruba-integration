# Flusso di Autorizzazione - Monday.com & Aruba Mail

## Panoramica

Il flusso di autorizzazione consente agli utenti di Monday.com di collegare le proprie credenziali Aruba Mail all'applicazione.

### Diagramma del Flusso

```
┌─────────────┐
│  Monday.com │
│   User      │
└──────┬──────┘
       │
       │ 1. Generate JWT Token (CLIENT_SECRET)
       │    + redirect URL
       │
       ▼
┌──────────────────────┐
│  /monday/authorize   │  (GET)
│  ├─ token=JWT        │
│  └─ backToUrl=URL    │
└──────┬───────────────┘
       │
       │ 2. Verify JWT
       │    Decode userId, accountId
       │
       ▼
┌──────────────────────┐
│  HTML Form           │
│  ├─ Email Aruba      │
│  ├─ Password Aruba   │
│  ├─ SMTP Host        │
│  └─ SMTP Port        │
└──────┬───────────────┘
       │
       │ 3. User fills form
       │    and submits
       │
       ▼
┌─────────────────────────┐
│ POST /save-credentials  │
│ ├─ email               │
│ ├─ password            │
│ ├─ smtp_host           │
│ └─ smtp_port           │
└──────┬──────────────────┘
       │
       │ 4. Validate input
       │    Encrypt password
       │    Save to database
       │
       ▼
┌──────────────────┐
│ Redirect to      │
│ backToUrl        │
│ +success param   │
└──────────────────┘
```

## Endpoint API

### 1. GET /monday/authorize

**Descrizione:** Mostra il form di configurazione credenziali Aruba

**Parametri Query:**
- `token` (required): JWT token da decodificare con MONDAY_CLIENT_SECRET
- `backToUrl` (optional): URL a cui redirezionare dopo il salvataggio

**Header Richiesto:**
```
Content-Type: application/json
```

**Risposta di Successo (200):**
```html
<!-- HTML form con campi email, password, smtp_host, smtp_port -->
```

**Risposta di Errore (400):**
```json
{
  "error": "Token mancante",
  "message": "Parametro query \"token\" richiesto"
}
```

**Errori Possibili:**
- `400 Bad Request` - Token mancante o parametri invalidi
- `401 Unauthorized` - Token non valido
- `500 Internal Server Error` - Errore server

**Esempio di Utilizzo:**
```bash
GET /monday/authorize?token=eyJhbGc...&backToUrl=https%3A%2F%2Fexample.com%2Fcallback
```

---

### 2. POST /monday/save-credentials

**Descrizione:** Salva le credenziali Aruba per l'utente

**Content-Type:** `application/x-www-form-urlencoded`

**Parametri Body:**
```
userId          (required) - Monday user ID
accountId       (required) - Monday account ID
email           (required) - Email Aruba
password        (required) - Password Aruba
smtp_host       (optional) - Server SMTP (default: mail.aruba.it)
smtp_port       (optional) - Porta SMTP (default: 465)
backToUrl       (optional) - URL di ritorno
```

**Risposta di Successo (201):**
```json
{
  "success": true,
  "message": "Credenziali salvate con successo",
  "user": {
    "userId": "user_123",
    "accountId": "acc_456",
    "email": "user@aruba.it"
  }
}
```

**Con backToUrl:** Redirect HTTP 302 a `backToUrl?success=true&message=...`

**Risposta di Errore (400):**
```json
{
  "error": "Email obbligatoria",
  "message": "L'email Aruba è richiesta"
}
```

**Errori Possibili:**
- `400 Bad Request` - Dati mancanti o invalidi
- `500 Internal Server Error` - Errore nel salvataggio

**Esempio di Utilizzo:**
```bash
curl -X POST http://localhost:3000/monday/save-credentials \
  -d "userId=user_123&accountId=acc_456&email=test@aruba.it&password=pwd123&smtp_port=465"
```

---

### 3. POST /monday/getUserCredentials

**Descrizione:** Recupera le credenziali dell'utente autenticato

**Header Richiesto:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Risposta di Successo (200) - Credenziali Esistenti:**
```json
{
  "exists": true,
  "userId": "user_123",
  "accountId": "acc_456",
  "email": "user@aruba.it",
  "smtp_host": "mail.aruba.it",
  "smtp_port": 465,
  "created_at": "2025-11-01 14:49:06",
  "updated_at": "2025-11-01 14:49:06"
}
```

**Risposta di Successo (200) - Nessuna Credenziale:**
```json
{
  "exists": false,
  "message": "Nessuna credenziale configurata"
}
```

**Risposta di Errore (401):**
```json
{
  "error": "Token non fornito",
  "message": "Authorization header mancante"
}
```

**Errori Possibili:**
- `401 Unauthorized` - Token mancante o invalido
- `500 Internal Server Error` - Errore server

**Esempio di Utilizzo:**
```bash
curl -X POST http://localhost:3000/monday/getUserCredentials \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

**Nota Importante:** La password NON viene mai ritornata per motivi di sicurezza.

---

### 4. POST /monday/deleteUserCredentials

**Descrizione:** Elimina le credenziali dell'utente autenticato

**Header Richiesto:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Risposta di Successo (200):**
```json
{
  "success": true,
  "message": "Credenziali eliminate con successo"
}
```

**Risposta di Errore - Non Trovato (404):**
```json
{
  "success": false,
  "message": "Credenziali non trovate"
}
```

**Errori Possibili:**
- `401 Unauthorized` - Token mancante o invalido
- `404 Not Found` - Credenziali non trovate
- `500 Internal Server Error` - Errore server

**Esempio di Utilizzo:**
```bash
curl -X POST http://localhost:3000/monday/deleteUserCredentials \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

---

## Flusso Dettagliato

### Step 1: Generate Token (Monday.com)
Monday.com genera un JWT token firmato con MONDAY_CLIENT_SECRET:

```javascript
const token = jwt.sign(
  {
    userId: 'user_123',
    accountId: 'account_456'
  },
  MONDAY_CLIENT_SECRET,
  { expiresIn: '1h' }
);

const redirectUrl = `https://integration.app/monday/authorize?token=${token}&backToUrl=${encodeURIComponent(backUrl)}`;
```

### Step 2: Show Authorization Form
L'utente visita `/monday/authorize?token=...` e viene presentato con un form HTML per:
- Inserire email Aruba
- Inserire password Aruba
- Configurare server SMTP
- Configurare porta SMTP

### Step 3: Save Credentials
Il form esegue un POST a `/monday/save-credentials` con i dati:
- Token viene decodificato per ottenere userId e accountId
- Credenziali vengono validate
- Password viene criptata con AES-256-CBC
- Dati vengono salvati nel database SQLite

### Step 4: Redirect to Success
Se backToUrl è fornito, l'utente viene reindirizzato con parametri di successo:
```
https://callback-url.com?success=true&message=Credenziali+salvate+con+successo
```

## Sicurezza

### Crittografia Password
- **Algoritmo:** AES-256-CBC
- **Derivazione Chiave:** PBKDF2 con 100,000 iterazioni
- **IV:** Casuale per ogni password
- **Formato:** `IV_HEX:ENCRYPTED_HEX`

### Validazione JWT
- **SIGNING_SECRET** usato per getUserCredentials e deleteUserCredentials
- **CLIENT_SECRET** usato per authorize (fase di autorizzazione)
- Token con scadenza (es. 1 ora)

### Best Practices
1. HTTPS in produzione (per proteggere token e password)
2. Token con scadenza breve
3. Password mai ritornata via API
4. Validazione input su tutti gli endpoint
5. Logging sicuro (nessun secret nei log)

## Testing

Esegui il test suite:
```bash
node test-auth-endpoints.js
```

I test coprono:
1. ✓ Form caricamento con token valido
2. ✓ Errore con token mancante
3. ✓ Salvataggio credenziali
4. ✓ Recupero credenziali con token
5. ✓ Errore senza token
6. ✓ Eliminazione credenziali
7. ✓ Verifica eliminazione

## Esempi di Integrazione

### JavaScript
```javascript
// 1. Generate token
const token = jwt.sign({...}, MONDAY_CLIENT_SECRET);
const url = `/monday/authorize?token=${token}&backToUrl=${returnUrl}`;

// 2. Redirect user
window.location.href = url;

// 3. Later, retrieve credentials
const creds = await fetch('/monday/getUserCredentials', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});
```

### cURL
```bash
# Get credentials
curl -X POST http://localhost:3000/monday/getUserCredentials \
  -H "Authorization: Bearer $(node -e 'console.log(require("jsonwebtoken").sign({userId:"user_123"}, "secret"))')" \
  -H "Content-Type: application/json"
```

## Troubleshooting

### "Token mancante"
- Assicurati che `token` sia nel query parameter
- Formato corretto: `?token=eyJhbGc...`

### "Token non valido"
- Verifica che il token sia firmato con MONDAY_CLIENT_SECRET corretto
- Controlla che il token non sia scaduto

### "Email obbligatoria"
- Completa tutti i campi obbligatori del form
- Email non deve essere vuota

### "Credenziali non trovate"
- Le credenziali per questo user non sono state salvate
- Completa il flusso di authorize prima

