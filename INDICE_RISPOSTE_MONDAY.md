# Indice - Risposte Tecniche per Monday.com

**Data di creazione:** 27 Novembre 2025
**Argomento:** Email Column - Metodi di estrazione email da colonne Monday.com

---

## Documenti Preparati

Abbiamo preparato **4 documenti** di diversa lunghezza e dettaglio, a seconda della tua necessità:

### 1. 📄 **RISPOSTA_CHAT_MONDAY.txt** (⏱️ 5 min read)
**Per:** Risposta veloce da inviare via chat/email
**Contenuto:**
- Breve spiegazione dei 2 metodi (Input Field + GraphQL)
- La domanda critica di chiarimento (A/B/C/D options)
- Status implementazione
- Link ai documenti dettagliati

**Quando usare:** Se il tecnico Monday ti risponde in chat e vuoi una risposta concisa ma completa

**File:** `/RISPOSTA_CHAT_MONDAY.txt`

---

### 2. 📋 **RISPOSTA_BREVE_MONDAY.md** (⏱️ 10 min read)
**Per:** Email formale/ticket di supporto
**Contenuto:**
- Grazie per le linee guida
- 2 metodi implementati (Input Field primario, GraphQL fallback)
- Domanda di chiarimento con opzioni (A/B/C/D)
- Come verifichiamo noi (endpoint debug)
- Status implementazione tabella
- Prossimi passi

**Quando usare:** Per risposta via email al supporto Monday

**File:** `/RISPOSTA_BREVE_MONDAY.md`

---

### 3. 📊 **DIAGRAMMA_FLUSSO_EMAIL.md** (⏱️ 15 min read)
**Per:** Approfondimento tecnico con diagrammi
**Contenuto:**
- Flowchart dei 2 metodi di estrazione
- Visualizzazione payload Monday
- Codice di parsing del nostro backend
- Query GraphQL completa
- Decision tree di selezione
- Tabella comparativa metodi
- Flowchart completo dall'inizio alla fine
- Punti di logging per debugging

**Quando usare:** Se il tecnico Monday vuole capire nel dettaglio il nostro flusso tecnico

**File:** `/DIAGRAMMA_FLUSSO_EMAIL.md`

---

### 4. 📘 **RISPOSTA_TECNICO_MONDAY.md** (⏱️ 25 min read)
**Per:** Analisi completa e discussione tecnica approfondita
**Contenuto:**
- Analisi dettagliata della nostra implementazione
- Codice referenziato con linee esatte
- Spiegazione Approccio A (Input Field)
- Spiegazione Approccio B (Column ID + GraphQL)
- Chiarimento tecnico su email column con etichette
- Domanda specifica (3 scenari + opzione custom)
- Processo di debug attuale
- Percorso di implementazione proposto
- Richiesta di chiarimento (cosa riceviamo dal payload)
- Suggerimento di test passo per passo
- Conclusione e prossimi passi

**Quando usare:** Per discussione tecnica approfondita con il team Monday

**File:** `/RISPOSTA_TECNICO_MONDAY.md`

---

## Quale Documento Inviare?

### 🎯 **Scenario 1: Risposta in chat/email breve**
```
Invia: RISPOSTA_CHAT_MONDAY.txt
```

### 🎯 **Scenario 2: Ticket di supporto formale**
```
Invia: RISPOSTA_BREVE_MONDAY.md
```

### 🎯 **Scenario 3: Discussione tecnica approfondita**
```
Invia in ordine:
1. RISPOSTA_BREVE_MONDAY.md (overview)
2. DIAGRAMMA_FLUSSO_EMAIL.md (visuals)
3. RISPOSTA_TECNICO_MONDAY.md (details)
```

### 🎯 **Scenario 4: Allegati per email formale**
```
Email body: RISPOSTA_BREVE_MONDAY.md
Allegati:
  - DIAGRAMMA_FLUSSO_EMAIL.md
  - RISPOSTA_TECNICO_MONDAY.md
```

---

## La Domanda Critica

Tutti i documenti chiedono la **stessa domanda** in forma leggermente diversa:

### ❓ Il Cuore della Questione

**Quando una email column viene trasmessa via Input Field nel payload della Monday automation:**

```
Cosa riceve il nostro backend nel campo inboundFieldValues.recipientEmail?

A) Solo l'email: "alice@company.com"
B) Solo l'etichetta: "Work email"
C) Un oggetto: { label: "Work email", email: "alice@company.com" }
D) Formato diverso (specificare quale)
```

---

## Status Implementazione

