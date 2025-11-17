# Email Payload Verification Guide

## Panoramica

Questo documento spiega come il codice estrae l'email dal payload di Monday.com e come verificare nei log che il valore arrivi correttamente.

---

## 1. Formato del Payload Atteso

Quando Monday.com invia la richiesta POST a `/monday/sendEmail`, il payload dovrebbe avere questa struttura:

### Formato Standard:
```json
{
  "inboundFieldValues": {
    "recipientEmail": {
      "email": "user@example.com",
      "text": "user@example.com",
      "value": "{\"email\":\"user@example.com\"}"
    },
    "email": {
      "subject": "Email Subject",
      "body": "Email content here"
    }
  },
  "inputFields": {
    // Può contenere gli stessi campi se passati come inputFields
  }
}
```

### Varianti Possibili:
- **Oggetto**: `{ email: "...", text: "...", value: "..." }`
- **Stringa diretta**: `"user@example.com"`
- **Solo text**: `{ text: "user@example.com" }`

---

## 2. Differenze di Codice: Prima vs Dopo

### PRIMA (Versione Semplificata - 13 righe):
```javascript
let recipient_email = null;
const recipientField = inboundFieldValues?.recipientEmail || inputFields?.recipientEmail;

console.log('[EmailController] recipientField:', recipientField);
console.log('[EmailController] recipientField type:', typeof recipientField);

// Gestisci formato oggetto { email: "..." }
if (recipientField && typeof recipientField === 'object') {
  recipient_email = recipientField.email || recipientField.text || recipientField.value;
  console.log('[EmailController] ✓ Extracted email from object:', recipient_email);
}
// Gestisci formato stringa
else if (typeof recipientField === 'string') {
  recipient_email = recipientField;
  console.log('[EmailController] ✓ Extracted email from string:', recipient_email);
}
```

**Problemi:**
- Logging generico, difficile da debuggare
- Fallback a `recipientField.text` non esplicito
- Non mostra i passi intermedi
- Difficile capire quale campo è stato usato

---

### DOPO (Versione Migliorata - 78 righe):
```javascript
// ===== ESTRAI EMAIL DESTINATARIO =====
console.log('[EmailController] ========== EXTRACTING RECIPIENT EMAIL ==========');
console.log('[EmailController] Available fields in inboundFieldValues:', Object.keys(inboundFieldValues || {}));
console.log('[EmailController] Available fields in inputFields:', Object.keys(inputFields || {}));

let recipient_email = null;
const recipientField = inboundFieldValues?.recipientEmail || inputFields?.recipientEmail;

console.log('[EmailController] recipientField raw value:', JSON.stringify(recipientField));
console.log('[EmailController] recipientField type:', typeof recipientField);

// Estrazione email con fallback completo
if (recipientField) {
  // Caso 1: Formato oggetto { email: "..." }
  if (typeof recipientField === 'object' && recipientField !== null) {
    console.log('[EmailController] → recipientField is OBJECT');
    console.log('[EmailController] → Object keys:', Object.keys(recipientField));
    console.log('[EmailController] → recipientField.email:', recipientField.email);
    console.log('[EmailController] → recipientField.text:', recipientField.text);
    console.log('[EmailController] → recipientField.value:', recipientField.value);

    // Prova email -> text -> value (FALLBACK ESPLICITO)
    recipient_email = recipientField.email;
    if (!recipient_email) {
      console.log('[EmailController] → email field empty, trying text field...');
      recipient_email = recipientField.text;
    }
    if (!recipient_email) {
      console.log('[EmailController] → text field empty, trying value field...');
      recipient_email = recipientField.value;
    }

    if (recipient_email) {
      console.log('[EmailController] ✓ Extracted email from object (via fallback):', recipient_email);
    } else {
      console.log('[EmailController] ❌ Object has no valid email field');
    }
  }
  // Caso 2: Formato stringa diretta
  else if (typeof recipientField === 'string') {
    console.log('[EmailController] → recipientField is STRING');
    recipient_email = recipientField;
    console.log('[EmailController] ✓ Extracted email from string:', recipient_email);
  }
  // Caso 3: Altro formato non riconosciuto
  else {
    console.log('[EmailController] ❌ recipientField has unexpected type:', typeof recipientField);
  }
} else {
  console.log('[EmailController] ❌ recipientField is null/undefined');
  console.log('[EmailController] → Checking all inboundFieldValues for email patterns...');

  // Fallback: Cerca qualsiasi campo che contenga "@"
  for (const [key, value] of Object.entries(inboundFieldValues || {})) {
    console.log(`[EmailController] → Checking field "${key}":`, typeof value === 'object' ? JSON.stringify(value) : value);
    if (typeof value === 'string' && value.includes('@')) {
      recipient_email = value;
      console.log(`[EmailController] ✓ Found email in field "${key}":`, recipient_email);
      break;
    }
    if (typeof value === 'object' && value?.email && value.email.includes('@')) {
      recipient_email = value.email;
      console.log(`[EmailController] ✓ Found email in object field "${key}":`, recipient_email);
      break;
    }
  }
}

// Validazione finale
if (!recipient_email || !recipient_email.includes('@')) {
  console.error('[EmailController] ❌ Email destinatario NON VALIDA o MANCANTE!');
  console.error('[EmailController] Extracted value:', recipient_email);
  console.error('[EmailController] Full inboundFieldValues:', JSON.stringify(inboundFieldValues, null, 2));
  console.error('[EmailController] Full inputFields:', JSON.stringify(inputFields, null, 2));
  throw new Error('Email destinatario non trovata. Assicurati di aver mappato il campo recipientEmail correttamente nel form.');
}

console.log('[EmailController] ✅ FINAL Recipient email:', recipient_email);
console.log('[EmailController] ==========================================');
```

