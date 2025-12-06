/**
 * Integration Credentials Model - Supabase/Prisma
 *
 * Manages Monday.com + Aruba Mail integration credentials
 * Replaces the SQLite-based UserCredentials model
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

class IntegrationCredentials {
  /**
   * Derive encryption key from master key using PBKDF2
   * @param {string} masterKey - Master encryption key from env
   * @returns {Buffer} Derived key (32 bytes)
   */
  static deriveKey(masterKey) {
    return crypto.pbkdf2Sync(
      masterKey,
      'aruba_mail_salt',
      100000, // iterations
      32, // key length (256 bits)
      'sha256'
    );
  }

  /**
   * Encrypt password with AES-256-CBC
   * @param {string} plaintext - Password to encrypt
   * @returns {string} Encrypted password (IV:encrypted)
   */
  static encrypt(plaintext) {
    const key = this.deriveKey(process.env.ENCRYPTION_KEY);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data separated by colon
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt password with AES-256-CBC
   * @param {string} ciphertext - Encrypted password (IV:encrypted)
   * @returns {string} Decrypted password
   */
  static decrypt(ciphertext) {
    const [ivHex, encrypted] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = this.deriveKey(process.env.ENCRYPTION_KEY);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Create new integration credentials
   * @param {object} data - { userId, accountId, arubaEmail, arubaPassword, smtpHost, smtpPort }
   * @returns {Promise<object>} Created credentials
   */
  static async create(data) {
    const {
      userId,
      accountId,
      aruba_email,
      aruba_password,
      smtp_host = 'mail.aruba.it',
      smtp_port = 465
    } = data;

    console.log(`[IntegrationCredentials] Creating credentials for user: ${userId}`);

    // ✅ ENCRYPTION ENABLED
    const encryptedPassword = this.encrypt(aruba_password);

    console.log('[IntegrationCredentials] ✅ Password encrypted with AES-256-CBC');

    try {
      const credentials = await prisma.integrationCredentials.create({
        data: {
          userId,
          accountId,
          arubaEmail: aruba_email,
          arubaPassword: encryptedPassword,
          smtpHost: smtp_host,
          smtpPort: parseInt(smtp_port)
        }
      });

      console.log(`[IntegrationCredentials] ✓ Credentials created for user: ${userId}`);
      return credentials;
    } catch (error) {
      if (error.code === 'P2002') {
        console.error(`[IntegrationCredentials] ✗ Unique constraint violation for userId: ${userId}`);
        throw new Error('Credenziali già presenti per questo utente');
      }
      throw error;
    }
  }

  /**
   * Find credentials by userId
   * @param {string} userId - Monday user ID
   * @returns {Promise<object|null>} Credentials (without password)
   */
  static async findByUserId(userId) {
    console.log(`[IntegrationCredentials] Finding credentials for user: ${userId}`);

    try {
      const credentials = await prisma.integrationCredentials.findUnique({
        where: { userId }
      });

      if (!credentials) {
        console.warn(`[IntegrationCredentials] No credentials found for user: ${userId}`);
        return null;
      }

      // Return without password
      return {
        id: credentials.id,
        userId: credentials.userId,
        accountId: credentials.accountId,
        aruba_email: credentials.arubaEmail,
        smtp_host: credentials.smtpHost,
        smtp_port: credentials.smtpPort,
        created_at: credentials.createdAt,
        updated_at: credentials.updatedAt
      };
    } catch (error) {
      console.error(`[IntegrationCredentials] Error finding credentials:`, error);
      throw error;
    }
  }

  /**
   * Find credentials by userId with decrypted password
   * @param {string} userId - Monday user ID
   * @returns {Promise<object|null>} Credentials with decrypted password
   */
  static async findByUserIdWithPassword(userId) {
    console.log(`[IntegrationCredentials] Finding credentials with password for user: ${userId}`);

    try {
      const credentials = await prisma.integrationCredentials.findUnique({
        where: { userId }
      });

      if (!credentials) {
        console.warn(`[IntegrationCredentials] No credentials found for user: ${userId}`);
        return null;
      }

      // ✅ DECRYPTION ENABLED
      const decryptedPassword = this.decrypt(credentials.arubaPassword);

      return {
        id: credentials.id,
        userId: credentials.userId,
        accountId: credentials.accountId,
        aruba_email: credentials.arubaEmail,
        aruba_password: decryptedPassword,
        smtp_host: credentials.smtpHost,
        smtp_port: credentials.smtpPort,
        created_at: credentials.createdAt,
        updated_at: credentials.updatedAt
      };
    } catch (error) {
      console.error(`[IntegrationCredentials] Error finding credentials with password:`, error);
      throw error;
    }
  }

  /**
   * Update credentials
   * @param {string} userId - Monday user ID
   * @param {object} data - Fields to update (aruba_email, aruba_password, smtp_host, smtp_port)
   * @returns {Promise<object>} Updated credentials
   */
  static async update(userId, data) {
    console.log(`[IntegrationCredentials] ========================================`);
    console.log(`[IntegrationCredentials] Updating credentials for user: ${userId}`);
    console.log(`[IntegrationCredentials] Input data keys:`, Object.keys(data));
    console.log(`[IntegrationCredentials] Email provided:`, !!data.aruba_email);
    console.log(`[IntegrationCredentials] Password provided:`, !!data.aruba_password);
    console.log(`[IntegrationCredentials] SMTP host provided:`, !!data.smtp_host);
    console.log(`[IntegrationCredentials] SMTP port provided:`, !!data.smtp_port);

    const updateData = {};

    // Update email if provided
    if (data.aruba_email) {
      updateData.arubaEmail = data.aruba_email;
      console.log(`[IntegrationCredentials] ✓ Email will be updated to:`, data.aruba_email);
    }

    // Update SMTP host if provided
    if (data.smtp_host !== undefined) {
      updateData.smtpHost = data.smtp_host;
      console.log(`[IntegrationCredentials] ✓ SMTP host will be updated to:`, data.smtp_host);
    }

    // Update SMTP port if provided
    if (data.smtp_port !== undefined) {
      updateData.smtpPort = parseInt(data.smtp_port);
      console.log(`[IntegrationCredentials] ✓ SMTP port will be updated to:`, parseInt(data.smtp_port));
    }

    // ✅ ENCRYPT password if provided
    if (data.aruba_password) {
      const encryptedPassword = this.encrypt(data.aruba_password);
      updateData.arubaPassword = encryptedPassword;
      console.log(`[IntegrationCredentials] ✓ Password encrypted with AES-256-CBC (length: ${data.aruba_password.length})`);
    }

    console.log(`[IntegrationCredentials] Update data prepared:`, Object.keys(updateData));
    console.log(`[IntegrationCredentials] ========================================`);

    try {
      const credentials = await prisma.integrationCredentials.update({
        where: { userId },
        data: updateData
      });

      console.log(`[IntegrationCredentials] ✓ Credentials updated successfully for user: ${userId}`);
      console.log(`[IntegrationCredentials] Updated fields:`, {
        hasEmail: !!credentials.arubaEmail,
        hasPassword: !!credentials.arubaPassword,
        smtpHost: credentials.smtpHost,
        smtpPort: credentials.smtpPort,
        updatedAt: credentials.updatedAt
      });
      return credentials;
    } catch (error) {
      if (error.code === 'P2025') {
        console.warn(`[IntegrationCredentials] ✗ Record not found for user: ${userId}`);
        throw new Error('Credenziali non trovate');
      }
      console.error(`[IntegrationCredentials] ✗ Database error:`, error.code, error.message);
      throw error;
    }
  }

  /**
   * Delete credentials
   * @param {string} userId - Monday user ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(userId) {
    console.log(`[IntegrationCredentials] Deleting credentials for user: ${userId}`);

    try {
      const result = await prisma.integrationCredentials.delete({
        where: { userId }
      });

      console.log(`[IntegrationCredentials] ✓ Credentials deleted for user: ${userId}`);
      return true;
    } catch (error) {
      if (error.code === 'P2025') {
        console.warn(`[IntegrationCredentials] Record not found for deletion: ${userId}`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Get all credentials (admin only)
   * @returns {Promise<Array>} All credentials (without passwords)
   */
  static async findAll() {
    console.log('[IntegrationCredentials] Retrieving all credentials');

    try {
      const credentials = await prisma.integrationCredentials.findMany({
        select: {
          id: true,
          userId: true,
          accountId: true,
          arubaEmail: true,
          smtpHost: true,
          smtpPort: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return credentials;
    } catch (error) {
      console.error('[IntegrationCredentials] Error retrieving all credentials:', error);
      throw error;
    }
  }

  /**
   * Get credential count
   * @returns {Promise<number>} Total number of credentials
   */
  static async count() {
    try {
      return await prisma.integrationCredentials.count();
    } catch (error) {
      console.error('[IntegrationCredentials] Error counting credentials:', error);
      throw error;
    }
  }

  /**
   * Log audit event
   * @param {string} userId - User ID
   * @param {string} action - Action performed
   * @param {string} status - Success/failure status
   * @param {string} message - Optional message
   */
  static async logAudit(userId, action, status, message = null) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          status,
          message,
          metadata: { timestamp: new Date().toISOString() }
        }
      });
    } catch (error) {
      console.error('[IntegrationCredentials] Error logging audit:', error);
      // Don't throw - audit logging failure shouldn't break the app
    }
  }

  /**
   * Disconnect Prisma client
   */
  static async disconnect() {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await IntegrationCredentials.disconnect();
  process.exit(0);
});

module.exports = IntegrationCredentials;
