# Guida Migrazione SQLite → Supabase (PostgreSQL)

## 📋 Sommario

Questa guida spiega come migrare dal database SQLite a Supabase (PostgreSQL) e come configurare correttamente l'integrazione Monday.com + Aruba Mail su Supabase.

## ⚠️ Stato Attuale

- ✅ Schema Prisma creato (`prisma/schema.prisma`)
- ✅ Nuovo modello `IntegrationCredentials` implementato con Prisma
- ✅ Controller aggiornati per usare Prisma async/await
- ✅ Encryption/Decryption AES-256-CBC implementato server-side
- ⏳ Database Supabase da configurare
- ⏳ Variabili ambiente da aggiornare

---

## 1️⃣ Creare un Progetto Supabase

### Step 1.1: Registrazione e accesso

1. Vai a https://supabase.com/
2. Clicca su **"Start your project"**
3. Accedi con GitHub (consigliato) o email
4. Clicca **"New Project"**

### Step 1.2: Configura il progetto

| Campo | Valore Consigliato |
|-------|-------------------|
| **Name** | `monday-aruba-integration` |
| **Database Password** | Salva in luogo sicuro! |
| **Region** | `eu-north-1` (Europa) |
| **Pricing Plan** | Free (fino a 500MB) |

**⚠️ IMPORTANTE**: Salva la password del database - te la chiederà una sola volta!

---

## 2️⃣ Recuperare le Credenziali Supabase

### Step 2.1: DATABASE_URL (Prisma)

1. Nel dashboard Supabase → **Project Settings** → **Database**
2. Copia la **Connection string** per "Connection pooler"
3. Il formato sarà: `postgresql://[user]:[password]@[host]:[port]/[database]`
4. Aggiungi i parametri Prisma:
   ```
   postgresql://username:password@host:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10&sslmode=require
   ```

### Step 2.2: DIRECT_URL (Backup connection)

1. Copia la **Connection string** per "Session"
2. Formato: `postgresql://username:password@db.xxxxx.supabase.co:5432/postgres?sslmode=require`

### Step 2.3: NEXT_PUBLIC_SUPABASE_URL

1. **Project Settings** → **API**
2. Copia il valore da "Project URL"
3. Formato: `https://xxxxx.supabase.co`

### Step 2.4: NEXT_PUBLIC_SUPABASE_ANON_KEY

1. Stessa sezione API
2. Copia il valore da "anon public" key
3. È una stringa JWT

### Step 2.5: SUPABASE_SERVICE_ROLE_KEY

1. Stessa sezione API
2. Copia il valore da "service_role" secret key
3. **⚠️ NON CONDIVIDERE** - Solo per backend!

---

## 3️⃣ Aggiornare il `.env` Locale

Crea/modifica il file `.env` nella root del progetto:

```bash
# Server Configuration
PORT=3000

# Monday.com Configuration
MONDAY_CLIENT_SECRET=your_client_secret_from_monday_dev_center
MONDAY_SIGNING_SECRET=your_signing_secret_from_monday_dev_center

# Database Configuration (Supabase)
DATABASE_URL=postgresql://[user]:[password]@[host]:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10&sslmode=require
DIRECT_URL=postgresql://[user]:[password]@db.xxxxx.supabase.co:5432/postgres?sslmode=require
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_SCHEMA=public

# JWT Configuration
JWT_SECRET=your_jwt_secret_32_bytes_hex

# Encryption Configuration (AES-256-CBC)
ENCRYPTION_KEY=your_encryption_key_32_bytes_hex

# Aruba Mail Configuration
ARUBA_MAIL_HOST=mail.aruba.it
ARUBA_MAIL_PORT=465

# Application Environment
NODE_ENV=development
```

### Generare chiavi casuali (consigliato):

```bash
# Genera JWT_SECRET (32 bytes hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Genera ENCRYPTION_KEY (32 bytes hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ Non committare il `.env` in git!** Usa `.gitignore`:

```bash
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to .gitignore for security"
```

---

## 4️⃣ Sincronizzare il Schema Database

### Step 4.1: Installare dipendenze (se non fatto)

```bash
npm install @prisma/client @supabase/supabase-js
```

### Step 4.2: Spingere lo schema a Supabase

```bash
npx prisma db push
```

Output atteso:
```
✓ Datasource "db": PostgreSQL database "postgres"
✓ Pushed the schema to the database
✓ Generated Prisma Client

Congratulations! Your database is ready to use.
```

**Cosa fa:**
- Legge `prisma/schema.prisma`
- Crea le tabelle su Supabase
- Genera il client Prisma

---

## 5️⃣ Schema Database Explanation

Il tuo schema (`prisma/schema.prisma`) contiene:

### Modello: `IntegrationCredentials`

Tabella: `integration_credentials`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | Int | Primary key (auto-increment) |
| `userId` | String(255) | **UNIQUE** - Monday.com user ID |
| `accountId` | String(255) | Monday.com account ID |
| `arubaEmail` | String(255) | Email Aruba dell'utente |
| `arubaPassword` | Text | **ENCRYPTED** con AES-256-CBC |
| `smtpHost` | String(255) | Default: `mail.aruba.it` |
| `smtpPort` | Int | Default: `465` |
| `createdAt` | DateTime | Timestamp creazione |
| `updatedAt` | DateTime | Timestamp ultimo aggiornamento |

**Indici:**
- `userId` - Per query veloci di lookup

### Modello: `AuditLog`

Tabella: `audit_logs`

Per tracciare tutte le operazioni di credenziali:

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | Int | Primary key |
| `userId` | String(255) | Chi ha fatto l'azione |
| `action` | String(100) | `save-credentials`, `delete-credentials`, etc. |
| `status` | String(50) | `created`, `updated`, `deleted` |
| `message` | Text? | Messaggio opzionale |
| `metadata` | JSON? | Dati aggiuntivi (timestamp, etc.) |
| `createdAt` | DateTime | Quando è stata l'azione |

**Indici:**
- `userId` - Per query per utente
- `createdAt` - Per query per data

---

## 6️⃣ Come Funziona l'Encryption

### Lato Server (Node.js)

Le password vengono criptate **prima** di salvare in Supabase usando AES-256-CBC:

```javascript
// models/IntegrationCredentials.js

