# Esempi di Utilizzo - Template Substitution

## Scenario 1: Email di Conferma Registrazione

### In Monday.com

Automation Recipe:
```
When: Button is clicked → "Invia Email"

Input Fields:
- Recipient Email: [Colonna Email]
- Email Subject: "Ciao {{name}}, grazie per la registrazione!"
- Email Body: "Gentile {{name}},

La tua registrazione è stata completata.
Email: {{email}}
Data registrazione: {{registration_date}}
Numero ID: {{customer_id}}

Grazie,
Il team"
```

### Payload ricevuto dal backend:
```json
{
  "inboundFieldValues": {
    "recipientEmail": "[email protected]",
    "email": {
      "subject": "Ciao {{name}}, grazie per la registrazione!",
      "body": "Gentile {{name}},\n\nLa tua registrazione è stata completata.\nEmail: {{email}}\nData registrazione: {{registration_date}}\nNumero ID: {{customer_id}}\n\nGrazie,\nIl team"
    },
    "name": "Mario Rossi",
    "email": "[email protected]",
    "registration_date": "2025-12-02",
    "customer_id": "CUS-12345"
  }
}
```

### Email inviata:
```
Subject: Ciao Mario Rossi, grazie per la registrazione!

Body:
Gentile Mario Rossi,

La tua registrazione è stata completata.
Email: [email protected]
Data registrazione: 2025-12-02
Numero ID: CUS-12345

Grazie,
Il team
```

---

## Scenario 2: Email di Conferma Evento con Status

### In Monday.com

Automation Recipe:
```
When: Button is clicked → "Invia Conferma Evento"

Input Fields:
- Recipient Email: [Email Column]
- Email Subject: "{{name}}, evento {{event_name}} confermato!"
- Email Body: "Caro {{name}},

Il tuo evento è confermato:

Nome evento: {{event_name}}
Data: {{event_date}}
Ora: {{event_time}}
Luogo: {{location}}
Responsabile: {{organizer_name}}
Status: {{event_status}}

A presto!
Il team"
```

### Payload ricevuto:
```json
{
  "inboundFieldValues": {
    "recipientEmail": "[email protected]",
    "email": {
      "subject": "{{name}}, evento {{event_name}} confermato!",
      "body": "Caro {{name}},\n\nIl tuo evento è confermato:..."
    },
    "name": "Giulia Bianchi",
    "email": "[email protected]",
    "event_name": "Conferenza Cloud",
    "event_date": "2025-12-15",
    "event_time": "10:30",
    "location": "Milano, Italia",
    "organizer_name": {
      "id": "person_123",
      "name": "Marco Verdi"
    },
    "event_status": {
      "label": "Confermato",
      "index": 2
    }
  }
}
```

### Email inviata:
```
Subject: Giulia Bianchi, evento Conferenza Cloud confermato!

Body:
Caro Giulia Bianchi,

Il tuo evento è confermato:

Nome evento: Conferenza Cloud
Data: 2025-12-15
Ora: 10:30
Luogo: Milano, Italia
Responsabile: Marco Verdi
Status: Confermato
```

**Nota:** La colonna "organizer_name" è di tipo "People" (struttura `{ id, name }`). La funzione estrae automaticamente il campo `name`.

---

## Scenario 3: Email con Variabili Complesse (Oggetti)

### In Monday.com

Colonne:
- `assigned_to`: Tipo "People" → `{ id, name, email, ... }`
- `priority`: Tipo "Status" → `{ label, index, ... }`
- `is_urgent`: Tipo "Checkbox" → `{ checked: boolean }`
- `tags`: Tipo "Dropdown" → `{ label, ... }`

### Template:
```
Subject: Task {{task_name}} assegnato a {{assigned_to}}

Body: Caro {{assigned_to}},

La seguente task è stata assegnata:

Nome: {{task_name}}
Priorità: {{priority}}
Urgente: {{is_urgent}}
Tag: {{tags}}

Clicca per visualizzare i dettagli.

Grazie!
```

### Conversione automatica:
| Variabile | Valore Originale | Convertito |
|---|---|---|
| `{{assigned_to}}` | `{ id: "p1", name: "Alice" }` | `"Alice"` |
| `{{priority}}` | `{ label: "Alta", index: 1 }` | `"Alta"` |
| `{{is_urgent}}` | `{ checked: true }` | `"Sì"` |
| `{{tags}}` | `{ label: "Feature" }` | `"Feature"` |

