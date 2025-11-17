# Critical Checklist - Configurazione Essenziale per Monday.com

Questi 3 punti sono **CRUCIALI** per far funzionare l'integrazione. Se anche uno è sbagliato, l'automation rimarrà in Pending.

---

## 1️⃣ ID CAMPO RECIPE (recipientEmail)

### ✅ Nel Codice (Verificato)

**File**: `controllers/emailController.js` (line 100)
```javascript
const recipientField = inboundFieldValues?.recipientEmail || inputFields?.recipientEmail;
```

**Significato**: Il codice legge il campo con ID esatto `recipientEmail`.

---

### ❓ Nel Form Monday (DA VERIFICARE DA TE)

Nel Monday Developer Center, la Recipe Sentence deve avere:

```
When [TRIGGER] → Send email to {{recipientEmail}} with subject "..." and body "..."
```

**❌ SBAGLIATO:**
```
When [TRIGGER] → Send email to {{recipient_email}} with subject "..." and body "..."
                                    ↑ underscore - NON FUNZIONA
```

**❌ SBAGLIATO:**
```
When [TRIGGER] → Send email to {{someoneEmail}} with subject "..." and body "..."
                                    ↑ diverso ID - NON FUNZIONA
```

### Checklist:
- [ ] Field Input ID = `recipientEmail` (esatto, camelCase)
- [ ] Type = "email" o "text" (dipende da come lo vuoi mappare)
- [ ] Required = true
- [ ] Nessun underscore o caratteri speciali

---

## 2️⃣ PERCORSI PAYLOAD (req.body.payload)

### ✅ Nel Codice (Verificato)

**File**: `controllers/emailController.js` (line 68)
```javascript
const payload = req.body.payload || req.body;
const { inboundFieldValues, inputFields } = payload;
```

**Significato**:
- Se Monday manda `req.body.payload` → usa `req.body.payload`
- Se Monday manda direttamente in `req.body` → usa `req.body`
- **Il codice supporta ENTRAMBI i formati** ✅

### Due Formati Possibili

#### Formato A: Payload Incapsulato
```javascript
// req.body
{
  "payload": {
    "inboundFieldValues": {
      "recipientEmail": "user@example.com",
      "email": { "subject": "...", "body": "..." }
    },
    "inputFields": { ... }
  }
}

// Il codice usa: req.body.payload
```

#### Formato B: Payload Diretto
```javascript
// req.body
{
  "inboundFieldValues": {
    "recipientEmail": "user@example.com",
    "email": { "subject": "...", "body": "..." }
  },
  "inputFields": { ... }
}

// Il codice usa: req.body
```

### ✅ Verifica Tramite Log

Quando la automation viene triggerata, guarda il log:
```
[EmailController] req.body: {"payload": {...}}  ← Se vedi "payload" qui, è Formato A
[EmailController] req.body: {"inboundFieldValues": {...}}  ← Se vedi questo, è Formato B
```

**Il codice gestisce automaticamente entrambi!** ✅

---

## 3️⃣ ACK (200 OK) + COMPLETION CALLBACK

### ⚠️ ATTENZIONE: Questo è il Punto Critico per il Pending

Quando Monday.com invia una richiesta all'endpoint `/monday/sendEmail`:

1. **Server DEVE rispondere 200 OK SUBITO** (acknowledge)
2. **Poi invia il callback di completion** (success/error)

### Cosa Fa il Codice Attualmente

**File**: `controllers/emailController.js` (lines 182-191)

```javascript
return res.status(200).json({
  success: true,
  message: 'Email inviata con successo',
  messageId: result.messageId,
  provider: 'aruba_smtp',
  from: credentials.aruba_email,
  to: recipient_email,
  timestamp: new Date().toISOString(),
  duration_ms: duration
});
```

✅ **Il codice restituisce 200 OK con il payload di completamento**

### Possibile Problema: Monday Ignora il Callback

Se Monday ignora il callback e resta in Pending, devi:

1. **Verificare il Run URL** nella configurazione della Recipe
2. **Assicurarsi che sia corretto**: `https://bddad-service-32281405-f2dd3966.us.monday.app/monday/sendEmail`
3. **Monday deve ricevere la risposta con `success: true`**

### La Risposta Corretta Deve Contenere

Affinché Monday non resti in Pending, la risposta (200 OK) deve includere:

```json
{
  "success": true,
  "message": "Email inviata con successo",
  "timestamp": "2025-11-17T...",
  "duration_ms": 1234
}
```

