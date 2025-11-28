# Guida: Pushare l'App su Monday.com

**Data:** 27 Novembre 2025
**Status:** Codice aggiornato e pronto per Monday.com

---

## 📋 Stato Attuale

✅ **Codice nel Repository:**
- GitHub: AGGIORNATO con ultimi miglioramenti (commit 6515c8a)
- Modifiche: Sintassi GraphQL, campo 'type', documentazione
- Status: Pronto per Monday.com

❓ **App su Monday.com:**
- Secrets già configurati (CLIENT_SECRET, SIGNING_SECRET presenti in .env)
- Endpoints configurati: `/monday/authorize`, `/monday/sendEmail`, etc.
- Prossimo passo: Aggiornare le configurazioni su Monday.com

---

## 🔍 Verifica Configurazione Attuale

### Step 1: Verificare Secrets in .env

```bash
# Nel file .env trovi:
MONDAY_CLIENT_SECRET=f08e362a69cdd625245c35e3d1a122a2
MONDAY_SIGNING_SECRET=d722023b89262b8dc22227f3dcfa448a
```

✅ **TROVATI!** L'app è già registrata su Monday.com

### Step 2: Verificare dove è Deployata l'App

**Domanda:** Dove è currently deployata la tua app?
- [ ] Localhost (3000)
- [ ] Heroku
- [ ] Railway.app
- [ ] AWS Lambda
- [ ] Vercel
- [ ] Altro? ___________

**Questo è importante perché gli URLs cambiano!**

---

## 🚀 Come Pushare i Cambiamenti su Monday.com

### Se l'App è su LOCALHOST

❌ **NON puoi usare localhost per Monday.com in production**
- Monday non può raggiungere localhost
- Devi usare un tunnel (ngrok) O deployare su cloud

**Opzioni:**

#### Opzione A: Ngrok (rapido per testing)
```bash
# Installa ngrok (se non lo hai)
brew install ngrok

# Avvia tunnel
ngrok http 3000

# Output: https://abc123.ngrok.io
# Usa questo URL su Monday.com
```

#### Opzione B: Deployare su Cloud (per production)
Vedi step successivi

---

### Se l'App è su HEROKU

1. **Fai pull del nuovo codice:**
   ```bash
   git pull origin main
   ```

2. **Verifica .env locale ha i secrets corretti:**
   ```bash
   grep MONDAY .env
   # Dovrebbe mostrare CLIENT_SECRET e SIGNING_SECRET
   ```

3. **Deploy su Heroku:**
   ```bash
   git push heroku main
   ```

4. **Verifica deployment:**
   ```bash
   heroku logs --tail
   # Controlla che non ci siano errori
   ```

5. **Se Heroku URL è cambiato, aggiorna Monday.com:**
   - Vai a Monday.com Developer Center
   - Aggiorna Authorization URL: `https://your-app.herokuapp.com/monday/authorize`
   - Aggiorna Redirect URI: `https://your-app.herokuapp.com/monday/save-credentials`

---

### Se l'App è su RAILWAY.APP

1. **Fai pull del nuovo codice:**
   ```bash
   git pull origin main
   ```

2. **Login a Railway:**
   ```bash
   railway login
   ```

3. **Deploy:**
   ```bash
   railway up
   ```

4. **Se Railway URL è cambiato, aggiorna Monday.com:**
   - Vai a Monday.com Developer Center
   - Aggiorna Authorization URL: `https://your-project.up.railway.app/monday/authorize`
   - Aggiorna Redirect URI: `https://your-project.up.railway.app/monday/save-credentials`

---

### Se l'App è su AWS LAMBDA / VERCEL

**Simile a sopra:**
1. Pull codice da GitHub
2. Deploy tramite CI/CD (GitHub Actions, etc.)
3. Se URL cambia, aggiorna Monday.com Developer Center

---

## 📌 Cosa Cambia Su Monday.com?

### Endpoints Aggiornati

**Oggi il tuo app ha:**

| Endpoint | Vecchia Versione | Nuova Versione |
|----------|------------------|-----------------|
| `/monday/sendEmail` | ✅ Funziona | ✅ Migliore (GraphQL array syntax) |
| `/monday/authorize` | ✅ Funziona | ✅ Stessa (nessun cambio) |
| `/monday/save-credentials` | ✅ Funziona | ✅ Stessa (nessun cambio) |
| GraphQL query | Funziona | ✅ Ora array syntax allineato |
| Documentazione | Minima | ✅ Completa |

**Breaking changes:** ❌ NESSUNO
- L'app funziona esattamente come prima
- Monday.com non ha bisogno di riconfigurazione
- Solo miglioramenti interni