### Email inviata:
```
Subject: Task Bugfix authentication assegnato a Alice

Body: Caro Alice,

La seguente task è stata assegnata:

Nome: Bugfix authentication
Priorità: Alta
Urgente: Sì
Tag: Feature

Clicca per visualizzare i dettagli.

Grazie!
```

---

## Scenario 4: Variabili Mancanti

### Template:
```
Subject: {{name}}, conferma per {{event_date}}

Body: Ciao {{name}},

Event: {{event_name}}
Luogo: {{location}}
```

### Payload (manca `event_name` e `location`):
```json
{
  "inboundFieldValues": {
    "name": "Mario",
    "event_date": "2025-12-15"
  }
}
```

### Email inviata (con `removeUnknown = true`):
```
Subject: Mario, conferma per 2025-12-15

Body: Ciao Mario,

Event:
Luogo:
```

Se preferisci tenere i placeholder: modifica il controller e usa `substituteTemplate(..., false)` invece di `substituteTemplate(..., true)`.

---

## Scenario 5: Template Senza Variabili

### Template:
```
Subject: Informativa importante

Body: Gentile cliente,

Vi informiamo che il nostro servizio è in manutenzione il 10/12/2025.

Grazie della pazienza.
```

### Risultato:
Nessuna sostituzione. L'email viene inviata così com'è.

---

## Come Testare Localmente

### 1. Importa la funzione
```javascript
const { substituteTemplate } = require('./utils/templateSubstitution');
```

### 2. Usa la funzione
```javascript
const template = "Ciao {{name}}, il tuo numero è {{phone}}";
const fields = {
  name: "Mario Rossi",
  phone: "+39 123 456 7890"
};

const result = substituteTemplate(template, fields, true);
console.log(result);
// Output: "Ciao Mario Rossi, il tuo numero è +39 123 456 7890"
```

### 3. Esegui i test
```bash
node utils/templateSubstitution.test.js
```

---

## Comportamenti Particolari

### Placeholder con spazi
```javascript
substituteTemplate("Ciao {{ name }}", { name: "Mario" })
// Output: "Ciao Mario" ✓
```

### Placeholder ripetuto
```javascript
substituteTemplate("{{name}} ama {{name}}", { name: "Mario" })
// Output: "Mario ama Mario" ✓
```

### Valori numerici
```javascript
substituteTemplate("ID: {{id}}", { id: 12345 })
// Output: "ID: 12345" ✓
```

### Valori booleani
```javascript
substituteTemplate("Attivo: {{is_active}}", { is_active: true })
// Output: "Attivo: Sì" ✓
```

### Valori null/undefined
```javascript
substituteTemplate("Nome: {{name}}", { name: null }, true)
// Output: "Nome: " (placeholder rimosso) ✓

substituteTemplate("Nome: {{name}}", { name: null }, false)
// Output: "Nome: {{name}}" (placeholder mantenuto) ✓
```

---

## Note Implementative

1. **Le variabili nel template devono corrispondere esattamente alle chiavi in `inboundFieldValues`**
   - ❌ Template ha `{{userName}}` ma inboundFieldValues ha `name`
   - ✅ Template ha `{{name}}` e inboundFieldValues ha `name`

2. **Non c'è limite al numero di variabili** nel template

3. **La sostituzione è case-sensitive**
   - `{{name}}` ≠ `{{Name}}` ≠ `{{NAME}}`

4. **Non è supportata la nidificazione**
   - ❌ `{{{{name}}}}`
   - ✅ `{{name}}`

5. **Performance**: La funzione è ottimizzata per template di qualsiasi lunghezza

---

## Debugging

Se una variabile non viene sostituita, controlla il log:

```
[EmailController] ========== TEMPLATE SUBSTITUTION ==========
[EmailController] Available variables in inboundFieldValues: recipientEmail,email,name,phone,...
```

Verifica che il nome della variabile nel template corrisponda esattamente a uno dei nomi disponibili.

Se vedi una variabile mancante (es: `location` non è nella lista), aggiungila al form di automazione Monday.
