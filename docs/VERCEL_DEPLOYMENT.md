# Guida Deployment su Vercel

## 📋 Sommario

Questa guida spiega come deployare l'integrazione Monday.com + Aruba Mail su Vercel, configurando correttamente le variabili d'ambiente e il runtime Node.js.

## ⚠️ Prerequisiti

- ✅ Progetto GitHub pushato (vedi `git push`)
- ✅ Supabase project creato e configurato (vedi `docs/SUPABASE_MIGRATION.md`)
- ✅ Variabili `.env` locali testate
- ✅ Account Vercel (https://vercel.com)

---

## 1️⃣ Collegare GitHub a Vercel

### Step 1.1: Accedi a Vercel

1. Vai a https://vercel.com/login
2. Clicca **"Continue with GitHub"**
3. Autorizza Vercel ad accedere ai tuoi repository

### Step 1.2: Importare il progetto

1. Dashboard Vercel → **"Add New..."** → **"Project"**
2. Seleziona il repository `monday-aruba-integration`
3. Clicca **"Import"**

---

## 2️⃣ Configurare Build Settings

Nel form di importazione, assicurati che:

| Setting | Valore |
|---------|--------|
| **Framework** | `Other` (custom Node.js) |
| **Build Command** | `npm install` |
| **Output Directory** | `/` (root) |
| **Install Command** | `npm install` |

Vercel dovrebbe auto-rilevare che è un progetto Node.js.

**Environment**: Seleziona **"Production"**

---

## 3️⃣ Aggiungere Variabili d'Ambiente

### Step 3.1: Accedi al form Environment Variables

Rimani nella pagina di importazione, scorri fino a **"Environment Variables"**.

### Step 3.2: Aggiungi ogni variabile

Clicca **"Add Environment Variable"** per ogni riga:

**Database & Supabase:**
```
DATABASE_URL = postgresql://[user]:[password]@[pooler-host]:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10&sslmode=require

DIRECT_URL = postgresql://[user]:[password]@db.xxxxx.supabase.co:5432/postgres?sslmode=require

NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

SUPABASE_DB_SCHEMA = public
```

**Monday.com Secrets:**
```
MONDAY_CLIENT_SECRET = your_secret_from_monday_dev_center

MONDAY_SIGNING_SECRET = your_signing_secret_from_monday_dev_center
```

**Encryption & JWT:**
```
ENCRYPTION_KEY = your_32_byte_hex_string

JWT_SECRET = your_jwt_secret_32_byte_hex
```

**Application Config:**
```
NODE_ENV = production

PORT = 3000

ARUBA_MAIL_HOST = mail.aruba.it

ARUBA_MAIL_PORT = 465

DEBUG_EMAIL = false

CORS_ORIGIN = *
```

**⚠️ IMPORTANTE**:

- **NON copiare** i valori di `.env` locale direttamente! Rigenera nuove chiavi per production
- **Credenziali sensibili** (ENCRYPTION_KEY, JWT_SECRET): Genera nuove per Vercel
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

---

## 4️⃣ Variabili d'Ambiente in Dettaglio

### Supabase Credentials

Recuperali dal dashboard Supabase → **Project Settings** → **API**:

| Variabile | Dove trovarla |
|-----------|--------------|
| `DATABASE_URL` | **Database** → Connection pooler string |
| `DIRECT_URL` | **Database** → Session string |
| `NEXT_PUBLIC_SUPABASE_URL` | **API** → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **API** → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | **API** → service_role secret |

### Monday.com Secrets

Recuperali da https://dev.monday.com:

1. Accedi al Developer Center
2. **Your apps** → Seleziona la tua app
3. **API Token** → Copia i valori:
   - `CLIENT_SECRET` (per OAuth)
   - `SIGNING_SECRET` (per Authorization URL)

### Chiavi Generate

```bash
# Genera ENCRYPTION_KEY (per AES-256-CBC)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Genera JWT_SECRET (per JWT token)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5️⃣ Verificare la Configurazione del Runtime

Vercel automaticamente userà **Node.js runtime** (non Edge).

Per essere sicuro, crea un file `vercel.json`:

```json
{
  "buildCommand": "npm install",
  "devCommand": "npm start",
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "server.js": {
      "runtime": "nodejs20.x"
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/server.js"
    }
  ]
}
```

**Alternative**: Se usi Next.js, crea `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disabilita Static Export - usiamo Node runtime
  output: undefined,

  // Configurazione API Routes
  api: {
    // Usa Node runtime per tutte le routes
    responseLimit: false
  }
};

module.exports = nextConfig;
```

---

## 6️⃣ Deploy

### Step 6.1: Clicca "Deploy"

Nel form di Vercel, clicca il bottone **"Deploy"** in basso a destra.

Vercel inizierà a:
1. Clonare il repository da GitHub
2. Installare le dipendenze (`npm install`)
3. Eseguire Prisma migrations
4. Deployare il progetto

### Step 6.2: Aspetta il completamento

Output atteso:
```
✓ Build completed
✓ Prisma schema synced
✓ Deployment successful
```

Riceverai un URL come: `https://monday-aruba-integration.vercel.app`

---

## 7️⃣ Post-Deployment Checks

### Check 1: Verifica Logs

Dashboard Vercel → **Deployments** → **Production** → **View Logs**

Dovresti vedere:
```
[Prisma] Connected to PostgreSQL database
Server running on port 3000
```

**Errore common**: `P1001: Can't reach database server`
- Soluzione: Assicurati che DATABASE_URL sia corretto in Environment Variables

### Check 2: Test un Endpoint

