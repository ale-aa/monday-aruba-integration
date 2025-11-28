# Diagramma Flusso - Estrazione Email da Monday Column

---

## Scenario Generale: Email Column in Monday

```
┌─────────────────────────────────────────────────────┐
│  Monday.com Board - Email Column                    │
├─────────────────────────────────────────────────────┤
│  Item 1:                                            │
│  ├─ Etichetta (label): "Work email"                │
│  └─ Valore (email): alice@company.com              │
│                                                     │
│  Item 2:                                            │
│  ├─ Etichetta: "Personal"                          │
│  └─ Valore: bob@personal.com                       │
└─────────────────────────────────────────────────────┘
```

---

## Flusso 1: INPUT FIELD METHOD (Primario)

```
┌──────────────────────────────────────────────────────────┐
│ MONDAY RECIPE BUILDER                                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Trigger: Item Updated (or Custom Button)               │
│           ↓                                              │
│  Action: Send Custom Request                            │
│         ├─ Endpoint: /monday/sendEmail                  │
│         ├─ Method: POST                                 │
│         └─ Body:                                        │
│             {                                           │
│               inboundFieldValues: {                     │
│                 recipientEmail: ← EMAIL COLUMN ✓        │
│                 email: {                                │
│                   subject: "Subject",                   │
│                   body: "Body"                          │
│                 }                                       │
│               }                                         │
│             }                                           │
└──────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────┐
│ MONDAY API TRANSMISSION                                  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Monday elabora il valore della email column e lo         │
│ trasmette nel payload al nostro backend.                │
│                                                           │
│ ⚠️ DOMANDA: Cosa trasmette Monday?                      │
│    A) "alice@company.com" (solo email)                 │
│    B) "Work email" (solo etichetta)                    │
│    C) { label: "...", email: "..." } (entrambi)        │
│                                                           │
└──────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────┐
│ OUR BACKEND: emailController.js (lines 164-201)         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Extract recipientEmail from inboundFieldValues:         │
│                                                           │
│  1. Ricevi payload                                      │
│  2. Estrai inboundFieldValues.recipientEmail            │
│                                                           │
│  if (typeof recipientEmail === 'string') {             │
│    ✓ recipient_email = recipientEmail                  │
│                                                           │
│  } else if (typeof recipientEmail === 'object') {      │
│    ✓ recipient_email = recipientEmail.email ||         │
│                        recipientEmail.text ||          │
│                        recipientEmail.value            │
│  }                                                      │
│                                                           │
│  3. Valida: deve contenere "@"                         │
│  4. Se validazione OK → procedi all'invio              │
│                                                           │
└──────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────┐
│ ARUBA SMTP: emailService.js                              │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  - Connessione SMTP a mail.aruba.it:465                │
│  - Auth: credenziali Aruba utente                       │
│  - Send: EMAIL SENT ✓                                  │
│                                                           │
└──────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────┐
│ RESPONSE                                                  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  {                                                       │
│    "success": true,                                     │
│    "message": "Email inviata con successo",             │
│    "messageId": "...",                                  │
│    "from": "user@aruba.it",                            │
│    "to": "alice@company.com",                          │
│    "timestamp": "2025-11-27T...",                      │
│    "duration_ms": 1234                                 │
│  }                                                       │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Vantaggi:**
- ✅ 1 sola richiesta HTTP
- ✅ No GraphQL query
- ✅ Semplice e veloce
- ✅ Monday gestisce l'etichetta per noi

**Limitazioni:**
- ❌ Se Monday trasmette solo l'etichetta (non l'email), fallisce
- ❌ Non abbiamo accesso alla label se Monday trasmette solo l'email

---

## Flusso 2: COLUMN ID + GraphQL METHOD (Fallback)

```
┌──────────────────────────────────────────────────────────┐
│ MONDAY RECIPE BUILDER                                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Trigger: Item Updated                                  │
│           ↓                                              │
│  Action: Send Custom Request                            │
│         ├─ Endpoint: /monday/sendEmail                  │
│         ├─ Method: POST                                 │
│         └─ Body:                                        │
│             {                                           │
│               inboundFieldValues: {                     │
│                 email: {...}                           │
│               },                                        │
│               itemId: {{item_id}},                      │
│               columnId: "email"                         │
│             }                                           │
│             ────────────────────────                   │
│             Se recipientEmail non è disponibile,       │
│             Monday trasmette itemId + columnId per     │
│             permetterci di fare una GraphQL query      │
│                                                         │
└──────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────┐
│ OUR BACKEND: emailController.js (lines 206-209)         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  if (payload.itemId && payload.columnId) {             │
│    ✓ recipient_email = await fetchEmailFromColumn(...)  │
│  }                                                       │
│                                                           │
│  → Trigger GraphQL Query                                │
│                                                           │
└──────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────┐
│ GRAPHQL QUERY: emailController.js (lines 50-95)         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  query {                                                │
│    items(ids: [12345]) {                               │
│      column_values(ids: "email") {                      │
│        id                                               │
│        text        ← Etichetta (label)                  │
│        value       ← JSON raw della colonna             │
│      }                                                   │
│    }                                                    │
│  }                                                       │
│                                                           │
│  Authorization: Bearer <MONDAY_API_TOKEN>               │
│                                                           │
└──────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────┐
│ MONDAY API RESPONSE                                      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  {                                                       │
│    "data": {                                            │
│      "items": [{                                        │
│        "column_values": [{                              │
│          "id": "email",                                 │
│          "text": "Work email",      ← Etichetta        │
│          "value": {                 ← JSON raw         │
│            "email": "alice@company.com",                │
│            "label": "Work email"                        │
│          }                                              │
│        }]                                               │
│      }]                                                 │
│    }                                                    │
│  }                                                       │
│                                                           │
└──────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────┐
│ OUR PARSING: emailController.js (lines 84-90)           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  const emailField = columnValues[0];                    │
│  const email = emailField.text ||     ← Fallback       │
│                emailField.value;      ← Prova value    │
│                                                         │
│  ✓ recipient_email = "alice@company.com"               │
│                                                         │
│  (o estrai .value.email se è JSON)                     │
│                                                         │
└──────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────┐
│ CONTINUE TO SMTP SENDING                                │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  (same as Flusso 1 from this point)                     │
│                                                           │
│  ✓ EMAIL SENT via Aruba SMTP                           │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Vantaggi:**
- ✅ Accesso completo a label + email
- ✅ Supporta etichette configurate in Monday
- ✅ Flessibile per casi complessi

