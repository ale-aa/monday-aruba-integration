# Template Substitution - Quick Reference

## TL;DR

**Problem:** Variabili nel template email non venivano sostituite (ricevevi letteralmente `{{name}}` o `{pulse.name}`).

**Solution:** Aggiunta funzione `substituteTemplate()` che supporta **entrambe le sintassi**:
- `{{variabile}}` - Sintassi custom
- `{pulse.columnId}` - Sintassi Monday.com

---

## Come Funziona

```
Automazione Monday con una di queste sintassi:
  Subject: "Ciao {{name}}"           OPPURE  "Ciao {pulse.name}"
  Body: "Email: {{email}}"                   "Email: {pulse.email_mkxja1xz}"
       ↓
[EmailController riceve payload con inboundFieldValues]
       ↓
[substituteTemplate() sostituisce ENTRAMBE le sintassi]
       ↓
Email inviata:
  Subject: "Ciao Mario Rossi"
  Body: "Email: [email protected]"
```

---

## File Modificati/Aggiunti

| File | Tipo | Descrizione |
|---|---|---|
| `utils/templateSubstitution.js` | ✨ Nuovo | Funzione core di sostituzione |
| `utils/templateSubstitution.test.js` | ✨ Nuovo | 28 test (tutti passati) |
| `controllers/emailController.js` | 🔧 Modificato | Aggiunto import + chiamata funzione |
| `TEMPLATE_SUBSTITUTION.md` | 📖 Nuovo | Documentazione tecnica completa |
| `USAGE_EXAMPLE.md` | 📖 Nuovo | Esempi di utilizzo reali |

---

## Utilizzo Rapido

### Nella tua applicazione
```javascript
const { substituteTemplate } = require('./utils/templateSubstitution');

// Sintassi 1: {{variabile}}
const result1 = substituteTemplate(
  "Ciao {{name}}, il tuo numero è {{phone}}",
  { name: "Mario", phone: "123-456" },
  true  // true = rimuovi placeholder sconosciuti
);
// Risultato: "Ciao Mario, il tuo numero è 123-456"

// Sintassi 2: {pulse.columnId}
const result2 = substituteTemplate(
  "Ciao {pulse.name}, il tuo numero è {pulse.phone_mkxja1xz}",
  { name: "Mario", phone_mkxja1xz: "123-456" }
);
// Risultato: "Ciao Mario, il tuo numero è 123-456"

// Sintassi mista: puoi usarle insieme!
const result3 = substituteTemplate(
  "Ciao {{name}}, il tuo ID è {pulse.customer_id}",
  { name: "Mario", customer_id: "CUS-12345" }
);
// Risultato: "Ciao Mario, il tuo ID è CUS-12345"
```

### Nel controller (già implementato)
```javascript
// Nel sendEmail() del emailController.js (linee ~399-400)
subject = substituteTemplate(subject, inboundFieldValues, true);
body = substituteTemplate(body, inboundFieldValues, true);
```

---

## Sintassi Supportate

| Sintassi | Esempio | Risultato |
|---|---|---|
| **Template custom** | `{{name}}` | Sostituito con `name` |
| **Monday.com API** | `{pulse.name}` | Sostituito con `name` |
| **Monday col ID** | `{pulse.email_mkxja1xz}` | Sostituito con `email_mkxja1xz` |
| **Mista** | `{{name}} - {pulse.id}` | Entrambi sostituiti |

## Tipi di Colonna Supportati

✅ **Automaticamente supportate con entrambe le sintassi:**
- Text, Email, Number
- Date, Time, Datetime
- Boolean/Checkbox
- People (estrae `name`)
- Status/Dropdown (estrae `label`)
- Numero, Timeline, Progress
- File, Link, Mirror
- Custom Field Types

---

## Test

```bash
# Esegui i test
node utils/templateSubstitution.test.js

# Output atteso
✓ ALL TESTS PASSED (32/32)
```

---

## Comportamenti

| Situazione | Risultato |
|---|---|
| `{{name}}` + `{ name: "Mario" }` | `"Mario"` |
| `{pulse.name}` + `{ name: "Mario" }` | `"Mario"` |
| `{{name}}` + `{ name: null }` | `""` (rimosso) |
| `{{unknown}}` + `removeUnknown=true` | `""` (rimosso) |
| `{{unknown}}` + `removeUnknown=false` | `"{{unknown}}"` (mantenuto) |
| `{pulse.email_mkxja1xz}` + `{ email_mkxja1xz: "test@" }` | `"test@"` |
| `{{name}}` in `"Ciao {{name}}"` | `"Ciao Mario"` |
| `{{ name }}` (con spazi) | `"Mario"` (trimmed) |
| People `{ id: "1", name: "Mario" }` | `"Mario"` (automatico) |
| Status `{ label: "Active", index: 1 }` | `"Active"` (automatico) |
| Mista `{{x}} {pulse.y}` | Entrambi sostituiti |

---

## Logging

Nel console vedrai (dopo il commit):
```
[EmailController] ========== TEMPLATE SUBSTITUTION ==========
[EmailController] Available variables in inboundFieldValues: ...
[EmailController] Subject (before substitution): Ciao {{name}}
[EmailController] Subject (after substitution): Ciao Mario Rossi
[EmailController] ==========================================
```

---

## Integrazione Completa

✅ Funzione core
✅ Integrazione nel controller
✅ 28/28 test passati
✅ Documentazione completa
✅ Esempi reali
✅ Logging per debugging
✅ Edge case handling

---

## Prossimi Step (Opzionali)

- [ ] Unit test nel CI/CD
- [ ] Monitoring/analytics delle sostituzioni
- [ ] Advanced template syntax (filtering, formatting)
- [ ] Template library/templates predefinite

---

## Contatti per Problemi

Se una variabile non viene sostituita:
1. Controlla che il nome in `{{name}}` esista in `inboundFieldValues`
2. Controlla che il nome sia **case-sensitive**
3. Guarda il log nel console per la lista delle variabili disponibili

Esempio log di debug:
```
[EmailController] Available variables: recipientEmail, email, name, phone, ...
```
