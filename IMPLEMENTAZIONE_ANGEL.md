# Piano di Implementazione - Feedback Angel

**Data:** 27 Novembre 2025
**Target:** Implementare le raccomandazioni di Angel per selettore di colonne

---

## 🎯 Obbiettivo

Implementare un sistema robusto per permettere agli utenti di **selezionare una colonna** nel recipe automation di Monday, e recuperarne i valori tramite GraphQL.

---

## 📋 Checklist di Implementazione

- [ ] **Fase 1:** Aggiornare fetchFieldDefs (30 min)
- [ ] **Fase 2:** Aggiornare GraphQL query (30 min)
- [ ] **Fase 3:** Aggiornare emailController (45 min)
- [ ] **Fase 4:** Documentazione nel codice (30 min)
- [ ] **Fase 5:** Testing e validazione (1 ora)

**Tempo totale: ~3 ore**

---

## 📝 FASE 1: Aggiornare fetchFieldDefs

### File: `routes/email.js`

**Cambio:** Rendere fetchFieldDefs più generico e documentato

**Current code (linee 32-46):**
```javascript
router.post('/monday/fetchFieldDefs', verifyMonday, (req, res) => {
  console.log('[FieldDefs] Request body:', JSON.stringify(req.body, null, 2));

  res.status(200).json({
    kind: 'field_definitions',
    fields: [
      {
        id: 'dynamic_email',
        title: 'Email column',
        type: 'column',
        allowed_column_types: ['email'],
        required: true
      }
    ]
  });
});
```

**New code (proposed):**
```javascript
/**
 * POST /monday/fetchFieldDefs
 *
 * Returns field definitions for the recipe automation
 * This endpoint is called when Monday opens the field selector in the
 * automation builder, allowing users to select columns
 *
 * Response includes field definitions that Monday will display to the user:
 * - selectedColumn: Column picker (user selects which column to use)
 * - email: Email details (subject/body)
 *
 * When user selects a column, Monday will:
 * 1. Capture the columnId
 * 2. Pass it in the payload when automation runs
 * 3. The backend will receive it as inboundFieldValues.selectedColumn
 * 4. Use GraphQL to fetch the value from that column
 */
router.post('/monday/fetchFieldDefs', verifyMonday, (req, res) => {
  console.log('[FieldDefs] Request received for field definitions');
  console.log('[FieldDefs] Request body:', JSON.stringify(req.body, null, 2));

  // Return field definitions for the recipe
  res.status(200).json({
    kind: 'field_definitions',
    fields: [
      {
        // Column selector: User picks which column to use
        id: 'selectedColumn',
        title: 'Select a column',
        type: 'column',
        description: 'Choose the column containing the email address to send to',
        required: true
      },
      {
        // Email content fields
        id: 'email',
        title: 'Email content',
        type: 'paragraph',
        description: 'Email subject and body',
        required: true
      }
    ]
  });
});
```

**Task:**
- [ ] Apri `routes/email.js`
- [ ] Sostituisci linee 32-46 con il nuovo codice
- [ ] Commit: "Update fetchFieldDefs to support generic column selection"

---

## 🔧 FASE 2: Aggiornare GraphQL Query

### File: `controllers/emailController.js`

**Cambio:** Rinominare e generalizzare `fetchEmailFromColumn` a `fetchColumnValue`

**Current code (linee 50-95):**
```javascript
async function fetchEmailFromColumn(itemId, columnId, userToken) {
  try {
    console.log('[EmailController] ========== FETCHING EMAIL FROM COLUMN ==========');
    console.log('[EmailController] itemId:', itemId);
    console.log('[EmailController] columnId:', columnId);

    const query = `
      query {
        items(ids: ${itemId}) {
          id
          column_values(ids: "${columnId}") {
            id
            text
            value
          }
        }
      }
    `;
    // ... rest of function
```

