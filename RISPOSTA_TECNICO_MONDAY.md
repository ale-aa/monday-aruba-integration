# Risposta Tecnica al Supporto Monday.com - Gestione Email Column

**Data:** 27 Novembre 2025
**Referente:** Tecnico Supporto Monday.com
**Argomento:** Validazione implementazione colonna email e metodi di estrazione

---

## 1. Analisi Attuale della Nostra Implementazione

Abbiamo analizzato il flusso attuale nel nostro progetto e confermiamo che seguiamo un approccio **ibrido e robusto** con fallback multipli:

### Approccio A: Input Field Direct (Consigliato - Attualmente Primario)
**Dove:** `controllers/emailController.js:164-228`

```javascript
// Estratto dal nostro codice:
const recipientField = inboundFieldValues?.recipientEmail || inputFields?.recipientEmail;

if (recipientField) {
  // Caso 1: Oggetto con proprietà email/text/value
  if (typeof recipientField === 'object' && recipientField !== null) {
    recipient_email = recipientField.email || recipientField.text || recipientField.value;
  }
  // Caso 2: Stringa diretta
  else if (typeof recipientField === 'string') {
    recipient_email = recipientField;
  }
}
```

**Vantaggi:**
- ✅ Nessuna query GraphQL aggiuntiva
- ✅ Performance migliore (richiesta HTTP singola)
- ✅ Gestione sia di stringhe che di oggetti email
- ✅ Più affidabile in caso di colonne email con etichette

**Come configurare in Monday:**
1. Nel recipe automation, mappare un **Input Field** di tipo "Email column"
2. Collegare il campo email della board al parametro `recipientEmail`
3. Monday trasmetterà direttamente il valore della colonna (con etichetta se configurata)

### Approccio B: Column ID + GraphQL Query (Fallback)
**Dove:** `controllers/emailController.js:50-95, 206-209`

```javascript
async function fetchEmailFromColumn(itemId, columnId, userToken) {
  const query = `
    query {
      items(ids: ${itemId}) {
        column_values(ids: "${columnId}") {
          id
          text
          value
        }
      }
    }
  `;
  // ... executes query and extracts email
}
```

**Quando viene usato:**
- Se `recipientEmail` non è passato
- Se payload contiene `itemId` e `columnId`
- Query fornisce accesso ai campi `text` (etichetta) e `value` (email raw)

---

## 2. Chiarimento Tecnico: Email Column con Etichette

Basandoci sulla documentazione Monday.com che hai condiviso, abbiamo una domanda di chiarimento:

### Caso 1: La colonna email ha etichette configurate in Monday

**Esempio in Monday:**
```
Recipient: "Work email" (etichetta) → sottostante email: test@monday.com
```

**Per il nostro approccio:**

#### Via Input Field (consigliato):
Quando Monday trasmette il payload, dobbiamo confermare:
- **Riceveremo l'etichetta "Work email" come stringa?**
- **Oppure riceveremo il valore email vero "test@monday.com"?**
- **O riceveremo un oggetto con entrambi i campi?**

Secondo la tua documentazione:
> "Se il testo visualizzato non è impostato, è possibile utilizzare l'indirizzo email stesso"

Questo suggerisce che il `text` (etichetta) è un display value. **Abbiamo bisogno di sapere se Monday trasmette il `text` o direttamente il valore email quando usiamo Input Field.**

#### Via GraphQL/Column ID:
La query GraphQL ha accesso a:
- `text` → il valore visualizzato (etichetta, es. "Work email")
- `value` → il JSON raw della colonna
- `email` (in tipo EmailValue) → l'indirizzo effettivo

**Attualmente il nostro codice estrae:**
```javascript
const email = emailField.text || emailField.value;
```

### Caso 2: La colonna email NON ha etichette configurate

Monday restituirà direttamente l'indirizzo email in entrambi i campi (`text` e `value`).

---

## 3. Domanda Specifica per la Tua Conferma

Per implementare correttamente il supporto alle email columns con etichette, abbiamo bisogno di sapere:

