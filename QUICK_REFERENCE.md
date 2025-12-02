# Template Substitution - Quick Reference

## TL;DR

**Problem:** Variabili nel template email non venivano sostituite.

**Solution:** Aggiunta funzione `substituteTemplate()` che sostituisce `{{variabile}}` con valori reali.

---

## Come Funziona

```
Automazione Monday:
  Subject: "Ciao {{name}}"
  Body: "Email: {{email}}"
       ↓
[EmailController riceve payload con inboundFieldValues]
       ↓
[substituteTemplate() sostituisce i placeholder]
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

const result = substituteTemplate(
  "Ciao {{name}}, il tuo numero è {{phone}}",
  { name: "Mario", phone: "123-456" },
  true  // true = rimuovi placeholder sconosciuti
);
// Risultato: "Ciao Mario, il tuo numero è 123-456"
```

### Nel controller (già implementato)
```javascript
// Nel sendEmail() del emailController.js (linee ~399-400)
subject = substituteTemplate(subject, inboundFieldValues, true);
body = substituteTemplate(body, inboundFieldValues, true);
```

---

## Tipi di Colonna Supportati

✅ **Automaticamente supportate:**
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
✓ ALL TESTS PASSED (28/28)
```

---

## Comportamenti

| Situazione | Risultato |
|---|---|
| `{{name}}` + `{ name: "Mario" }` | `"Mario"` |
| `{{name}}` + `{ name: null }` | `""` (rimosso) |
| `{{unknown}}` + `removeUnknown=true` | `""` (rimosso) |
| `{{unknown}}` + `removeUnknown=false` | `"{{unknown}}"` (mantenuto) |
| `{{name}}` in `"Ciao {{name}}"` | `"Ciao Mario"` |
| `{{ name }}` (con spazi) | `"Mario"` (trimmed) |
| People `{ id: "1", name: "Mario" }` | `"Mario"` (automatico) |
| Status `{ label: "Active", index: 1 }` | `"Active"` (automatico) |

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