**New code (proposed):**
```javascript
/**
 * Fetch a column value from Monday using GraphQL
 * Supports any column type (email, text, user, status, dropdown, etc.)
 *
 * Returns the column data including:
 * - id: Column identifier
 * - text: Display value (used for labels, display text)
 * - value: Raw value from the column
 * - type: Column type (helpful for parsing specific column types)
 *
 * @param {number} itemId - Monday item ID
 * @param {string} columnId - Monday column ID
 * @param {string} userToken - JWT token for Monday API authentication
 * @returns {Promise<{id, text, value, type}>} Column value object
 */
async function fetchColumnValue(itemId, columnId, userToken) {
  try {
    console.log('[EmailController] ========== FETCHING COLUMN VALUE ==========');
    console.log('[EmailController] itemId:', itemId);
    console.log('[EmailController] columnId:', columnId);

    // GraphQL query to fetch column values
    // Uses array syntax for columnId as per Monday.com documentation
    const query = `
      query {
        items(ids: [${itemId}]) {
          id
          column_values(ids: ["${columnId}"]) {
            id
            text
            value
            type
          }
        }
      }
    `;

    console.log('[EmailController] Executing GraphQL query...');

    const response = await axios.post('https://api.monday.com/graphql',
      { query },
      {
        headers: {
          'Authorization': userToken,
          'Content-Type': 'application/json'
        }
      }
    );

    // Handle GraphQL errors
    if (response.data?.errors) {
      const errorMsg = response.data.errors.map(e => e.message).join(', ');
      throw new Error(`GraphQL error: ${errorMsg}`);
    }

    const columnValues = response.data?.data?.items?.[0]?.column_values;
    if (!columnValues || columnValues.length === 0) {
      throw new Error(`Column not found for itemId: ${itemId}, columnId: ${columnId}`);
    }

    const field = columnValues[0];

    // Return complete column data
    const result = {
      id: field.id,
      text: field.text,        // Display/label value
      value: field.value,      // Raw value
      type: field.type         // Column type
    };

    console.log('[EmailController] ✓ Column value retrieved successfully');
    console.log('[EmailController] Column type:', result.type);
    console.log('[EmailController] Column text:', result.text);
    console.log('[EmailController] ==========================================');

    return result;
  } catch (err) {
    console.error('[EmailController] ❌ Error fetching column value:', err.message);
    throw new Error(`Error fetching column value: ${err.message}`);
  }
}
```

**Task:**
- [ ] Apri `controllers/emailController.js`
- [ ] Sostituisci `fetchEmailFromColumn` (linee 50-95) con `fetchColumnValue`
- [ ] Aggiorna tutti i riferimenti a `fetchEmailFromColumn` per usare `fetchColumnValue`
- [ ] Commit: "Refactor fetchEmailFromColumn to generic fetchColumnValue"

---

## 🔌 FASE 3: Aggiornare Email Controller

### File: `controllers/emailController.js`

**Cambio:** Aggiornare il metodo `sendEmail` per usare `fetchColumnValue` e gestire meglio i dati

**Current code (linee 206-209):**
```javascript
} else if (payload.itemId && payload.columnId) {
  // Metodo 2: Column ID approach (richiede GraphQL query)
  console.log('[EmailController] → Input Field not found, trying Column ID approach...');
  recipient_email = await fetchEmailFromColumn(payload.itemId, payload.columnId, token);
}
```

**New code (proposed):**
```javascript
} else if (payload.itemId && payload.columnId) {
  // Fallback Method: Column ID + GraphQL approach
  // If direct input field is not available, fetch the value from the selected column
  console.log('[EmailController] → Input Field not available, using Column ID + GraphQL fallback...');

  try {
    const columnData = await fetchColumnValue(payload.itemId, payload.columnId, token);

    // Use text (display value) if available, fallback to raw value
    recipient_email = columnData.text || columnData.value;

    console.log('[EmailController] ✓ Extracted email from column data');
    console.log('[EmailController] Column type:', columnData.type);

  } catch (columnError) {
    console.error('[EmailController] ❌ GraphQL fallback failed:', columnError.message);
    // Continue to validation - will fail with clear message
    recipient_email = null;
  }
}
```

**Task:**
- [ ] Apri `controllers/emailController.js`
- [ ] Sostituisci linee 206-209 con il nuovo codice
- [ ] Commit: "Update sendEmail to use new fetchColumnValue function"