---

## ✅ Checklist: Come Pushare su Monday.com

### Se il codice è su GitHub e app su Heroku/Railway:

- [ ] **Step 1:** Verifica dove è deployata l'app
  ```bash
  # Se Heroku:
  heroku apps

  # Se Railway:
  railway list
  ```

- [ ] **Step 2:** Fai push del nuovo codice su cloud
  ```bash
  # Se Heroku:
  git push heroku main

  # Se Railway:
  railway up

  # Se altro, usa il tuo metodo di deploy
  ```

- [ ] **Step 3:** Verifica che deployment è OK
  ```bash
  # Se Heroku:
  heroku logs --tail

  # Se Railway:
  railway logs
  ```

- [ ] **Step 4:** Testa gli endpoint
  ```bash
  # Test authorization
  curl "https://your-domain.com/monday/authorize" \
    -H "Authorization: Bearer YOUR_TOKEN"

  # Dovrebbe ritornare HTML form
  ```

- [ ] **Step 5:** Se tutto funziona, sei DONE!
  - ✅ Codice aggiornato su GitHub
  - ✅ Codice deployato su cloud
  - ✅ App funziona con nuovi miglioramenti
  - ✅ No Monday.com config needed (backward compatible)

---

## 🔧 Se Devi Aggiornare Monday.com Settings

Vai a: **Developer Center > Your App > OAuth & Permissions**

Se l'URL è cambiato (es. heroku → railway), aggiorna:

```
Authorization URL:
  https://your-new-domain.com/monday/authorize

Redirect URI:
  https://your-new-domain.com/monday/save-credentials
```

Se l'URL NON è cambiato (es. app.herokuapp.com rimane uguale), **nessun cambio necessario!**

---

## 🧪 Come Testare che Tutto Funziona

### Test 1: Verifica Endpoint Raggiungibile
```bash
curl https://your-domain.com/health

# Response dovrebbe essere:
# {"status":"ok","timestamp":"...","uptime":...,"environment":"..."}
```

### Test 2: Verifica Authorization Endpoint
```bash
curl "https://your-domain.com/monday/authorize" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response dovrebbe essere HTML form
```

### Test 3: Verifica Field Definitions
```bash
curl -X POST https://your-domain.com/monday/fetchFieldDefs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Response dovrebbe essere:
# {"kind":"field_definitions","fields":[...]}
```

### Test 4: Verifica GraphQL Query (con Secrets)
```bash
curl -X POST https://your-domain.com/monday/sendEmail \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inboundFieldValues": {
      "email": {
        "subject": "Test",
        "body": "Test email"
      }
    },
    "itemId": 12345,
    "columnId": "email_column_id"
  }'

# Dovrebbe ritornare successo (o errore specifico se test data non valida)
```

---

## 📝 Riassunto Finale

### Cosa è Stato Fatto ✅
1. Codice aggiornato con best practices
   - Sintassi GraphQL array corretta
   - Campo 'type' aggiunto
   - Documentazione esplicita
2. Commit su GitHub (6515c8a)
3. Push su origin/main ✅

### Cosa Devi Fare Adesso ⏭️
1. **Identifica dove è deployata l'app** (Heroku/Railway/altro?)
2. **Fai deploy del nuovo codice**
   - `git push heroku main` (se Heroku)
   - `railway up` (se Railway)
   - Oppure il tuo metodo
3. **Verifica funzionamento** con uno dei test sopra
4. **Opzionale:** Se URL è cambiato, aggiorna Monday.com settings
5. **DONE!** ✅

---

## 🆘 Se Hai Problemi

### "Connection Refused"
- La app non è deployata o non è raggiungibile
- Verifica che il deploy è completato
- Controlla URL è corretto (https://, non http://)

### "401 Unauthorized"
- TOKEN è scaduto o non valido
- Genera un nuovo JWT token
- Verifica CLIENT_SECRET/SIGNING_SECRET in .env sono corretti

### "Endpoint not found"
- Url o metodo HTTP è sbagliato
- Verifica URI esatta: `/monday/authorize`, `/monday/sendEmail`, etc.

### "GraphQL error"
- ItemId o columnId non validi
- Oppure Monday API permission issue
- Controlla token ha permissions corrette

---

## 📞 Prossimi Step

1. **Dimmi dove è deployata l'app** (Heroku, Railway, altro?)
2. **Dimmi il domain/URL** dove è raggiungibile
3. **Io creerò un documento specifico** per il tuo setup
4. **Procediamo con il deploy** insieme

---

**Una volta che mi dici dove è l'app, ti guido step-by-step! 🚀**