**Limitazioni:**
- ❌ 2 richieste HTTP (1 al nostro API, 1 a Monday GraphQL)
- ❌ Più lentezza dovuta alla query aggiuntiva
- ❌ Richiede authorization al Monday GraphQL

---

## Decision Tree - Quale Metodo Usare?

```
┌─────────────────────────────────────────────────────┐
│ Abbiamo ricevuto un payload con                    │
│ inboundFieldValues.recipientEmail?                 │
└─────────────────────────────────────────────────────┘
     YES ↓                                     NO ↓

   ┌──────────────┐              ┌──────────────────┐
   │ METODO 1:    │              │ Abbiamo itemId + │
   │ INPUT FIELD  │              │ columnId?        │
   │              │              │                  │
   │ Estrai da    │              └──────────────────┘
   │ recipientEmail         YES ↓       NO ↓
   │              │
   │ ✓ DONE       │    ┌───────────┐  ┌─────────────┐
   └──────────────┘    │ METODO 2: │  │ ERROR:      │
                       │ GraphQL   │  │ Payload non │
                       │           │  │ supportato  │
                       │ Query API │  │             │
                       │ per email │  │ (Contatta   │
                       │           │  │  Monday)    │
                       │ ✓ DONE    │  │             │
                       └───────────┘  └─────────────┘
```

---

## Tabella Comparativa

| Aspetto | Input Field | Column ID + GraphQL |
|---------|-------------|-------------------|
| Numero requests HTTP | 1 | 2 |
| Performance | Ottima | Buona |
| Etichette supportate | Sì (via Monday) | Sì (esplicito) |
| Complessità setup Monday | Minima | Media |
| Accesso a label | Indiretto | Diretto |
| Accesso a email raw | Diretto | Diretto |
| Fallback disponibile | Sì | Sì (nessuno) |
| Consigliato | ✅ PRIMARIO | ⚠️ FALLBACK |

---

## Flowchart Completo - Estrazione Email

```
START: Ricevi payload /monday/sendEmail
│
├─→ Estrai inboundFieldValues
│
├─→ Cerca recipientEmail in inboundFieldValues
│   │
│   ├─→ SE tipo = stringa
│   │   └─→ ✓ Usa direttamente
│   │
│   ├─→ SE tipo = oggetto
│   │   ├─→ Prova .email
│   │   ├─→ Prova .text (fallback)
│   │   └─→ Prova .value (fallback)
│   │
│   └─→ SE null/undefined
│       └─→ Vai a GraphQL Query
│
├─→ Valida email (contiene "@")
│   │
│   ├─→ SE valida
│   │   └─→ Procedi a SMTP
│   │
│   └─→ SE non valida
│       ├─→ Prova GraphQL Query (itemId + columnId)
│       │
│       └─→ SE GraphQL falisce
│           └─→ Ricerca email in tutti i campi
│               └─→ ERROR: Email non trovata
│
├─→ SMTP: Invia email
│
└─→ END: Return response

```

---

## Debug & Logging

```
┌─────────────────────────────────────────────────────┐
│ LOGGING PUNTI CHIAVE                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [EmailController] Payload structure debug          │
│ [EmailController] Available fields in              │
│                  inboundFieldValues                │
│ [EmailController] recipientField raw value         │
│ [EmailController] recipientField type              │
│ [EmailController] Extracted email: ...             │
│ [EmailController] Email validation: PASS/FAIL      │
│                                                     │
│ → Se GraphQL query viene eseguita:                 │
│ [EmailController] FETCHING EMAIL FROM COLUMN       │
│ [EmailController] itemId: ...                      │
│ [EmailController] columnId: ...                    │
│ [EmailController] Email retrieved: ...             │
│                                                     │
└─────────────────────────────────────────────────────┘

Endpoint debug per visualizzare payload ricevuti:
GET /debug/email-payloads → mostra ultimi 10 payload
```

---

## Conclusione

La nostra implementazione è **completamente preparata** per supportare email columns con etichette, seguendo la documentazione Monday.com.

**Rimaniamo in attesa di chiarimenti su quale valore Monday trasmette nel campo recipientEmail quando è collegato a una email column.**

Una volta confermato, procederemo con testing e validazione finale.