### 🔍 Quando Monday passa i dati tramite **Input Field** (API payload):

**Scenario A - Email Column con etichetta:**
```
Colonna configurata in Monday:
├─ Item 1: etichetta="Work email" | email="alice@company.com"
├─ Item 2: etichetta="Personal" | email="bob@personal.com"
```

**Domanda:** Quando Monday trasmette questo campo come Input Field nel payload, cosa inviamo?

```json
// Opzione 1: Solo la stringa con etichetta
{ "recipientEmail": "Work email" }

// Opzione 2: Solo l'email
{ "recipientEmail": "alice@company.com" }

// Opzione 3: Oggetto con entrambi
{ "recipientEmail": { "label": "Work email", "email": "alice@company.com" } }

// Opzione 4: Solo il valore raw della colonna
{ "recipientEmail": "{\"email\":\"alice@company.com\",\"label\":\"Work email\"}" }
```

---

## 4. Il Nostro Processo di Debug Attuale

Abbiamo implementato logging completo per tracciare esattamente cosa riceve il nostro endpoint:

**File:** `controllers/emailController.js:120-151`

```javascript
console.log('[EmailController] ========== PAYLOAD STRUCTURE DEBUG ==========');
console.log('[EmailController] payload keys:', Object.keys(payload));
console.log('[EmailController] Available fields in inboundFieldValues:', Object.keys(inboundFieldValues || {}));
console.log('[EmailController] recipientField raw value:', JSON.stringify(recipientField));
console.log('[EmailController] recipientField type:', typeof recipientField);
```

**Accesso ai log:**
```bash
# Endpoint per visualizzare i payload ricevuti
GET /debug/email-payloads

# Mostra gli ultimi 10 payload ricevuti da Monday
```

---

## 5. Percorso di Implementazione Proposto

Basato sulla tua guida al supporto tecnico, proponiamo questo flusso:

### Fase 1: Input Field Mapping (Consigliato per la maggior parte dei casi)

```
Monday Recipe:
┌─────────────────────────────────────┐
│ Trigger: Item Updated               │
├─────────────────────────────────────┤
│ Action: Send Custom Request          │
│  ├─ Input Fields:                    │
│  │  ├─ recipientEmail ← Email Column│
│  │  └─ email (subject/body) ← Forms │
│  └─ Body: {inboundFieldValues: {...}}│
└─────────────────────────────────────┘
        ↓
   Our API /monday/sendEmail
        ↓
   Extract recipientEmail directly from Input Field
        ↓
   ✓ Send via SMTP
```

**Vantaggi:**
- Monday gestisce l'etichetta
- Noi riceviamo il valore email direttamente
- Nessuna query GraphQL aggiuntiva
- 1 request HTTP totale

### Fase 2: GraphQL Fallback (Per casi avanzati)

Se necessario accedere ai campi raw della colonna (etichetta + email):

```
Monday Recipe (advanced):
┌─────────────────────────────────────┐
│ Trigger: Item Updated               │
├─────────────────────────────────────┤
│ Action: Send Custom Request          │
│  ├─ Input Fields:                    │
│  │  ├─ columnId ← "email" (string)  │
│  │  └─ itemId ← {{item_id}}         │
│  └─ Body: {inboundFieldValues: {...}}│
└─────────────────────────────────────┘
        ↓
   Our API /monday/sendEmail
        ↓
   Fetch column via GraphQL (EmailValue type)
        ↓
   Access both: label + email fields
        ↓
   ✓ Send via SMTP
```

**Quando usare:**
- Necessario accedere all'etichetta della colonna
- Validazione di corrispondenza stretta su etichetta
- Audit logging che registri quale "labeled" email è stata usata

---

## 6. La Nostra Richiesta di Chiarimento

### ✅ Se la risposta è: "Input Field trasmette l'indirizzo email effettivo"

```
└─ Implementazione: COMPLETA e PRONTA
   - Il nostro Approccio A funziona perfettamente
   - Nessun cambio necessario
   - Supporta automaticamente etichette in Monday
```

### ✅ Se la risposta è: "Input Field trasmette l'etichetta (label)"

