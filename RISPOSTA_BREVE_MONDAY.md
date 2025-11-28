# Risposta Breve - Domanda Tecnica Supporto Monday.com

---

## Grazie per le linee guida sulla Email Column

Abbiamo analizzato la tua documentazione sui metodi di estrazione email e validato la nostra implementazione.

## Il Nostro Approccio Attuale

**Usiamo due metodi integrati:**

### 1️⃣ Input Field Method (Primario - Consigliato)
La recipe Monday trasmette un campo `recipientEmail` come Input Field collegato alla colonna email della board. Noi lo riceviamo direttamente nel payload.

**Codice:** `controllers/emailController.js:164-201`

Vantaggi:
- ✅ 1 sola richiesta HTTP
- ✅ No GraphQL query
- ✅ Funziona con etichette di colonna in Monday
- ✅ Performance migliore

### 2️⃣ Column ID + GraphQL Method (Fallback)
Se l'Input Field non è disponibile, usiamo `itemId` + `columnId` per queryare la Monday API via GraphQL e ottenere il valore della colonna email.

**Codice:** `controllers/emailController.js:50-95`

Vantaggi:
- ✅ Accesso ai campi raw della colonna (`text`, `value`, `email`, `label`)
- ✅ Supporta ricerche avanzate se necessario

---

## La Nostra Domanda per Te

Per assicurarci di implementare correttamente il supporto alle email columns con etichette (come descritto nella tua documentazione), abbiamo **una sola domanda critica**:

### ❓ Quando una email column viene trasmessa via Input Field in una Monday automation:

Quale dei seguenti valori riceviamo nel nostro payload `inboundFieldValues.recipientEmail`?

**Scenario:** La colonna email in Monday ha un item con:
- Etichetta: "Work email"
- Email sottostante: "alice@company.com"

**Cosa riceve il nostro endpoint?**

```
A) La sola stringa email:
   { recipientEmail: "alice@company.com" }

B) La sola stringa etichetta:
   { recipientEmail: "Work email" }

C) Un oggetto con entrambi:
   { recipientEmail: { label: "Work email", email: "alice@company.com" } }

D) Altro (specifica il formato)
```

---

## Come Verifichiamo Noi

Abbiamo implementato un endpoint di debug:

```bash
GET /debug/email-payloads
```

Questo mostra esattamente cosa Monday invia al nostro backend. Una volta che rispondi alla domanda sopra, creeremo un test per validare che il nostro parsing è corretto per il tuo scenario.

---

## Stato Implementazione

| Aspetto | Status | Note |
|---------|--------|------|
| Input Field extraction | ✅ Implementato | Pronto per stringhe e oggetti |
| GraphQL Email query | ✅ Implementato | Fallback completo |
| Parsing etichette | ✅ Ready | In attesa di conferma del formato |
| Logging/Debug | ✅ Implementato | Endpoint debug disponibile |
| Invio SMTP Aruba | ✅ Implementato | Completamente funzionante |

---

## Prossimi Passi

Una volta che rispondi al nostro chiarimento, procederemo con:

1. **Test di integrazione** con una Monday recipe di test
2. **Validazione finale** del parsing per il tuo formato specifico
3. **Documentazione aggiornata** con esempi per il tuo caso d'uso

---

## File Referenza nel Progetto

Se vuoi approfondire il nostro approccio:
- **Logica estrazione email:** `/controllers/emailController.js` (linee 163-241)
- **Query GraphQL:** `/controllers/emailController.js` (linee 50-95)
- **Response format:** `/routes/email.js`
- **Analisi completa:** `/RISPOSTA_TECNICO_MONDAY.md` (documento dettagliato)

---

**Rimaniamo in attesa del tuo chiarimento per completare la validazione.**

Non vediamo l'ora di procedere! 🚀

---

*Questa risposta è basata sulla tua documentazione fornita e sulla nostra analisi della implementazione attuale.*
