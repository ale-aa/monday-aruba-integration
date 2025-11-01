# Database - SQLite Configuration

## Panoramica

Il progetto utilizza **SQLite** con la libreria **better-sqlite3** per immagazzinare le credenziali degli utenti in modo sicuro.

## Struttura Database

### Tabella: `user_credentials`

Memorizza le credenziali Aruba Mail degli utenti Monday.com.

#### Schema

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | INTEGER | ID primario auto-incremento |
| `monday_user_id` | TEXT | ID univoco utente Monday.com (UNIQUE) |
| `monday_account_id` | TEXT | ID account Monday.com |
| `aruba_email` | TEXT | Email Aruba per SMTP |
| `aruba_password_encrypted` | TEXT | Password Aruba criptata (AES-256-CBC) |
| `smtp_host` | TEXT | Host SMTP (default: mail.aruba.it) |
| `smtp_port` | INTEGER | Porta SMTP (default: 465) |
| `created_at` | DATETIME | Timestamp creazione |
| `updated_at` | DATETIME | Timestamp ultimo aggiornamento |

#### Indici

- `idx_user_credentials_monday_user_id` - Indice su `monday_user_id` per ricerche veloci

## Criptazione Password

Le password Aruba Mail sono criptate usando **AES-256-CBC** con le seguenti caratteristiche:

### Algoritmo
- **Algoritmo**: AES-256-CBC
- **Derivazione Chiave**: PBKDF2 con 100,000 iterazioni
- **IV**: Casuale (16 byte) per ogni password
- **Formato Memorizzazione**: `IV_HEX:ENCRYPTED_HEX`

### Chiave di Criptazione

La chiave di criptazione è derivata da `ENCRYPTION_KEY` nel file `.env`:

```javascript
const key = crypto.pbkdf2Sync(
  encryptionKey,           // Da process.env.ENCRYPTION_KEY
  salt,                    // 'monday-aruba-salt' (statico)
  100000,                  // Iterazioni
  32,                      // 32 byte per AES-256
  'sha256'
);
```

### Generare una Chiave di Criptazione

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Aggiungi il risultato al file `.env`:

```env
ENCRYPTION_KEY=<output del comando>
```

## Utilizzo

### Importare il Modello

```javascript
const UserCredentials = require('./models/UserCredentials');
```

### Creare Credenziali

```javascript
const credentials = UserCredentials.create({
  monday_user_id: 'user_123456',
  monday_account_id: 'account_789',
  aruba_email: 'user@aruba.it',
  aruba_password: 'SecurePassword123!',
  smtp_host: 'mail.aruba.it',    // Opzionale
  smtp_port: 465                  // Opzionale
});
```

**Risposta:**
```javascript
{
  id: 1,
  monday_user_id: 'user_123456',
  aruba_email: 'user@aruba.it',
  smtp_host: 'mail.aruba.it',
  smtp_port: 465,
  created_at: '2025-11-01T14:32:39.177Z'
}
```

### Trovare Credenziali (Senza Password)

```javascript
const credentials = UserCredentials.findByUserId('user_123456');
```

**Risposta:**
```javascript
{
  id: 1,
  monday_user_id: 'user_123456',
  monday_account_id: 'account_789',
  aruba_email: 'user@aruba.it',
  smtp_host: 'mail.aruba.it',
  smtp_port: 465,
  created_at: '2025-11-01 14:32:39',
  updated_at: '2025-11-01 14:32:39'
}
```

### Trovare Credenziali (Con Password Decriptata)

```javascript
const credentials = UserCredentials.findByUserIdWithPassword('user_123456');
const password = credentials.aruba_password; // Password decriptata
```

**Risposta:**
```javascript
{
  id: 1,
  monday_user_id: 'user_123456',
  monday_account_id: 'account_789',
  aruba_email: 'user@aruba.it',
  aruba_password: 'SecurePassword123!', // Decriptata
  smtp_host: 'mail.aruba.it',
  smtp_port: 465,
  created_at: '2025-11-01 14:32:39',
  updated_at: '2025-11-01 14:32:39'
}
```

### Aggiornare Credenziali

```javascript
const updated = UserCredentials.update('user_123456', {
  aruba_email: 'newemail@aruba.it',
  aruba_password: 'NewPassword456!',
  smtp_port: 587
});
```

