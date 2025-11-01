const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Crea la cartella data se non esiste
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Percorso del database SQLite
const dbPath = path.join(dataDir, 'monday_aruba.db');

// Inizializza il database
const db = new Database(dbPath);

// Abilita le foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Inizializza le tabelle del database
 */
const initializeTables = () => {
  // Tabella per le credenziali utenti
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monday_user_id TEXT UNIQUE NOT NULL,
      monday_account_id TEXT NOT NULL,
      aruba_email TEXT NOT NULL,
      aruba_password_encrypted TEXT NOT NULL,
      smtp_host TEXT DEFAULT 'mail.aruba.it',
      smtp_port INTEGER DEFAULT 465,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CHECK (length(monday_user_id) > 0),
      CHECK (length(aruba_email) > 0),
      CHECK (smtp_port > 0 AND smtp_port < 65536)
    );
  `);

  // Crea indice su monday_user_id per ricerche veloci
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_credentials_monday_user_id
    ON user_credentials(monday_user_id);
  `);

  console.log('Database initialized successfully');
};

// Inizializza le tabelle
initializeTables();

/**
 * Chiude la connessione al database
 */
const closeDatabase = () => {
  if (db) {
    db.close();
    console.log('Database connection closed');
  }
};

// Chiudi il database quando il processo termina
process.on('exit', closeDatabase);
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

module.exports = {
  db,
  closeDatabase
};