**Miglioramenti:**
- ✅ Fallback **esplicito**: `email → text → value`
- ✅ Logging per **ogni passo** della decisione
- ✅ Mostra i **nomi dei campi disponibili**
- ✅ Mostra il **tipo del campo** ricevuto
- ✅ Mostra il **valore grezzo** del campo
- ✅ Mostra il **tentativo fallito** di estrazione
- ✅ Fallback finale: cerca in **tutti i campi** per pattern email
- ✅ Errore finale contiene il **payload completo** per debug

---

## 3. Come Verificare nei Log

Quando il codice riceve una richiesta, i log seguono questo flusso:

### A. STEP 1: Vedrai quali campi sono disponibili
```
[EmailController] ========== EXTRACTING RECIPIENT EMAIL ==========
[EmailController] Available fields in inboundFieldValues: ['recipientEmail', 'email']
[EmailController] Available fields in inputFields: []
```
✅ **Se vedi `recipientEmail` in questa lista, è stato passato correttamente**

---

### B. STEP 2: Vedrai il valore grezzo ricevuto
```
[EmailController] recipientField raw value: {"email":"user@example.com","text":"user@example.com","value":"{...}"}
[EmailController] recipientField type: object
```
✅ **Se è `object`, il codice entrerà nel ramo di estrazione per oggetti**
✅ **Se è `string`, il codice entrerà nel ramo di estrazione per stringhe**

---

### C. STEP 3: Vedrai il tentativo di estrazione
```
[EmailController] → recipientField is OBJECT
[EmailController] → Object keys: ['email', 'text', 'value']
[EmailController] → recipientField.email: user@example.com
[EmailController] → recipientField.text: user@example.com
[EmailController] → recipientField.value: {...}
[EmailController] ✓ Extracted email from object (via fallback): user@example.com
```
✅ **Vedi qual è il valore di ogni campo**
✅ **Vedi quale campo è stato usato per l'estrazione**

---

### D. STEP 4: Vedrai il valore finale
```
[EmailController] ✅ FINAL Recipient email: user@example.com
[EmailController] ==========================================
```
✅ **Questa è l'email che sarà usata per inviare il messaggio**

---

## 4. Scenari di Debug

### Scenario 1: Email non trovata
```
[EmailController] ❌ recipientField is null/undefined
[EmailController] → Checking all inboundFieldValues for email patterns...
[EmailController] → Checking field "email": {subject:"...", body:"..."}
[EmailController] ❌ Email destinatario NON VALIDA o MANCANTE!
[EmailController] Extracted value: null
[EmailController] Full inboundFieldValues: {...}
```
**Soluzione:** Controlla che il campo `recipientEmail` sia mappato nel form di Monday

