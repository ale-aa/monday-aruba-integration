# Analisi Feedback Angel - Campo Personalizzato nella Ricetta

**Data:** 27 Novembre 2025
**Da:** Angel (Monday.com Support)
**Argomento:** Implementazione campo personalizzato per selezionare colonne

---

## 📋 Cosa Angel Suggerisce

Angel chiarisce che la tua app dovrebbe:

1. **Definire un campo personalizzato** nel recipe automation usando `fetchFieldDefs`
   - Questo mostra un selettore di colonne nel UI di Monday

2. **Ricevere l'ID della colonna** selezionata nel payload quando automation gira
   - L'ID viene passato via Run URL (payload)

3. **Usare GraphQL per recuperare** i valori da quella colonna
   - Query `column_values` con l'ID selezionato
   - Accesso a: `id`, `value`, `text`, `type`

---

## ✅ ANALISI DELLO STATO ATTUALE

Ho esaminato il tuo codice:

### 1. Endpoint fetchFieldDefs ESISTE ✓
**File:** `routes/email.js:32-46`

```javascript
router.post('/monday/fetchFieldDefs', verifyMonday, (req, res) => {
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

**Status:** ✅ IMPLEMENTATO
**Cosa fa:** Ritorna le definizioni dei campi personalizzati

**Problema:** ⚠️ LIMITAZIONE
- Accetta solo colonne di tipo `email`
- Non consente di selezionare altre colonne generiche (per future estensioni)

---

### 2. Logica GraphQL Query ESISTE ✓
**File:** `controllers/emailController.js:50-95`

```javascript
async function fetchEmailFromColumn(itemId, columnId, userToken) {
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
  // ... esegue query e ritorna email
}
```

**Status:** ✅ IMPLEMENTATO
**Cosa fa:** Recupera valori da una colonna specifica via GraphQL
**Limitazione:** Non usa frammenti GraphQL specifici per tipo di colonna

---

### 3. Handling Colonna Selezionata PARZIALMENTE ✓
**File:** `controllers/emailController.js:206-209`

```javascript
} else if (payload.itemId && payload.columnId) {
  // Metodo 2: Column ID approach
  recipient_email = await fetchEmailFromColumn(payload.itemId, payload.columnId, token);
}
```

**Status:** ✅ IMPLEMENTATO
**Cosa fa:** Se riceve `itemId` + `columnId`, usa GraphQL fallback
**Limitazione:** Non è esplicito nel recipe configuration

---

## 🔍 COSA MANCA O POTREBBE ESSERE MIGLIORATO

### Problema 1: Recipe Configuration Non Esplicita
**Attualmente:** L'app riceve `itemId` e `columnId` ma non è chiaro come Monday dovrebbe configurare il recipe per trasmetterli.

**Soluzione:** Aggiungere endpoint che definisce anche `itemId` come campo richiesto

### Problema 2: fetchFieldDefs Limitato
**Attualmente:** Accetta solo colonne di tipo `email`

**Soluzione:** Ampliare per supportare più tipi di colonna (per future estensioni)

### Problema 3: Manca Documentazione nel Codice
**Attualmente:** Non è chiaro nel recipe comment come Monday dovrebbe configurare la recipe

**Soluzione:** Aggiungere commenti espliciti su come configurare il recipe con il selettore di colonna

### Problema 4: GraphQL Query Generica
**Attualmente:** Query non specifica il tipo di colonna

**Soluzione:** Aggiungere frammenti GraphQL specifici per tipi di colonna (EmailValue, User, Status, etc.)

---

## 🚀 MODIFICHE PROPOSTE

### Modifica 1: Ampliare fetchFieldDefs per supportare SelectColumn
**File:** `routes/email.js:32-46`

**Cambio:** Aggiungere supporto per campo colonna generico + itemId

```javascript
router.post('/monday/fetchFieldDefs', verifyMonday, (req, res) => {
  console.log('[FieldDefs] Request body:', JSON.stringify(req.body, null, 2));

  res.status(200).json({
    kind: 'field_definitions',
    fields: [
      {
        id: 'selectedColumn',
        title: 'Select a column',
        type: 'column',
        required: true
      },
      {
        id: 'email',
        title: 'Email (Subject/Body)',
        type: 'paragraph',
        required: true
      }
    ]
  });
});
```

**Vantaggi:**
- ✓ Permette all'utente di selezionare qualsiasi colonna (non solo email)
- ✓ Più flessibile per future estensioni
- ✓ Allinea con la documentazione Angel

---

### Modifica 2: Aggiornare emailController per Colonne Generiche
**File:** `controllers/emailController.js:50-95`

**Cambio:** Rendere la query GraphQL più robusta e generica

```javascript
// Helper per recuperare il valore di una colonna da Monday API tramite GraphQL
async function fetchColumnValue(itemId, columnId, userToken) {
  try {
    console.log('[EmailController] ========== FETCHING COLUMN VALUE ==========');
    console.log('[EmailController] itemId:', itemId);
    console.log('[EmailController] columnId:', columnId);

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

    const response = await axios.post('https://api.monday.com/graphql',
      { query },
      {
        headers: {
          'Authorization': userToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const columnValues = response.data?.data?.items?.[0]?.column_values;
    if (!columnValues || columnValues.length === 0) {
      throw new Error(`Column not found for itemId: ${itemId}, columnId: ${columnId}`);
    }

    const field = columnValues[0];

    // Ritorna sia text che value per flessibilità
    return {
      id: field.id,
      text: field.text,        // Label/display value
      value: field.value,      // Raw value
      type: field.type         // Column type
    };
  } catch (err) {
    console.error('[EmailController] ❌ Error fetching column value:', err.message);
    throw new Error(`Error fetching column value: ${err.message}`);
  }
}
```

**Vantaggi:**
- ✓ Più generico (non solo email)
- ✓ Ritorna anche il tipo di colonna
- ✓ Usa array `[columnId]` corretto come da documentazione Angel

---

### Modifica 3: Commentare Chiaramente Come Configurare il Recipe
**File:** `routes/email.js:49-94`

**Cambio:** Aggiungere commenti espliciti su come Monday dovrebbe configurare il recipe

```javascript
/**
 * POST /monday/sendEmail
 * Invia un'email usando SMTP di Aruba
 *
 * Configurazione Recipe Monday (come deve essere impostato):
 * ─────────────────────────────────────────────────────────
 * Trigger: Item Updated (o Custom Button)
 *
 * Action: Send Custom Request
 *   ├─ URL: https://your-app.com/monday/sendEmail
 *   ├─ Method: POST
 *   └─ Body:
 *       {
 *         "inboundFieldValues": {
 *           "selectedColumn": {SELECTED_COLUMN},  ← User selects column
 *           "email": {
 *             "subject": "Email Subject",
 *             "body": "Email body"
 *           }
 *         },
 *         "itemId": {{item_id}},                  ← Passed automatically
 *         "columnId": {{selectedColumn}}          ← From field selector
 *       }
 *
 * Per usare il selettore di colonne in Monday:
 * • Nella recipe, aggiungi campo: {selectedColumn, column}
 * • Monday mostrerà selettore di colonne all'utente
 * • Il columnId viene passato nel payload
 *
 * Header richiesto:
 * - Authorization: Bearer <JWT_TOKEN>
 *
 * Metodo 1 (Preferred): Input Field diretto
 * - Monday trasmette il valore selezionato nel campo input
 * - No query GraphQL aggiuntiva
 * - Performance: Veloce (1 request HTTP)
 *
 * Metodo 2 (Fallback): Column ID + GraphQL
 * - Se Input Field non disponibile, usa columnId + itemId
 * - Query GraphQL per recuperare il valore effettivo
 * - Performance: Più lentezza (2 requests HTTP)
 */
```

---

## 📊 CONFRONTO: STATO ATTUALE vs PROPOSTO

| Aspetto | Attuale | Proposto |
|---------|---------|----------|
| **fetchFieldDefs** | ✓ Esiste | ✓ Ampliato |
| **Supporto colonne** | Solo email | Generico |
| **GraphQL query** | ✓ Generico | ✓ Migliorato (ritorna type) |
| **Documentazione** | Minima | ✓ Esplicita |
| **Recipe config** | Non chiara | ✓ Documentata |
| **Fallback logic** | ✓ Esiste | ✓ Migliore |

---

## 🔧 IMPLEMENTAZIONE PROPOSTA

### Paso 1: Aggiornare fetchFieldDefs
**File:** `routes/email.js`

Permettere selezione di colonne generiche:

```javascript
router.post('/monday/fetchFieldDefs', verifyMonday, (req, res) => {
  console.log('[FieldDefs] Request body:', JSON.stringify(req.body, null, 2));

  res.status(200).json({
    kind: 'field_definitions',
    fields: [
      {
        id: 'selectedColumn',
        title: 'Select column to use',
        type: 'column',
        required: true
      },
      {
        id: 'email',
        title: 'Email details',
        type: 'paragraph',
        required: true
      }
    ]
  });
});
```

### Paso 2: Aggiornare fetchColumnValue
**File:** `controllers/emailController.js`

Rinominare da `fetchEmailFromColumn` a `fetchColumnValue` per generalità:

- Ritorna oggetto con {text, value, type}
- Supporta tutti i tipi di colonna
- Query GraphQL corretta con array

### Paso 3: Aggiornare sendEmail
**File:** `controllers/emailController.js`

Usare `fetchColumnValue` al posto di `fetchEmailFromColumn`:

```javascript
// Nel sendEmail controller
if (payload.itemId && payload.columnId) {
  const columnData = await fetchColumnValue(payload.itemId, payload.columnId, token);
  recipient_email = columnData.text || columnData.value;
}
```

### Paso 4: Aggiornare Documentazione
**File:** `routes/email.js`

Aggiungere commenti espliciti su come configurare il recipe in Monday:

```javascript
/**
 * Come configurare il recipe in Monday.com:
 *
 * 1. In Recipe Builder, aggiungi campo: {column, selectedColumn}
 * 2. Monday mostrerà un selettore di colonne all'utente
 * 3. L'ID della colonna selezionata viene passato nel payload
 * 4. Il tuo backend lo riceve in inboundFieldValues.selectedColumn
 * 5. Usa GraphQL per recuperare il valore di quella colonna
 */
```

---

## ✨ VANTAGGI DELLE MODIFICHE

| Beneficio | Dettaglio |
|-----------|----------|
| **Allineamento con Angel** | Segue esattamente le sue raccomandazioni |
| **Flessibilità** | Supporta qualsiasi tipo di colonna, non solo email |
| **Clarity** | Documentazione esplicita su come configurare |
| **Future-proof** | Facile estendere per altre colonne (Nome, Status, etc.) |
| **Best practices** | Usa frammenti GraphQL corretti |
| **User experience** | UI selettore di colonne in Monday |

---

## 🎯 IMPLEMENTAZIONE - PASSO DOPO PASSO

### Step 1: Testare implementazione attuale
```bash
# Verificare che fetchFieldDefs funziona
curl -X POST http://localhost:3000/monday/fetchFieldDefs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### Step 2: Creare Monday recipe di test
- Aggiungi campo: `{selectedColumn, column}`
- Monday mostrerà selettore
- Seleziona una colonna email
- Trigger automation

### Step 3: Verificare payload ricevuto
```bash
# Controlla cosa Monday invia
curl http://localhost:3000/debug/email-payloads
```

### Step 4: Aggiornare codice (se necessario)
- Implementare Modifica 1-4 proposte sopra
- Testare con GraphQL query
- Validare risultati

### Step 5: Testing end-to-end
- Recipe completa con selettore colonna
- Trigger automation
- Verifica email ricevuta
- Monitora logs

---

## 📝 RISPOSTA DA DARE AD ANGEL

Una volta implementate le modifiche, puoi rispondere:

```
Grazie Angel per i chiarimenti!

Abbiamo implementato quanto suggerisci:

1. ✓ Endpoint fetchFieldDefs che definisce campo personalizzato
   └─ Permette all'utente di selezionare una colonna nel recipe

2. ✓ Ricezione dell'ID colonna nel payload della automation
   └─ Monday trasmette columnId quando automation gira

3. ✓ Query GraphQL per recuperare i valori della colonna
   └─ Usiamo column_values con accesso a text/value/type

4. ✓ Supporto generico per qualsiasi tipo di colonna
   └─ Non limitato a sole colonne email

L'implementazione segue esattamente il flusso che hai documentato:
- Recipe Builder con selettore colonne
- Payload con columnId
- GraphQL query per recuperare dati
- Gestione errori API

Rimaniamo disponibili se riscontriamo errori specifici dall'API monday.com.
```

---

## 🔍 SUMMARY

### Stato Attuale: ✅ BUONO
- ✓ fetchFieldDefs esiste
- ✓ GraphQL query implementata
- ✓ Fallback logic presente

### Stato Proposto: ✨ OTTIMALE
- ✓ fetchFieldDefs ampliato (colonne generiche)
- ✓ GraphQL migliorato (supporto type)
- ✓ Documentazione esplicita
- ✓ Allineato con Angel

### Timeline: ~2-3 ore
- 30 min: Analisi e progettazione ✓
- 1 ora: Implementazione modifiche
- 1 ora: Testing e validazione
- 30 min: Documentazione finale

---

**Conclusione:** L'app **già implementa la maggior parte** di quello che Angel suggerisce. Con le modifiche proposte sopra, sarà completamente allineata con le best practices Monday.com e la documentazione Angel.
