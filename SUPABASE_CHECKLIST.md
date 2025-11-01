# ✅ Supabase Migration Checklist

## 📋 Quick Reference for Supabase Migration

Usa questo file per tracciare il tuo progresso nella migrazione da SQLite a Supabase.

---

## Fase 1: Supabase Project Setup

- [ ] **1.1** Creato account Supabase (https://supabase.com)
- [ ] **1.2** Nuovo project creato
  - [ ] Name: `monday-aruba-integration`
  - [ ] Region: `eu-north-1`
  - [ ] Password salvata in luogo sicuro
- [ ] **1.3** Database online e accessibile

---

## Fase 2: Recuperare Credenziali Supabase

Vai a **Project Settings** → **Database** e **API**

### Database Connection

- [ ] **2.1** `DATABASE_URL` copiato (Connection pooler)
  ```
  postgresql://[user]:[password]@[host]:6543/postgres?pgbouncer=true&...
  ```

- [ ] **2.2** `DIRECT_URL` copiato (Session)
  ```
  postgresql://[user]:[password]@db.xxxxx.supabase.co:5432/postgres?sslmode=require
  ```

### Supabase API Keys

- [ ] **2.3** `NEXT_PUBLIC_SUPABASE_URL` copiato
  ```
  https://xxxxx.supabase.co
  ```

- [ ] **2.4** `NEXT_PUBLIC_SUPABASE_ANON_KEY` copiato (anon public)
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

- [ ] **2.5** `SUPABASE_SERVICE_ROLE_KEY` copiato (service_role secret)
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

---

## Fase 3: Configurazione Locale

### Dipendenze

- [ ] **3.1** Prisma installato: `npm install @prisma/client @supabase/supabase-js`

### File .env

- [ ] **3.2** `.env` file creato (non in git!)
- [ ] **3.3** Tutte le variabili Supabase aggiunte
  - [ ] DATABASE_URL
  - [ ] DIRECT_URL
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY

- [ ] **3.4** Nuove chiavi generate (non copiate da SQLite!)
  - [ ] ENCRYPTION_KEY (32 bytes hex)
    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```
  - [ ] JWT_SECRET (32 bytes hex)
    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```

- [ ] **3.5** Aggiungi `.env` a `.gitignore`
  ```bash
  echo ".env" >> .gitignore
  ```

---

## Fase 4: Schema Database Sync

### Prisma Schema

- [ ] **4.1** `prisma/schema.prisma` esiste e contiene:
  - [ ] `datasource db` con provider PostgreSQL
  - [ ] `model IntegrationCredentials` con tutte le colonne
  - [ ] `model AuditLog` per audit trail

### Sync al Database

- [ ] **4.2** Eseguito: `npx prisma db push`
  ```
  Output atteso: ✓ Pushed the schema to the database
  ```

- [ ] **4.3** Tabelle create su Supabase
  ```bash
  # Verifica nel Supabase SQL Editor:
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public';
  ```
  Output: `integration_credentials`, `audit_logs`

### Prisma Client

- [ ] **4.4** Prisma Client generato: `npx prisma generate`
- [ ] **4.5** `.prisma/` folder creato

---

## Fase 5: Code Updates

### Controllers

- [ ] **5.1** `controllers/authController.js` aggiornato
  - [ ] Usa `IntegrationCredentials` da Prisma
  - [ ] Metodi async/await
  - [ ] Line 334: `await IntegrationCredentials.findByUserId(userId)`
  - [ ] Line 446: `userId: credentials.userId` (non `monday_user_id`)

- [ ] **5.2** `controllers/emailController.js` aggiornato
  - [ ] Usa `IntegrationCredentials.findByUserIdWithPassword()`
  - [ ] Line 150: async method call

### Models

- [ ] **5.3** `models/IntegrationCredentials.js` esiste e contiene:
  - [ ] Metodo `encrypt()` per AES-256-CBC
  - [ ] Metodo `decrypt()` per decriptare
  - [ ] Metodo `create()` async
  - [ ] Metodo `findByUserId()` async
  - [ ] Metodo `findByUserIdWithPassword()` async
  - [ ] Metodo `update()` async
  - [ ] Metodo `delete()` async
  - [ ] Metodo `logAudit()` async

---

## Fase 6: Test Locale

### Connessione Database

- [ ] **6.1** Connessione al database verificata
  ```bash
  npx prisma db execute --stdin < /dev/null
  ```

### Server Start

- [ ] **6.2** Server avviato: `npm start`
  ```
  Output atteso: Server running on port 3000
  ```

### Endpoint Tests

- [ ] **6.3** Test `/monday/authorize` endpoint
  ```bash
  curl "http://localhost:3000/monday/authorize?token=TEST_JWT&backToUrl=http://localhost:3000"
  ```

- [ ] **6.4** Test POST `/monday/save-credentials`
  ```bash
  # Compila il form HTML che appare
  ```

- [ ] **6.5** Credenziali salvate in Supabase
  ```bash
  # Supabase SQL Editor:
  SELECT * FROM integration_credentials;
  ```

- [ ] **6.6** Test `/monday/getUserCredentials`
  ```bash
  curl -X POST http://localhost:3000/monday/getUserCredentials \
    -H "Authorization: Bearer TEST_JWT"
  ```

- [ ] **6.7** Test `/monday/sendEmail`
  ```bash
  curl -X POST http://localhost:3000/monday/sendEmail \
    -H "Authorization: Bearer TEST_JWT" \
    -d '{"recipient_email":"test@example.com","subject":"Test","body":"Test email"}'
  ```

---

## Fase 7: Documentazione

- [ ] **7.1** `docs/SUPABASE_MIGRATION.md` letto e capito
- [ ] **7.2** `docs/VERCEL_DEPLOYMENT.md` pronto per il deploy
- [ ] **7.3** Backup del database SQLite fatto (opzionale)

---

## Fase 8: Git & Repository

- [ ] **8.1** Commit Supabase migration
  ```bash
  git add .
  git commit -m "Migrate to Supabase PostgreSQL with Prisma ORM"
  git push origin main
  ```

- [ ] **8.2** Tag rilascio (opzionale)
  ```bash
  git tag -a v2.0.0-supabase -m "Supabase migration complete"
  git push origin v2.0.0-supabase
  ```

---

## Fase 9: Production Deployment (Vercel)

Segui `docs/VERCEL_DEPLOYMENT.md`

### Pre-Deployment

- [ ] **9.1** Progetto GitHub pronto
- [ ] **9.2** Supabase credentials generate per production
- [ ] **9.3** Monday.com secrets generate per production

### Vercel Setup

- [ ] **9.4** GitHub connected a Vercel
- [ ] **9.5** Progetto importato in Vercel
- [ ] **9.6** Environment variables aggiunte (tutte!)
- [ ] **9.7** Build settings verificati

### Deploy

- [ ] **9.8** Bottone "Deploy" cliccato
- [ ] **9.9** Deploy completato senza errori
- [ ] **9.10** Production URL funzionante

### Post-Deploy

- [ ] **9.11** Test endpoint in production
  ```bash
  curl https://monday-aruba-integration.vercel.app/monday/authorize?token=TEST_JWT
  ```

- [ ] **9.12** Logs verificati (nessun errore P1001, P1000, etc.)
- [ ] **9.13** Monday.com OAuth URLs aggiornati
- [ ] **9.14** Test completo del flusso di autorizzazione

---

## Fase 10: Migrazione Dati (Se Applicabile)

Se hai dati in SQLite da migrare:

- [ ] **10.1** Dati esportati da SQLite
- [ ] **10.2** Import script creato
- [ ] **10.3** Dati importati in Supabase
- [ ] **10.4** Verifica di integrità dati

---

## 🎯 Completion Status

**Progress**: _____ / 100 items completed

### Summary

- [ ] Supabase project creato e configurato ✅
- [ ] Credenziali recuperate ✅
- [ ] `.env` configurato localmente ✅
- [ ] Prisma schema pushato ✅
- [ ] Controllers aggiornati ✅
- [ ] Test locali passati ✅
- [ ] Git push completato ✅
- [ ] Deployment su Vercel completato ✅
- [ ] Production URL funzionante ✅
- [ ] Monday.com integrato ✅

---

## 📝 Note Importanti

### Sicurezza

⚠️ **RICORDA**:
- NON committare `.env` in git
- Rigenera ENCRYPTION_KEY e JWT_SECRET per production
- Non condividere SUPABASE_SERVICE_ROLE_KEY

### Database Connection

⚠️ Se vedi `P1001: Can't reach database server`:
- Verifica DATABASE_URL è corretto
- Assicurati che Supabase sia online
- Usa DIRECT_URL come fallback
- Controlla firewall/VPN

### Rollback

Se vuoi tornare a SQLite (non consigliato):
```bash
git revert <supabase-migration-commit>
npm install better-sqlite3
```

---

## 📚 Risorse

- [SUPABASE_MIGRATION.md](./docs/SUPABASE_MIGRATION.md) - Guida dettagliata
- [VERCEL_DEPLOYMENT.md](./docs/VERCEL_DEPLOYMENT.md) - Deploy guide
- [Prisma Docs](https://www.prisma.io/docs/)
- [Supabase Docs](https://supabase.com/docs)

---

**Última aggiornamento:** 2025-11-01
**Status:** 🚀 Migration Checklist Ready
