# Deploy su Monday Code - Guida Completa

**Data:** 27 Novembre 2025
**Ambiente:** Monday Code (USA)
**URL Attuale:** https://b5974-service-32281405-f2dd3966.us.monday.app

---

## ✅ Dettagli dell'App (Confermati)

| Parametro | Valore |
|-----------|--------|
| **Client ID** | `0ddf9f806ed23babbc78a3635f195314` |
| **Client Secret** | `f08e362a69cdd625245c35e3d1a122a2` |
| **Signing Secret** | `d722023b89262b8dc22227f3dcfa448a` |
| **App ID** | `10662523` |
| **URL USA** | `https://b5974-service-32281405-f2dd3966.us.monday.app` |

---

## 🚀 Come Deployare su Monday Code

### Passo 1: Accedi a Monday Code

1. Vai a: **https://monday.com**
2. Nel menu laterale, seleziona **Apps**
3. Clicca su **Monday Code**
4. Seleziona l'app: **Aruba Mail Integration** (App ID: 10662523)

---

### Passo 2: Collega il Repository GitHub

Se non è già collegato:

1. In Monday Code, vai a **Settings** > **Git Integration**
2. Seleziona **GitHub** come repository
3. Autorizza Monday Code ad accedere a GitHub
4. Seleziona il repository: `ale-aa/monday-aruba-integration`
5. Branch: `main`

---

### Passo 3: Sincronizza il Codice Aggiornato

**Nel Monday Code Editor:**

1. Apri il **Terminal** (in basso)
2. Esegui:
   ```bash
   git pull origin main
   ```
3. Verifica il pull è riuscito (dovrebbe mostrare i file aggiornati)

**Oppure tramite GitHub:**

1. Se Monday Code è connesso a GitHub, dovrebbe auto-sincronizzare
2. Vai a **Deploy Settings** > **Auto Deploy from GitHub**
3. Seleziona `main` branch
4. Salva

---

### Passo 4: Verifica i File Aggiornati

In Monday Code, verifica che questi file siano aggiornati:

1. **controllers/emailController.js**
   - Linea 58: `items(ids: [${itemId}])` ✅
   - Linea 60: `column_values(ids: ["${columnId}"])` ✅
   - Linea 64: Campo `type` aggiunto ✅
   - Linea 89: `console.log('[EmailController] Column type:', emailField.type);` ✅

2. **routes/email.js**
   - Linee 49-148: Documentazione nuova ✅

Se non vedi questi cambiamenti, fai manualmente:
- Copia i file dal GitHub
- Incolla in Monday Code editor
- Salva

---

### Passo 5: Configura le Variabili di Ambiente

In Monday Code, vai a **Settings** > **Environment Variables**

Assicurati che siano presenti:

```env
# Monday.com
MONDAY_CLIENT_SECRET=f08e362a69cdd625245c35e3d1a122a2
MONDAY_SIGNING_SECRET=d722023b89262b8dc22227f3dcfa448a

# Encryption
ENCRYPTION_KEY=9d302675229d6e015e3cf85981c116e21402409bd6bed5fa8a8cf93d42704651

# Database (Supabase)
DATABASE_URL=postgresql://postgres.bxsoabasubnraixpkunw:Santini97!@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10&sslmode=require
DIRECT_URL=postgresql://postgres:Santini97!@db.bxsoabasubnraixpkunw.supabase.co:5432/postgres?sslmode=require

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://bxsoabasubnraixpkunw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4c29hYmFzdWJucmFpeHBrdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5OTk0NjgsImV4cCI6MjA3NzU3NTQ2OH0.FXUDZfNE_17BmXm0WaRKG5_OSzch3URt6pSevABMnQc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4c29hYmFzdWJucmFpeHBrdW53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk5OTQ2OCwiZXhwIjoyMDc3NTc1NDY4fQ.fKBFozbBpEaCWle1eS49EZ0R43BL94OcvXvT1rI5KIY
SUPABASE_DB_SCHEMA=public

# JWT
JWT_SECRET=58ec2faed65ec64bd1bb364e9d461129b10d45c850c515c72edcd864ece04391

# Aruba
ARUBA_MAIL_HOST=mail.aruba.it
ARUBA_MAIL_PORT=465

# Environment
NODE_ENV=production
PORT=3000
```

---

### Passo 6: Deploy

**Opzione A: Deploy Manuale**

1. In Monday Code, premi il bottone **Deploy**
2. Seleziona la versione (dovrebbe essere `main`)
3. Premi **Deploy Now**
4. Attendi il completamento (2-3 minuti)

**Opzione B: Auto Deploy**

Se hai configurato auto-deploy da GitHub, il deploy è automatico quando:
- Fai commit su `main` branch
- Monday Code sincronizza e deploya automaticamente

---

### Passo 7: Verifica il Deploy

Una volta completato il deploy:

1. **Controlla i Log:**
   - In Monday Code, vai a **Logs**
   - Cerca errori (rossi) o warnings (gialli)
   - Se vedi errori, consulta **Troubleshooting** più sotto

2. **Testa gli Endpoint:**
   ```bash
   # Health check
   curl https://b5974-service-32281405-f2dd3966.us.monday.app/health

   # Dovrebbe rispondere con status 200
   ```