| Componente | Status | Note |
|-----------|--------|------|
| **Input Field Extraction** | ✅ Completo | Codice: emailController.js:164-201 |
| **GraphQL Query** | ✅ Completo | Codice: emailController.js:50-95 |
| **Parsing Flessibile** | ✅ Completo | Gestisce string/object/fallback |
| **Validazione Email** | ✅ Completo | Check "@" nel valore finale |
| **Logging Debug** | ✅ Completo | Endpoint: GET /debug/email-payloads |
| **SMTP Aruba** | ✅ Completo | Via emailService.js |
| **Supporto Etichette** | ⏳ In attesa | Richiede chiarimento Monday |

---

## Prossimi Passi Dopo Risposta Monday

Una volta che ricevete la risposta alla domanda A/B/C/D, procederete con:

1. **Aggiornamento Parsing (se necessario)**
   - Modificare emailController.js basato sul formato reale

2. **Test di Integrazione**
   - Creare una Monday recipe di test
   - Verificare il payload effettivo
   - Validare il parsing

3. **Documentazione Finale**
   - Aggiornare README.md con il metodo validato
   - Aggiungere esempi di payload reali
   - Creare guida setup Monday per il cliente

4. **Deployment**
   - Confermare che tutto funziona in produzione
   - Monitorare email-payloads via endpoint debug

---

## Codice di Riferimento

### File Principali

| File | Linee | Descrizione |
|------|-------|-------------|
| `controllers/emailController.js` | 164-201 | Estrazione recipientEmail |
| `controllers/emailController.js` | 50-95 | GraphQL query fallback |
| `controllers/emailController.js` | 206-209 | Trigger GraphQL se necessario |
| `controllers/emailController.js` | 231-238 | Validazione email finale |
| `services/emailService.js` | 21-109 | Invio SMTP Aruba |
| `routes/email.js` | 32-94 | Endpoint API |

### Endpoint Debug

```bash
# Visualizza payload ricevuti da Monday (ultimi 10)
GET /debug/email-payloads

# Response:
{
  "count": 3,
  "payloads": [
    {
      "timestamp": "2025-11-27T...",
      "userId": "user_123",
      "payload": {
        "inboundFieldValues": {
          "recipientEmail": ??? ← QUESTO è quello che vogliamo capire
        }
      }
    },
    ...
  ]
}
```

---

## Contatti & Follow-up

Dopo aver inviato la tua risposta alla domanda A/B/C/D:

1. Verificheremo il payload effettivo via endpoint debug
2. Aggiorneremo il parsing se necessario
3. Faremo test completo end-to-end
4. Confermeremo che tutto funziona

**Timeline stimato:** 1-2 giorni di work per completare validazione e test

---

## Note Importanti

### ✅ Cosa abbiamo già implementato
- Entrambi i metodi (Input Field + GraphQL)
- Parsing flessibile per stringhe, oggetti, fallback
- Logging completo per debugging
- Validazione email
- SMTP Aruba funzionante

### ⏳ Cosa stiamo aspettando
- Chiarimento da Monday su quale valore viene trasmesso nel Input Field
- Una volta confermato, faremo testing finale

### 🚀 Timeline
- Analisi completata: ✅ 27 Nov 2025
- In attesa risposta Monday: ⏳
- Testing: ~1-2 giorni dopo risposta
- Deployment: ~3-4 giorni totali

---

## Come Usare Questi Documenti

### 1️⃣ **Leggi questo file** (`INDICE_RISPOSTE_MONDAY.md`)
   → Comprendi quale documento mandare

### 2️⃣ **Scegli il documento appropriato**
   → In base allo scenario di comunicazione

### 3️⃣ **Invia la risposta a Monday**
   → Aspetta chiarimento sulla domanda A/B/C/D

### 4️⃣ **Usa endpoint debug** (`GET /debug/email-payloads`)
   → Verifica il payload effettivo ricevuto

### 5️⃣ **Aggiorna parsing se necessario**
   → Basato sulla risposta Monday

### 6️⃣ **Fai testing completo**
   → Valida end-to-end

---

## Checklist di Comunicazione

- [ ] Scegli il documento da inviare
- [ ] Personalizza con dettagli vostri se necessario
- [ ] Invia a supporto Monday
- [ ] Aspetta risposta alla domanda A/B/C/D
- [ ] Una volta ricevuta:
  - [ ] Verifica payload via `/debug/email-payloads`
  - [ ] Aggiorna parsing se necessario
  - [ ] Fai testing con Monday recipe reale
  - [ ] Conferma success con Monday
- [ ] Aggiorna documentazione finale
- [ ] Deploya in produzione

---

**Documento preparato:** 27 Novembre 2025
**Versione:** 1.0
**Status:** Pronto per l'invio a Monday.com

---

*Tutti i documenti sono preparati e pronti per essere inviati al supporto tecnico Monday.com. Scegli quello più appropriato per il tuo canale di comunicazione.*