---

### Scenario 2: Solo campo `.text` disponibile
```
[EmailController] → Object keys: ['text']
[EmailController] → recipientField.email: undefined
[EmailController] → email field empty, trying text field...
[EmailController] → recipientField.text: user@example.com
[EmailController] ✓ Extracted email from object (via fallback): user@example.com
```
**Risultato:** ✅ L'email è estratta correttamente dal campo `text`

---

### Scenario 3: Email arriva come stringa diretta
```
[EmailController] recipientField type: string
[EmailController] → recipientField is STRING
[EmailController] ✓ Extracted email from string: user@example.com
```
**Risultato:** ✅ L'email è estratta correttamente dalla stringa

---

## 5. Come Leggere i Log in Monday Code

### Opzione A: Usare il Debug Endpoint
```bash
curl https://e56f0-service-32281405-f2dd3966.us.monday.app/debug/email-payloads
```

Questo restituisce gli ultimi 10 payload ricevuti salvati in `logs/email-payloads.json`

### Opzione B: Controllare i Log in Tempo Reale
Se hai accesso ai log dell'applicazione (via Monday Code Console o CloudWatch):
1. Cerca le righe che iniziano con `[EmailController]`
2. Guarda il flusso dalla riga `========== EXTRACTING RECIPIENT EMAIL ==========`
3. Segui il flusso fino a `✅ FINAL Recipient email:`

---

## 6. Checklist di Verifica

Quando testi la funzionalità, assicurati che:

- [ ] Il payload contiene il campo `recipientEmail`
- [ ] I log mostrano `Available fields in inboundFieldValues: ['recipientEmail', ...]`
- [ ] I log mostrano il valore ricevuto in `recipientField raw value: ...`
- [ ] I log mostrano quale campo è stato usato (`→ recipientField is OBJECT` o `STRING`)
- [ ] I log mostrano il fallback (`email field empty, trying text field...`)
- [ ] I log mostrano il valore finale (`✅ FINAL Recipient email: user@example.com`)
- [ ] L'email contiene il simbolo `@`
- [ ] Non vedi errori nella sezione `Email destinatario NON VALIDA`

---

## 7. Configurazione di Monday per il Form

Nel form di Monday per l'automation, assicurati che:

1. **Definisci il campo di input** nel tuo manifesto/schema:
   ```json
   {
     "id": "recipientEmail",
     "title": "Email Recipient",
     "type": "input",  // O dropdown con remote options
     "required": true
   }
   ```

2. **Mappa il campo nel recipe sentence**:
   ```
   When [trigger] → Send email to {{recipientEmail}} with subject {{subject}} and body {{body}}
   ```

3. **Verifica che Monday passi il valore** controllando il payload nei log

---

## 8. Riassunto Delle Modifiche

| Aspetto | Prima | Dopo |
|---------|-------|------|
| Righe di codice estrazione | 13 | 78 |
| Log per debug | Minimo (3 log) | Massimo (15+ log) |
| Fallback esplicito | ❌ Implicito (||) | ✅ Esplicito con messaggio |
| Visibilità campi disponibili | ❌ No | ✅ Sì (mostra keys) |
| Traccia ogni tentativo | ❌ No | ✅ Sì |
| Mostra valore grezzo | ❌ No | ✅ Sì (JSON.stringify) |
| Fallback finale search | ❌ No | ✅ Sì (loop su tutti i campi) |
| Errore con contesto completo | ❌ Generico | ✅ Payload completo allegato |

---

## 9. Contatti e Support

Se il codice non estrae l'email correttamente:

1. Copia i log da `[EmailController] ========== EXTRACTING RECIPIENT EMAIL ==========` fino a `[EmailController] ==========================================`
2. Controlla se vedi `❌` invece di `✅`
3. Leggi il messaggio di errore dopo `❌`
4. Verifica che il campo `recipientEmail` sia mappato nel form di Monday
5. Se necessario, aggiungi ulteriore logging per il valore di `payload.inboundFieldValues` all'inizio della funzione