3. **Testa Authorization:**
   ```bash
   curl "https://b5974-service-32281405-f2dd3966.us.monday.app/monday/authorize" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"

   # Dovrebbe ritornare HTML form
   ```

---

## 🧪 Test Completo

Una volta deployato, verifica tutto funziona:

### Test 1: Health Check ✅
```bash
curl https://b5974-service-32281405-f2dd3966.us.monday.app/health
```

Risposta attesa:
```json
{
  "status": "ok",
  "timestamp": "2025-11-27T...",
  "uptime": 1234,
  "environment": "production"
}
```

### Test 2: Field Definitions ✅
```bash
curl -X POST https://b5974-service-32281405-f2dd3966.us.monday.app/monday/fetchFieldDefs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

Risposta attesa:
```json
{
  "kind": "field_definitions",
  "fields": [
    {
      "id": "dynamic_email",
      "title": "Email column",
      "type": "column"
    }
  ]
}
```

### Test 3: GraphQL Query (con Nuova Sintassi) ✅

Nei log di Monday Code, dovresti vedere:
```
[EmailController] ========== FETCHING EMAIL FROM COLUMN ==========
[EmailController] itemId: 12345
[EmailController] columnId: email
[EmailController] ✓ Email retrieved from column: test@example.com
[EmailController] Column type: email
[EmailController] ==========================================
```

Il campo `Column type:` è nuovo - conferma che la modifica funziona! ✅

---

## 🔄 Se il Deploy Fallisce

### Errore: "Module not found"
```
Error: Cannot find module 'X'
```

**Soluzione:**
1. In Monday Code Terminal, esegui:
   ```bash
   npm install
   ```
2. Aspetta completamento
3. Riprova il deploy

### Errore: "Environment variables missing"
```
Error: Missing MONDAY_CLIENT_SECRET
```

**Soluzione:**
1. Verifica che le environment variables siano configurate in Monday Code
2. Controlla che non ci siano spazi extra o errori di digitazione
3. Salva nuovamente le variables
4. Riprova il deploy

### Errore: "Port already in use"
```
Error: Port 3000 already in use
```

**Soluzione:**
- Monday Code gestisce automaticamente le porte
- Questo errore non dovrebbe accadere
- Se accade, contatta Monday support

### Errore: "Connection to database failed"
```
Error: Could not connect to database
```

**Soluzione:**
1. Verifica che Supabase è online
2. Verifica DATABASE_URL è corretta
3. Controlla firewall di Supabase permette connessioni da Monday Code
4. Nel dubbio, testa la connessione localmente prima

---

## 📊 Cosa è Cambiato nel Deploy?

### Per l'Utente
❌ NULLA - L'app funziona esattamente come prima

### Per il Codice
✅ **Miglioramenti interni:**
- Sintassi GraphQL allineata con best practices Monday
- Campo `type` aggiunto per debugging
- Documentazione completa negli endpoint

### Breaking Changes
❌ **NESSUNO** - Backward compatible 100%

---

## ✅ Checklist Post-Deploy

Una volta completato il deploy:

- [ ] Deploy completato senza errori
- [ ] Health check ritorna 200 OK
- [ ] fetchFieldDefs ritorna field_definitions
- [ ] Log mostra "Column type:" (nueva funcionalidad)
- [ ] SMTP test funziona
- [ ] Email sending funziona
- [ ] Nessun errore nei Log di Monday Code
- [ ] App raggiungibile dall'URL USA

---

## 📞 Se Hai Problemi

1. **Controlla i Log in Monday Code:**
   - Settings > Logs
   - Cerca messaggi di errore
   - Copia l'errore completo

2. **Testa localmente:**
   ```bash
   # Se vuoi testare prima di Monday Code
   npm install
   npm start
   # Test endpoints su localhost:3000
   ```

3. **Verifica Secrets:**
   - Conf irma che CLIENT_SECRET e SIGNING_SECRET sono corretti
   - Non hanno spazi extra
   - Sono nella giusta environment

4. **Riavvia Monday Code:**
   - Vai a Settings > Restart Application
   - Aspetta riavvio

---

## 🎉 Una Volta che Funziona

Una volta che il deploy è OK:

1. **Testa la integrazione completa:**
   - Crea una automazione in Monday
   - Usa il selettore di colonne
   - Verifica che l'email viene inviata

2. **Monitora i Log:**
   - Continua a controllare Monday Code logs
   - Cerca eventuali errori

3. **Godi il risultato:**
   - ✅ Codice aggiornato
   - ✅ Best practices Monday allineate
   - ✅ App deployata e funzionante

---

## 📝 Comandi Veloci Monday Code

| Azione | Comando |
|--------|---------|
| Pull codice | `git pull origin main` |
| Installa dipendenze | `npm install` |
| Start locale | `npm start` |
| Test | `npm test` |
| Check logs | Vai a Settings > Logs |
| Deploy | Premi bottone Deploy |
| Restart app | Settings > Restart Application |

---

**Status:** 🟡 PRONTO PER IL DEPLOY
**Prossimo Step:** Clicca Deploy in Monday Code!

Una volta che hai completato il deploy, dimmi il risultato! 🚀