---

## 📖 FASE 4: Aggiornare Documentazione

### File: `routes/email.js`

**Cambio:** Aggiungere documentazione esplicita su come configurare il recipe

**Current code (linee 49-93):**
```javascript
/**
 * POST /monday/sendEmail
 * Invia un'email usando SMTP di Aruba
 *
 * Body (application/json):
 * {
 *   "inboundFieldValues": {
 *     "someone": "recipient@example.com",
 *     ...
```

**New code (proposed):**
```javascript
/**
 * POST /monday/sendEmail
 * Send an email via Aruba SMTP
 *
 * ═══════════════════════════════════════════════════════════════════════
 * HOW TO CONFIGURE IN MONDAY.COM RECIPE BUILDER
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Step 1: Create Automation
 *   Trigger: Item Updated (or Custom Button)
 *   Action: Send Custom Request
 *
 * Step 2: Configure Custom Request
 *   URL: https://your-app.com/monday/sendEmail
 *   Method: POST
 *   Authorization: Bearer <JWT_TOKEN>
 *
 * Step 3: Add Custom Fields
 *   The recipe supports custom field selection using fetchFieldDefs
 *   Fields available to select:
 *   - selectedColumn: User picks a column (Monday will show column picker)
 *   - email: Email content (subject/body)
 *
 * Step 4: Recipe Body Structure
 *   When user selects a column in the UI, Monday will pass:
 *   {
 *     "inboundFieldValues": {
 *       "selectedColumn": { <selected column data> },
 *       "email": {
 *         "subject": "Email Subject",
 *         "body": "Email content"
 *       }
 *     },
 *     "itemId": {{item_id}},
 *     "columnId": "selected_column_id"
 *   }
 *
 * ═══════════════════════════════════════════════════════════════════════
 * DELIVERY METHODS
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Method 1: Direct Input Field (Preferred - Fast)
 * ─────────────────────────────────────────────
 * • Monday passes selected column value directly in inboundFieldValues
 * • No additional GraphQL query needed
 * • Single HTTP request
 * • Performance: FAST
 *
 * Method 2: Column ID + GraphQL Fallback (Smart - Reliable)
 * ──────────────────────────────────────────────────────────
 * • If Method 1 not available, uses itemId + columnId
 * • Queries Monday GraphQL API to fetch column data
 * • Returns text (display value) and value (raw data)
 * • Two HTTP requests (one slower)
 * • Performance: MEDIUM
 * • Advantage: Always works, supports all column types
 *
 * ═══════════════════════════════════════════════════════════════════════
 * PAYLOAD STRUCTURE & EXTRACTION
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Request body (application/json):
 * {
 *   // Method 1: Direct field input
 *   "inboundFieldValues": {
 *     "selectedColumn": "recipient@example.com",  ← Direct value
 *     "email": {
 *       "subject": "Email Subject",
 *       "body": "Email content"
 *     }
 *   },
 *   // Method 2: GraphQL parameters
 *   "itemId": 12345,
 *   "columnId": "email_column_id"
 * }
 *
 * ═══════════════════════════════════════════════════════════════════════
 * RESPONSES
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Success (200):
 * {
 *   "success": true,
 *   "message": "Email inviata con successo",
 *   "messageId": "...",
 *   "provider": "aruba_smtp",
 *   "from": "your_email@aruba.it",
 *   "to": "recipient@example.com",
 *   "timestamp": "2025-11-27T...",
 *   "duration_ms": 1234
 * }
 *
 * Error - Missing credentials (401):
 * {
 *   "success": false,
 *   "error": "Credenziali Aruba non trovate. Accedi con le tue credenziali.",
 *   "code": "NO_CREDENTIALS"
 * }
 *
 * Error - Invalid email (400):
 * {
 *   "success": false,
 *   "error": "Email destinatario non trovata...",
 *   "code": "INVALID_EMAIL"
 * }
 *
 * Error - SMTP failure (503):
 * {
 *   "success": false,
 *   "error": "Server SMTP non raggiungibile",
 *   "code": "SMTP_ERROR"
 * }
 *
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Header richiesto:
 * - Authorization: Bearer <JWT_TOKEN>
 *
 * Content-Type: application/json
 */
```