**Note:**
- Campi opzionali: `monday_account_id`, `aruba_email`, `aruba_password`, `smtp_host`, `smtp_port`
- Mantiene i valori esistenti per i campi non forniti

### Eliminare Credenziali

```javascript
const deleted = UserCredentials.delete('user_123456');
// Restituisce: true se eliminato, false se non trovato
```

### Recuperare Tutti gli Utenti

```javascript
const allCredentials = UserCredentials.findAll();
```

**Risposta:** Array di oggetti credenziali (senza password)

### Contare le Credenziali

```javascript
const count = UserCredentials.count();
// Restituisce: numero intero
```

## Metodi di Criptazione

### Criptare una Password

```javascript
const encrypted = UserCredentials.encrypt('MyPassword123!');
// Restituisce: "IV_HEX:ENCRYPTED_HEX"
```

### Decriptare una Password

```javascript
const decrypted = UserCredentials.decrypt('IV_HEX:ENCRYPTED_HEX');
// Restituisce: "MyPassword123!"
```

## File del Database

Il database SQLite è memorizzato in:

```
project-root/data/monday_aruba.db
```

### Cartella Data

Se la cartella `data` non esiste, viene creata automaticamente al primo avvio del server.

### Backup

Per il backup del database, copia semplicemente il file `monday_aruba.db`:

```bash
cp data/monday_aruba.db data/monday_aruba.backup.db
```

## Testing

Per testare il database e le funzionalità di criptazione:

```bash
node test-database.js
```

Lo script esegue i seguenti test:
1. Creazione credenziali
2. Recupero credenziali (senza password)
3. Recupero credenziali (con password decriptata)
4. Aggiornamento credenziali
5. Verifica aggiornamento password
6. Creazione secondo utente
7. Recupero tutti gli utenti
8. Conteggio credenziali
9. Eliminazione credenziali
10. Verifica eliminazione
11. Test vincolo UNIQUE

## Sicurezza

### Best Practices

1. **ENCRYPTION_KEY**: Usa una stringa lunga e casuale (minimo 32 caratteri)
2. **File .env**: Non committare il file `.env` su Git (è nel `.gitignore`)
3. **Backup**: Proteggi i backup del database allo stesso modo dei file `.env`
4. **Accesso**: Limita l'accesso al file database a permessi leggibili solo dal server

### Protezione File

```bash
# Impostare permessi ristretti sul database
chmod 600 data/monday_aruba.db
chmod 700 data
```

## Migrazione e Aggiornamenti

### Aggiungere Colonne

Per aggiungere colonne alla tabella, modifica il file `config/database.js`:

```javascript
// Aggiungi il comando ALTER TABLE
db.exec(`
  ALTER TABLE user_credentials ADD COLUMN new_column TEXT;
`);
```

### Eliminare la Tabella (Sviluppo)

```javascript
// Nel file config/database.js (durante sviluppo)
db.exec('DROP TABLE IF EXISTS user_credentials;');
```

## Troubleshooting

### Errore: "UNIQUE constraint failed"

Significa che stai cercando di creare credenziali per un `monday_user_id` che già esiste.

```javascript
// Soluzione: Aggiorna invece di creare
UserCredentials.update('existing_user_id', { /* dati */ });
```

### Errore: "ENCRYPTION_KEY not found"

Assicurati che `ENCRYPTION_KEY` sia definito nel file `.env`:

```bash
cp .env.example .env
# Quindi modifica .env e aggiungi ENCRYPTION_KEY
```

### Errore: "Failed to decrypt password"

Significa che la password è stata criptata con una chiave diversa da quella in `.env`.

**Cause comuni:**
- La chiave `ENCRYPTION_KEY` è stata cambiata
- Il database è stato spostato da un'altra installazione

**Soluzione:** Ricrea le credenziali con la nuova chiave

## Performance

- **Ricerca per user_id**: O(1) con indice dedicato
- **Operazioni criptazione**: ~100ms per password (PBKDF2 con 100,000 iterazioni)
- **Operazioni database**: <10ms per operazioni CRUD

## Statistiche Database

Visualizza le statistiche del database:

```javascript
const count = UserCredentials.count();
console.log(`Credenziali salvate: ${count}`);
```