**Oppure** (formato alternativo):

```json
{
  "status": "ok",
  "completed": true,
  "duration_ms": 1234
}
```

### ❌ Formati che NON Funzionano (Rimangono Pending)

```json
// ❌ SBAGLIATO: Solo statusCode senza success
{ "statusCode": 200 }

// ❌ SBAGLIATO: Solo error, anche se 200
{ "error": null }

// ❌ SBAGLIATO: Non risponde affatto (timeout)
// (nessuna risposta entro 10-30 secondi)
```

---

## 📋 CHECKLIST FINALE (DA FARE PRIMA DI TESTARE)

### Codice ✅
- [x] `recipientEmail` è il field ID nel codice (verificato in emailController.js:100)
- [x] Payload parsing supporta entrambi i formati (verificato in emailController.js:68)
- [x] Risposta 200 OK con `success: true` (verificato in emailController.js:182)

### Monday Developer Center ❓ (DA VERIFICARE DA TE)
- [ ] **Field ID della Recipe**: `recipientEmail` (camelCase, senza underscore)
- [ ] **Field Type**: email o text
- [ ] **Mapping**: recipientEmail ← Item Column (Email column)
- [ ] **Run URL**: https://bddad-service-32281405-f2dd3966.us.monday.app/monday/sendEmail
- [ ] **Authorization**: Bearer [JWT Token]
- [ ] **Method**: POST
- [ ] **Body**: `inboundFieldValues` e `inputFields`

---

## 🔍 COME DEBUGGARE SE RIMANE IN PENDING

### Step 1: Guarda i Log
```bash
curl https://bddad-service-32281405-f2dd3966.us.monday.app/debug/email-payloads
```

Dovresti vedere i payload ricevuti. Se non ci sono, Monday non sta inviando nulla.

### Step 2: Controlla il Log della Automazione

Nel Monday Developer Center, apri la Recipe e guarda i log dell'esecuzione.

Cosa cercare:
- ❌ **Errore di connessione**: Run URL non raggiungibile
- ❌ **Errore 401**: JWT non valido
- ❌ **Errore 400**: Payload malformato
- ❌ **Timeout (30s)**: Server non risponde
- ✅ **200 OK**: Server ha risposto

### Step 3: Verifica il Payload Ricevuto

Nel file `/debug/email-payloads`, cercaallo Scenario più comune:

```
Available fields in inboundFieldValues: ['recipientEmail', 'email']
```

✅ Se vedi questo, il field `recipientEmail` è stato passato

Se vedi:
```
Available fields in inboundFieldValues: ['email']
```

❌ Il field `recipientEmail` NON è stato mappato. Torna a Monday e assicurati di aver aggiunto l'input field.

### Step 4: Controlla il Valore dell'Email

Nel log, dovresti vedere:
```
[EmailController] recipientField raw value: "user@example.com"
[EmailController] → recipientField is STRING
[EmailController] ✓ Extracted email from string: user@example.com
[EmailController] ✅ FINAL Recipient email: user@example.com
```

Se vedi un errore, controlla che l'email sia nel formato corretto.

---

## 🎯 RIASSUNTO DEI 3 PUNTI CRITICI

| Punto | Nel Codice | In Monday.com | Status |
|-------|-----------|----------------|--------|
| **1. Field ID** | `recipientEmail` | `{{recipientEmail}}` | ✅ Verificato (codice) / ❓ Da te |
| **2. Payload Path** | `req.body.payload \|\| req.body` | Automatic | ✅ Verificato |
| **3. ACK + Callback** | `res.status(200).json({success: true})` | Riceve response | ✅ Verificato |

---

## 💡 PRO TIP: Test Rapido

1. Crea una automation con SOLO l'input field `recipientEmail`
2. Trigga manualmente
3. Guarda i log con `/debug/email-payloads`
4. Se vedi il payload e non rimane in Pending, tutto è corretto

Se rimane in Pending:
- Controlla il Run URL in Monday
- Verifica che il JWT sia valido
- Assicurati che `recipientEmail` sia l'ID esatto

---

## 📞 Contatti

Se l'automation rimane in Pending dopo questa verifica, condividi:
1. ID esatto del field nella Recipe (es: `recipientEmail`)
2. L'output di `/debug/email-payloads` quando triggi l'automation
3. Gli ultimi 50 log nella Monday Developer Console

**Sarà facile individuare il problema!**