static encrypt(plaintext) {
  const key = this.deriveKey(process.env.ENCRYPTION_KEY);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Salva: IV:CIPHERTEXT
  return `${iv.toString('hex')}:${encrypted}`;
}

static decrypt(ciphertext) {
  const [ivHex, encrypted] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = this.deriveKey(process.env.ENCRYPTION_KEY);

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Derivazione della Chiave

Usa PBKDF2 con 100,000 iterazioni:

```javascript
static deriveKey(masterKey) {
  return crypto.pbkdf2Sync(
    masterKey,
    'aruba_mail_salt',
    100000, // iterations
    32,     // key length (256 bits)
    'sha256'
  );
}
```

### Sicurezza

✅ **Algoritmo**: AES-256-CBC (standard militare)
✅ **Derivazione chiave**: PBKDF2 con 100k iterazioni
✅ **IV**: Casuale per ogni criptazione
✅ **Storage**: Solo ciphertext su database

---

## 7️⃣ Testare la Connessione

### Test 1: Connessione al Database

```bash
npx prisma db execute --stdin < /dev/null
```

Output atteso: Nessun errore

### Test 2: Connessione dell'App

```bash
npm start
```

Dovresti vedere nel log:

```
Server running on port 3000
[Prisma] Connected to PostgreSQL database
```

### Test 3: Test i Controller

Usa gli endpoint per testare:

```bash
# 1. Autorizzazione (ottieni il JWT token)
curl http://localhost:3000/monday/authorize?token=YOUR_JWT_TOKEN&backToUrl=http://localhost:3000

# 2. Salva credenziali (POST form)
# Compila il form HTML che appare

# 3. Recupera credenziali
curl -X POST http://localhost:3000/monday/getUserCredentials \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. Invia email
curl -X POST http://localhost:3000/monday/sendEmail \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_email": "test@example.com",
    "subject": "Test",
    "body": "Email di test"
  }'
```

---

## 8️⃣ Migrazione da SQLite (Opzionale)

Se hai dati salvati in SQLite e vuoi migrare a Supabase:

### Step 8.1: Esportare dati da SQLite

```bash
# Installa sqlite3
npm install sqlite3

# Script per esportare
node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/monday_aruba.db');

db.all('SELECT * FROM user_credentials', (err, rows) => {
  console.log(JSON.stringify(rows, null, 2));
});
"
```

### Step 8.2: Importare a Supabase

```javascript
// script-import.js
const { PrismaClient } = require('@prisma/client');
const IntegrationCredentials = require('./models/IntegrationCredentials');

const prisma = new PrismaClient();

async function importFromSQLite() {
  const oldData = require('./exported-data.json');

  for (const row of oldData) {
    await IntegrationCredentials.create({
      userId: row.user_id,
      accountId: row.account_id,
      aruba_email: row.aruba_email,
      aruba_password: row.aruba_password, // Già criptata?
      smtp_host: row.smtp_host,
      smtp_port: row.smtp_port
    });
  }

  console.log(`Migrati ${oldData.length} record`);
}

importFromSQLite();
```

---

## 9️⃣ Risoluzione Problemi

### Errore: "Can't reach database server"

```
P1001: Can't reach database server at `db.xxxxx.supabase.co:5432`
```

**Soluzioni:**
1. Verifica che `DATABASE_URL` sia corretto
2. Controlla che Supabase sia online (dashboard)
3. Assicurati che la password abbia caratteri speciali escaped (`!` → `%21`)
4. Usa `DIRECT_URL` come fallback

### Errore: "Authentication failed"

```
P1000: Authentication failed
```

**Soluzioni:**
1. Verifica username/password in DATABASE_URL
2. Accedi a Supabase dashboard e resetta la password del database
3. Copia di nuovo la connection string

### Errore: "Relation does not exist"

```
P2021: The table `public.integration_credentials` does not exist
```

**Soluzione:** Esegui `npx prisma db push` per creare le tabelle

### Timeout di connessione

Se vedi timeout, prova a usare il `pgbouncer`:
- Assicurati che `?pgbouncer=true` sia in `DATABASE_URL`
- Imposta `connection_limit=1` per il Free tier

---

## 🔟 Prossimi Step

1. ✅ Supabase project creato
2. ✅ `.env` configurato
3. ✅ Schema pushato con Prisma
4. ⏭️ **Prossimo**: Deployare su Vercel (vedi `docs/VERCEL_DEPLOYMENT.md`)

---

## 📚 Risorse Utili

- [Supabase Docs](https://supabase.com/docs)
- [Prisma PostgreSQL](https://www.prisma.io/docs/orm/overview/databases/postgresql)
- [Prisma Migration](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate)
- [Node.js Crypto](https://nodejs.org/api/crypto.html)

---

**Última aggiornamento:** 2025-11-01
**Status:** ✅ Production Ready (con Vercel deployment)