```bash
# Testa lo stato del server
curl https://monday-aruba-integration.vercel.app/health

# Testa l'autorizzazione (con JWT valido)
curl "https://monday-aruba-integration.vercel.app/monday/authorize?token=YOUR_JWT_TOKEN"
```

### Check 3: Verifica Supabase

Dashboard Supabase → **SQL Editor**:

```sql
SELECT COUNT(*) FROM integration_credentials;
```

Dovrebbe ritornare `0` (o numero di credenziali se importate)

---

## 8️⃣ Configurare il Dominio Personalizzato

### Step 8.1: Aggiungi dominio in Vercel

1. Dashboard Vercel → Seleziona il progetto
2. **Settings** → **Domains**
3. Clicca **"Add"** e inserisci il tuo dominio (es: `api.tuodominio.com`)

### Step 8.2: Aggiorna i DNS record

Vercel mostrerà i **NS records** da aggiungere al tuo provider DNS:

```
CNAME: api.tuodominio.com → monday-aruba-integration.vercel.app
```

Aspetta 24-48 ore per la propagazione DNS.

---

## 9️⃣ Configurare Monday.com per Production

### Step 9.1: Update OAuth URLs

Nel Monday Developer Center, aggiorna gli redirect URI:

**Authorization URL**:
```
https://monday-aruba-integration.vercel.app/monday/authorize
```

**Redirect URI** (dopo save):
```
https://monday-aruba-integration.vercel.app/callback
```

### Step 9.2: Test OAuth Flow

1. Vai al tuo app Monday.com
2. Autorizza l'accesso → Dovrebbe redirectare a Vercel
3. Completa il form di configurazione
4. Dovrebbe salvare le credenziali in Supabase ✓

---

## 🔟 Aggiornamenti Continui

Ogni push a `main` branch triggerà automaticamente un nuovo deploy:

```bash
# Fatto da GitHub
git push origin main

# Vercel automaticamente:
# 1. Clona i nuovi cambiamenti
# 2. Installa dipendenze
# 3. Esegue le migrazioni Prisma
# 4. Deploya la nuova versione
```

---

## 1️⃣1️⃣ Troubleshooting

### Errore: "Cannot find module 'prisma/client'"

**Soluzione**:
```bash
npm install
npx prisma generate
```

Verifica che il `.prisma/` folder sia in git o that Vercel esegua `prisma generate` durante la build.

### Errore: "P1001: Can't reach database server"

**Soluzione**:
1. Verifica DATABASE_URL in Environment Variables
2. Controlla che Supabase sia online
3. Assicurati che la password non abbia caratteri speciali che necessitano escape

### Errore: "Invalid JWT token"

**Soluzione**:
1. Verifica MONDAY_SIGNING_SECRET è corretto
2. Assicurati che il token non sia scaduto
3. Controlla i log in Vercel per il messaggio di errore esatto

### Errore: "Unauthorized" su API calls

**Soluzione**:
1. Verifica che Authorization header sia inviato correttamente
2. Usa `Bearer <TOKEN>` format
3. Controlla che il token sia valido nel Monday Developer Center

---

## 1️⃣2️⃣ Monitoraggio Production

### Enable Function Logs

Vercel → **Monitoring** → **Functions** → Abilita logging

Vedrai tutti i log delle API calls in tempo reale.

### Monitor Database

Supabase → **Database** → **Queries** - Vedi tutte le query eseguite

Utile per debuggare performance issues.

### Monitor Deployments

Vercel → **Deployments** - Vedi la storia dei deploy

Rollback se necessario:
```
Deployments → Seleziona vecchia versione → Clicca "Promote to Production"
```

---

## 1️⃣3️⃣ Scaling & Limits

### Free Tier Limits

| Risorsa | Limite |
|---------|--------|
| **Vercel Bandwidth** | 100GB/month |
| **Function Execution** | 60 secondi timeout |
| **Supabase DB** | 500MB storage |
| **Supabase Realtime** | 10 concurrent |

Se superi i limiti, upgrade a plan a pagamento.

### Otimizzazioni

1. **Caching**: Usa `Cache-Control` headers
2. **Compression**: Express comprime automaticamente
3. **Database**: Usa indici su `userId` (già fatto)
4. **Connection pooling**: Usa pgbouncer (already configured)

---

## 1️⃣4️⃣ Sicurezza

✅ **Checklist Pre-Production:**

- [ ] Credenziali sensibili in Environment Variables (non in .env)
- [ ] ENCRYPTION_KEY generata casualmente
- [ ] JWT_SECRET generata casualmente
- [ ] NODE_ENV = production
- [ ] CORS_ORIGIN configurato appropriatamente
- [ ] Rate limiting abilitato (middleware/rateLimiter.js)
- [ ] HTTPS solo (Vercel default)
- [ ] Audit logging abilitato (AuditLog model)

---

## 1️⃣5️⃣ Rollback

Se qualcosa va storto:

### Opzione 1: Vercel Promotion

```
Vercel Dashboard → Deployments → Seleziona versione stabile → Promote to Production
```

Istantaneo, no downtime.

### Opzione 2: Git Revert

```bash
git revert <commit-hash>
git push origin main
# Vercel farà il deploy automaticamente
```

---

## 1️⃣6️⃣ Prossimi Step

1. ✅ Deploy su Vercel completato
2. ✅ Environment variables configurate
3. ✅ Supabase connesso
4. ⏭️ **Prossimo**: Integrare con Monday.com app

---

## 📚 Risorse Utili

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Prisma on Vercel](https://www.prisma.io/docs/orm/more/deployment/deployment-guides/deploying-to-vercel)
- [Supabase Vercel Integration](https://supabase.com/docs/guides/integrations/vercel)

---

**Última aggiornamento:** 2025-11-01
**Status:** ✅ Production Ready
