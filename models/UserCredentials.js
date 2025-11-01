const { db } = require('../config/database');
const crypto = require('crypto');

/**
 * Classe per gestire le credenziali utenti nel database
 */
class UserCredentials {
  /**
   * Genera una chiave di derivazione dalla password master
   * @param {string} password - Password master da .env
   * @returns {Buffer} Chiave di 32 byte per AES-256
   */
  static deriveKey(password) {
    // Usa PBKDF2 per derivare una chiave da una password
    // Con un salt statico (in produzione, considera salt diversi)
    const salt = crypto.createHash('sha256').update('monday-aruba-salt').digest();
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  }

  /**
   * Cripta una password usando AES-256-CBC
   * @param {string} plaintext - Password da criptare
   * @returns {string} Password criptata in formato hex
   */
  static encrypt(plaintext) {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY not found in environment variables');
    }

    const key = this.deriveKey(encryptionKey);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Combina IV + encrypted data (IV è necessario per la decrittazione)
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decripta una password criptata
   * @param {string} ciphertext - Password criptata (formato IV:encrypted)
   * @returns {string} Password in chiaro
   */
  static decrypt(ciphertext) {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY not found in environment variables');
    }

    try {
      const key = this.deriveKey(encryptionKey);
      const [ivHex, encryptedHex] = ciphertext.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const encryptedBuffer = Buffer.from(encryptedHex, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedBuffer, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Failed to decrypt password: ${error.message}`);
    }
  }

  /**
   * Crea nuove credenziali utenti
   * @param {Object} userData - Dati utente
   * @param {string} userData.monday_user_id - ID utente Monday.com
   * @param {string} userData.monday_account_id - ID account Monday.com
   * @param {string} userData.aruba_email - Email Aruba
   * @param {string} userData.aruba_password - Password Aruba (verrà criptata)
   * @param {string} [userData.smtp_host] - Host SMTP (default: mail.aruba.it)
   * @param {number} [userData.smtp_port] - Porta SMTP (default: 465)
   * @returns {Object} Credenziali salvate (senza password in chiaro)
   */
  static create(userData) {
    if (!userData.monday_user_id || !userData.aruba_email || !userData.aruba_password) {
      throw new Error('Missing required fields: monday_user_id, aruba_email, aruba_password');
    }

    const encryptedPassword = this.encrypt(userData.aruba_password);
    const smtpHost = userData.smtp_host || 'mail.aruba.it';
    const smtpPort = userData.smtp_port || 465;

    const stmt = db.prepare(`
      INSERT INTO user_credentials (
        monday_user_id,
        monday_account_id,
        aruba_email,
        aruba_password_encrypted,
        smtp_host,
        smtp_port
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
      const info = stmt.run(
        userData.monday_user_id,
        userData.monday_account_id,
        userData.aruba_email,
        encryptedPassword,
        smtpHost,
        smtpPort
      );

      return {
        id: info.lastInsertRowid,
        monday_user_id: userData.monday_user_id,
        aruba_email: userData.aruba_email,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error(`User credentials already exist for monday_user_id: ${userData.monday_user_id}`);
      }
      throw error;
    }
  }

  /**
   * Trova credenziali per un utente Monday
   * @param {string} userId - Monday user ID
   * @returns {Object|null} Credenziali trovate (senza password in chiaro)
   */
  static findByUserId(userId) {
    const stmt = db.prepare(`
      SELECT
        id,
        monday_user_id,
        monday_account_id,
        aruba_email,
        smtp_host,
        smtp_port,
        created_at,
        updated_at
      FROM user_credentials
      WHERE monday_user_id = ?
    `);

    return stmt.get(userId) || null;
  }

  /**
   * Trova credenziali con password decriptata
   * @param {string} userId - Monday user ID
   * @returns {Object|null} Credenziali trovate (con password decriptata)
   */
  static findByUserIdWithPassword(userId) {
    const stmt = db.prepare(`
      SELECT
        id,
        monday_user_id,
        monday_account_id,
        aruba_email,
        aruba_password_encrypted,
        smtp_host,
        smtp_port,
        created_at,
        updated_at
      FROM user_credentials
      WHERE monday_user_id = ?
    `);

    const credentials = stmt.get(userId);
    if (!credentials) return null;

    return {
      ...credentials,
      aruba_password: this.decrypt(credentials.aruba_password_encrypted)
    };
  }

  /**
   * Aggiorna credenziali utenti
   * @param {string} userId - Monday user ID
   * @param {Object} userData - Dati da aggiornare
   * @returns {Object} Credenziali aggiornate
   */
  static update(userId, userData) {
    const existing = this.findByUserId(userId);
    if (!existing) {
      throw new Error(`User credentials not found for monday_user_id: ${userId}`);
    }

    const updates = {
      monday_account_id: userData.monday_account_id ?? existing.monday_account_id,
      aruba_email: userData.aruba_email ?? existing.aruba_email,
      smtp_host: userData.smtp_host ?? existing.smtp_host,
      smtp_port: userData.smtp_port ?? existing.smtp_port,
      updated_at: new Date().toISOString()
    };

    let query = `
      UPDATE user_credentials SET
        monday_account_id = ?,
        aruba_email = ?,
        smtp_host = ?,
        smtp_port = ?,
        updated_at = ?
    `;
    const params = [
      updates.monday_account_id,
      updates.aruba_email,
      updates.smtp_host,
      updates.smtp_port,
      updates.updated_at
    ];

    // Aggiorna password se fornita
    if (userData.aruba_password) {
      const encryptedPassword = this.encrypt(userData.aruba_password);
      query += `, aruba_password_encrypted = ?`;
      params.push(encryptedPassword);
    }

    query += ` WHERE monday_user_id = ?`;
    params.push(userId);

    const stmt = db.prepare(query);
    stmt.run(...params);

    return this.findByUserId(userId);
  }

  /**
   * Elimina credenziali utenti
   * @param {string} userId - Monday user ID
   * @returns {boolean} True se eliminato, false se non trovato
   */
  static delete(userId) {
    const stmt = db.prepare(`
      DELETE FROM user_credentials
      WHERE monday_user_id = ?
    `);

    const info = stmt.run(userId);
    return info.changes > 0;
  }

  /**
   * Recupera tutte le credenziali (senza password)
   * @returns {Array} Array di credenziali
   */
  static findAll() {
    const stmt = db.prepare(`
      SELECT
        id,
        monday_user_id,
        monday_account_id,
        aruba_email,
        smtp_host,
        smtp_port,
        created_at,
        updated_at
      FROM user_credentials
      ORDER BY created_at DESC
    `);

    return stmt.all();
  }

  /**
   * Conta il numero di credenziali salvate
   * @returns {number} Numero di credenziali
   */
  static count() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM user_credentials');
    const result = stmt.get();
    return result.count;
  }
}

module.exports = UserCredentials;