```
└─ Implementazione: Richiede QUERY AGGIUNTIVA
   - Ottenere etichetta da Input Field
   - Ricerca items con items_page_by_column_values filtrando su column_values
   - Estrarre email dal risultato
   - ALTERNATIVA: Chiedere a Monday di trasmettere column_id + item_id
     per usare nostro Approccio B (GraphQL)
```

### ✅ Se la risposta è: "Input Field trasmette un oggetto con label + email"

```
└─ Implementazione: AGGIORNARE NOSTRO PARSING
   - Il nostro codice è già preparato per oggetti
   - Aggiungiamo fallback specifico per { label, email }
   - Oppure { text, value } come da GraphQL EmailValue type
```

---

## 7. Codice Attuale - Area Critica da Validare

**File:** `controllers/emailController.js`
**Linee:** 163-241

Questa sezione contiene:
1. ✅ Estrazione da Input Field (tipo stringa)
2. ✅ Estrazione da Input Field (tipo oggetto)
3. ✅ Fallback per oggetti con fallback email→text→value
4. ✅ Fallback a GraphQL se necessario
5. ✅ Fallback finale: ricerca "@" in tutti i campi

**Status:** Pronto per tutti i tre scenari, ma dobbiamo validare quale riceve il vostro payload reale.

---

## 8. Suggerimento di Test

Una volta che rispondi ai nostri chiarimenti, proponiamo questo test:

### Passo 1: Setup Monday Recipe di test
```
Trigger: Custom automation button
Action: Send Custom Request to /monday/sendEmail
Input Fields:
  - recipientEmail ← Email Column from board
  - email.subject ← Static: "Test Email"
  - email.body ← Static: "Test Body"
```

### Passo 2: Trigger automation da item con email column

### Passo 3: Verificare logs
```bash
curl http://localhost:3000/debug/email-payloads

# Mostra esattamente cosa Monday invia:
{
  "timestamp": "2025-11-27T...",
  "userId": "user_123",
  "payload": {
    "inboundFieldValues": {
      "recipientEmail": ??? ← Questo è il valore che ci serve capire
    }
  }
}
```

### Passo 4: Validare/Aggiornare il parsing

---

## 9. Conclusione e Prossimi Passi

### ✅ Cosa abbiamo:
1. Implementazione robusta con fallback multipli
2. Support per Input Field Approach (primario)
3. Support per Column ID + GraphQL (secondario)
4. Logging completo per debugging
5. Parsing flessibile per stringhe, oggetti, fallback

### 🔄 Cosa abbiamo bisogno da te:

**Rispondere a una di queste domande:**

1. **"Quando passo una email column come Input Field in una Monday automation, Monday trasmette al mio endpoint l'etichetta della colonna (label) o il valore email effettivo?"**

2. **"Nel vostro payload inboundFieldValues per una email column, quale formato usiamo?"**
   - Stringa: `"test@monday.com"`
   - Stringa: `"Work email"` (solo etichetta)
   - Oggetto: `{ label: "Work email", email: "test@monday.com" }`
   - Altro?

3. **"Se devo ricevere sia l'etichetta che l'email dalla colonna, devo usare Column ID approach (itemId + columnId) oppure l'Input Field già lo supporta?"**

---

## 10. Allegati

### Riferimenti nel nostro codice:
- `controllers/emailController.js` - Logica di estrazione email (linee 163-241)
- `services/emailService.js` - Invio via SMTP Aruba
- `routes/email.js` - Endpoint API
- `/debug/email-payloads` - Endpoint per visualizzare payload ricevuti

### Logs dettagliati da verificare:
1. Payload ricevuto da Monday
2. Struttura inboundFieldValues
3. Tipo e valore di recipientEmail
4. Fallback path utilizzato

---

**Rimaniamo in attesa del vostro chiarimento per procedere con la validazione finale dell'implementazione.**

---

*Questo documento rappresenta l'analisi tecnica della nostra implementazione e la richiesta di chiarimento basata sulla documentazione Monday.com fornita.*