**Task:**
- [ ] Apri `routes/email.js` linea 49
- [ ] Sostituisci/amplia la documentazione con il nuovo testo
- [ ] Commit: "Add comprehensive documentation for recipe configuration"

---

## ✅ FASE 5: Testing e Validazione

### Passo 1: Test Unitario - fetchFieldDefs
```bash
# Test che l'endpoint ritorna field definitions corrette
curl -X POST http://localhost:3000/monday/fetchFieldDefs \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected response:
# {
#   "kind": "field_definitions",
#   "fields": [
#     { "id": "selectedColumn", "title": "Select a column", "type": "column" },
#     { "id": "email", "title": "Email content", "type": "paragraph" }
#   ]
# }
```

### Passo 2: Test Integrazione - Monday Recipe Setup
1. Apri Monday.com
2. Crea un'automazione personalizzata
3. Aggiungi azione "Send Custom Request"
4. Configura:
   - URL: `https://your-app.com/monday/sendEmail`
   - Method: POST
   - Headers: Authorization token
5. Nella ricetta, seleziona una colonna email
6. Trigger l'automazione

### Passo 3: Test Validazione - Payload Inspect
```bash
# Verifica cosa Monday invia
curl http://localhost:3000/debug/email-payloads

# Dovresti vedere il payload con columnId e selectedColumn
```

### Passo 4: Test E2E - Email Delivery
1. Trigger l'automazione da Monday
2. Verifica che l'email viene inviata
3. Controlla i log nel server:
   ```bash
   tail -f logs/email-payloads.json
   ```
4. Valida:
   - Email ricevuta dal destinatario
   - Payload contiene columnId
   - GraphQL query eseguita con successo
   - SMTP invio completato

### Passo 5: Test dei Casi Limite
- [ ] Selezionare una colonna email con etichetta
- [ ] Selezionare una colonna email senza etichetta
- [ ] Selezionare colonna email vuota (no value)
- [ ] Selezionare colonna email con formato non standard
- [ ] Trigger con item id non valido
- [ ] Trigger con column id non valido

**Task:**
- [ ] Eseguire tutti i test sopra
- [ ] Documentare risultati
- [ ] Commit: "Test and validate column selection feature"

---

## 📋 Checklist Finale

### Code Changes
- [ ] Fase 1: fetchFieldDefs aggiornato
- [ ] Fase 2: fetchColumnValue implementato
- [ ] Fase 3: sendEmail aggiornato
- [ ] Fase 4: Documentazione ampliata
- [ ] Fase 5: Test completati

### Documentation
- [ ] Commenti nel codice aggiornati
- [ ] README.md aggiornato (se necessario)
- [ ] Commenti su fetchFieldDefs
- [ ] Commenti su fetchColumnValue
- [ ] Commenti su sendEmail

### Testing
- [ ] Test unitario fetchFieldDefs
- [ ] Test integrazione con Monday recipe
- [ ] Test payload inspection
- [ ] Test E2E email delivery
- [ ] Test casi limite

### Commits
- [ ] Commit 1: Update fetchFieldDefs
- [ ] Commit 2: Refactor fetchColumnValue
- [ ] Commit 3: Update sendEmail
- [ ] Commit 4: Add documentation
- [ ] Commit 5: Test and validate

---

## 🎉 Conclusione

Una volta completati tutti i passi sopra:

1. ✅ L'app supporterà completamente il selettore di colonne in Monday
2. ✅ Gli utenti potranno selezionare qualsiasi colonna dal recipe builder
3. ✅ Il codice sarà allineato con le raccomandazioni di Angel
4. ✅ La documentazione sarà completa e chiara
5. ✅ Testing coverage sarà completo

**Tempo stimato totale: 3-4 ore di lavoro**

---

**Prossimo passo:** Inizia con Fase 1 - Aggiornare `routes/email.js` linee 32-46
