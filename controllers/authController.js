const jwt = require('jsonwebtoken');
const IntegrationCredentials = require('../models/IntegrationCredentials');
const { logAuthSuccess, logAuthFailure } = require('../middleware/authLogger');

/**
 * Controller per gestire il flusso di autorizzazione
 */
class AuthController {
  /**
   * Crea il form per le credenziali Aruba
   * GET /credentials/create?token=<jwt_token>
   *
   * Segue lo standard Monday.com "Credentials Field".
   * Il JWT contiene: userId, accountId, backToUrl
   * Monday.com firma i JWT usando SIGNING_SECRET.
   */
  static async createCredentials(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          error: 'Token mancante',
          message: 'Parametro query "token" richiesto'
        });
      }

      const signingSecret = process.env.MONDAY_SIGNING_SECRET;
      if (!signingSecret) {
        console.error('[AuthController] MONDAY_SIGNING_SECRET non configurato');
        return res.status(500).json({
          error: 'Configurazione server errata',
          message: 'MONDAY_SIGNING_SECRET non definito'
        });
      }

      // Decoda il token usando SIGNING_SECRET
      let decoded;
      try {
        decoded = jwt.verify(token, signingSecret);
      } catch (error) {
        logAuthFailure({
          reason: 'Invalid JWT token',
          method: 'authorize',
          statusCode: 401
        });
        return res.status(401).json({
          error: 'Token non valido',
          message: error.message
        });
      }

      // Estrai e converti userId a stringa per il database Prisma
      const { userId: rawUserId, accountId: rawAccountId, backToUrl } = decoded;
      const userId = String(rawUserId);
      const accountId = String(rawAccountId);

      console.log('[AuthController] Decoded JWT - userId:', userId, '(type: string), accountId:', accountId, 'backToUrl:', backToUrl);

      if (!userId || !accountId) {
        return res.status(400).json({
          error: 'Dati token incompleti',
          message: 'userId e accountId richiesti nel token'
        });
      }

      logAuthSuccess({
        userId,
        accountId,
        method: 'createCredentials',
        source: 'Monday.com'
      });

      // Mostra sempre il form (non fare redirect automatico se credenziali esistono)
      // L'utente può aggiornare le credenziali se lo desidera

      // Mostra il form HTML per la configurazione
      // backToUrl non deve essere encoded qui: il browser lo farà automaticamente nel form submission
      const htmlForm = `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Configurazione Email Aruba</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 8px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              max-width: 500px;
              width: 100%;
              padding: 40px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
              font-size: 24px;
            }
            .subtitle {
              color: #666;
              margin-bottom: 30px;
              font-size: 14px;
            }
            .user-info {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 6px;
              margin-bottom: 20px;
              font-size: 13px;
              color: #555;
            }
            .form-group {
              margin-bottom: 20px;
            }
            label {
              display: block;
              color: #333;
              font-weight: 500;
              margin-bottom: 8px;
              font-size: 14px;
            }
            input, select {
              width: 100%;
              padding: 12px;
              border: 1px solid #ddd;
              border-radius: 6px;
              font-size: 14px;
              transition: border-color 0.3s;
            }
            input:focus, select:focus {
              outline: none;
              border-color: #667eea;
              box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            .form-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .button-group {
              display: flex;
              gap: 10px;
              margin-top: 30px;
            }
            button {
              flex: 1;
              padding: 12px 20px;
              border: none;
              border-radius: 6px;
              font-weight: 600;
              cursor: pointer;
              font-size: 14px;
              transition: all 0.3s;
            }
            .btn-submit {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .btn-submit:hover {
              transform: translateY(-2px);
              box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
            }
            .btn-cancel {
              background: #f0f0f0;
              color: #333;
            }
            .btn-cancel:hover {
              background: #e0e0e0;
            }
            .info-box {
              background: #e3f2fd;
              border-left: 4px solid #2196f3;
              padding: 12px;
              margin-top: 20px;
              border-radius: 4px;
              font-size: 13px;
              color: #1976d2;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Configurazione Email</h1>
            <p class="subtitle">Configura le credenziali per l'account Aruba Mail</p>

            <div class="user-info">
              <strong>Account Monday.com:</strong> ${accountId}<br>
              <strong>User ID:</strong> ${userId}
            </div>

            <form method="POST" action="/credentials/save">
              <div class="form-group">
                <label for="email">Email Aruba *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="user@aruba.it"
                  required
                  autofocus
                >
              </div>

              <div class="form-group">
                <label for="password">Password Aruba *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                >
              </div>

              <div class="form-group">
                <label for="smtp_host">Posta in uscita (SMTP)</label>
                <input
                  type="text"
                  id="smtp_host"
                  name="smtp_host"
                  placeholder="smtps.aruba.it"
                  value="smtps.aruba.it"
                >
              </div>

              <div class="form-group">
                <label for="smtp_port">Porta Server</label>
                <input
                  type="number"
                  id="smtp_port"
                  name="smtp_port"
                  placeholder="465"
                  value="465"
                  min="1"
                  max="65535"
                >
              </div>

              <div class="form-group">
                <label style="display: flex; align-items: center; margin-bottom: 0;">
                  <input
                    type="checkbox"
                    id="use_ssl"
                    name="use_ssl"
                    checked
                    style="width: auto; margin-right: 8px;"
                  >
                  Usa SSL
                </label>
              </div>

              <div class="form-group">
                <label style="display: flex; align-items: center; margin-bottom: 0;">
                  <input
                    type="checkbox"
                    id="use_auth"
                    name="use_auth"
                    checked
                    disabled
                    style="width: auto; margin-right: 8px;"
                  >
                  Autenticazione (sempre attiva per Aruba)
                </label>
              </div>

              <input type="hidden" name="userId" value="${userId}">
              <input type="hidden" name="accountId" value="${accountId}">
              <input type="hidden" name="backToUrl" value="${backToUrl || ''}">

              <div class="info-box">
                🔒 Le tue credenziali verranno criptate e memorizzate in modo sicuro.
              </div>

              <div class="button-group">
                <button type="submit" class="btn-submit">Salva Credenziali</button>
                <button type="button" class="btn-cancel" onclick="goBack()">Annulla</button>
              </div>
            </form>
          </div>

          <script>
            function goBack() {
              const backToUrl = '${backToUrl || ''}';
              if (backToUrl) {
                window.location.href = backToUrl;
              } else {
                window.history.back();
              }
            }
          </script>
        </body>
        </html>
      `;

      res.send(htmlForm);

    } catch (error) {
      console.error('[AuthController] Errore in authorizeForm:', error);
      res.status(500).json({
        error: 'Errore interno',
        message: error.message
      });
    }
  }

  /**
   * Salva o aggiorna le credenziali dell'utente
   * POST /credentials/save
   *
   * Flusso standard Monday.com "Credentials Field":
   * 1. Riceve userId, accountId, email, password, smtp_host, smtp_port, backToUrl
   * 2. Salva credenziali nel database (criptate)
   * 3. Redireziona IMMEDIATAMENTE a backToUrl
   *
   * Il backToUrl viene passato come hidden field dal form HTML di /credentials/create
   */
  static async saveCredentials(req, res) {
    try {
      const {
        userId: rawUserId,
        accountId: rawAccountId,
        email,
        password,
        smtp_host,
        smtp_port,
        backToUrl
      } = req.body;

      // Converti userId e accountId a stringa per il database
      const userId = String(rawUserId);
      const accountId = String(rawAccountId);

      // Validazione input
      if (!userId || !accountId) {
        return res.status(400).json({
          error: 'Dati mancanti',
          message: 'userId e accountId richiesti'
        });
      }

      if (!email || !email.trim()) {
        return res.status(400).json({
          error: 'Email obbligatoria',
          message: 'L\'email Aruba è richiesta'
        });
      }

      if (!password || !password.trim()) {
        return res.status(400).json({
          error: 'Password obbligatoria',
          message: 'La password Aruba è richiesta'
        });
      }

      const smtpHost = smtp_host || 'mail.aruba.it';
      const smtpPort = parseInt(smtp_port) || 465;

      // Valida il formato della porta
      if (smtpPort < 1 || smtpPort > 65535) {
        return res.status(400).json({
          error: 'Porta SMTP invalida',
          message: 'La porta deve essere tra 1 e 65535'
        });
      }

      console.log(`[AuthController] Salvataggio credenziali - userId: ${userId}, email: ${email.trim()}`);

      // Salva o aggiorna le credenziali
      try {
        const existing = await IntegrationCredentials.findByUserId(userId);

        if (existing) {
          // Aggiorna credenziali esistenti
          console.log(`[AuthController] Aggiornamento credenziali esistenti per userId: ${userId}`);
          await IntegrationCredentials.update(userId, {
            aruba_email: email.trim(),
            aruba_password: password,
            smtp_host: smtpHost,
            smtp_port: smtpPort
          });
          await IntegrationCredentials.logAudit(userId, 'saveCredentials', 'updated');
          logAuthSuccess({
            userId,
            accountId,
            method: 'saveCredentials',
            source: 'Credentials Update'
          });
        } else {
          // Crea nuove credenziali
          console.log(`[AuthController] Creazione nuove credenziali per userId: ${userId}`);
          await IntegrationCredentials.create({
            userId,
            accountId,
            aruba_email: email.trim(),
            aruba_password: password,
            smtp_host: smtpHost,
            smtp_port: smtpPort
          });
          await IntegrationCredentials.logAudit(userId, 'saveCredentials', 'created');
          logAuthSuccess({
            userId,
            accountId,
            method: 'saveCredentials',
            source: 'Credentials Create'
          });
        }

        // Dopo il salvataggio, redireziona direttamente a backToUrl
        console.log('[AuthController] Form backToUrl:', backToUrl);
        console.log('[AuthController] Redirecting to:', backToUrl);
        return res.redirect(backToUrl);

      } catch (error) {
        if (error.code === 'P2002' || error.message.includes('UNIQUE constraint failed')) {
          // Mostra pagina HTML di errore per duplicazione
          const errorHtml = `
            <!DOCTYPE html>
            <html lang="it">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Errore Configurazione</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  min-height: 100vh;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  padding: 20px;
                }
                .container {
                  background: white;
                  border-radius: 12px;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                  max-width: 500px;
                  width: 100%;
                  padding: 50px 40px;
                  text-align: center;
                }
                .error-icon {
                  width: 80px;
                  height: 80px;
                  margin: 0 auto 30px;
                  background: #ffebee;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 40px;
                  color: #c62828;
                }
                h1 {
                  color: #c62828;
                  margin-bottom: 15px;
                  font-size: 28px;
                }
                p {
                  color: #666;
                  margin-bottom: 20px;
                  font-size: 16px;
                  line-height: 1.6;
                }
                .error-box {
                  background: #ffebee;
                  border-left: 4px solid #c62828;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                  text-align: left;
                  font-size: 14px;
                  color: #555;
                }
                .button {
                  display: inline-block;
                  margin-top: 20px;
                  padding: 12px 30px;
                  background: #667eea;
                  color: white;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: 600;
                  border: none;
                  cursor: pointer;
                  transition: all 0.3s;
                }
                .button:hover {
                  background: #764ba2;
                  transform: translateY(-2px);
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="error-icon">⚠</div>
                <h1>Credenziali Già Configurate</h1>
                <p>Esiste già una configurazione per questo utente.</p>

                <div class="error-box">
                  <strong>Cosa è successo:</strong><br>
                  Le credenziali per l'utente <code>${userId}</code> sono già state salvate nel sistema.
                </div>

                <p>Per aggiornare le credenziali, contatta l'amministratore del sistema.</p>

                <button class="button" onclick="history.back()">Torna Indietro</button>
              </div>
            </body>
            </html>
          `;
          return res.status(409).send(errorHtml);
        }
        throw error;
      }

    } catch (error) {
      console.error('[AuthController] Errore in saveCredentials:', error);
      logAuthFailure({
        reason: error.message,
        method: 'save-credentials',
        statusCode: 500
      });

      // Mostra pagina HTML di errore generico
      const errorHtml = `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Errore nel Salvataggio</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 12px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 500px;
              width: 100%;
              padding: 50px 40px;
              text-align: center;
            }
            .error-icon {
              width: 80px;
              height: 80px;
              margin: 0 auto 30px;
              background: #ffebee;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 40px;
              color: #c62828;
            }
            h1 {
              color: #c62828;
              margin-bottom: 15px;
              font-size: 28px;
            }
            p {
              color: #666;
              margin-bottom: 20px;
              font-size: 16px;
              line-height: 1.6;
            }
            .error-box {
              background: #ffebee;
              border-left: 4px solid #c62828;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
              text-align: left;
              font-size: 13px;
              color: #555;
              max-height: 150px;
              overflow-y: auto;
              font-family: 'Courier New', monospace;
            }
            .button {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              border: none;
              cursor: pointer;
              transition: all 0.3s;
              margin-right: 10px;
            }
            .button:hover {
              background: #764ba2;
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">⚠</div>
            <h1>Errore nel Salvataggio</h1>
            <p>Si è verificato un errore durante il salvataggio delle credenziali.</p>

            <div class="error-box">
              <strong>Dettagli errore:</strong><br>
              ${error.message}
            </div>

            <p style="font-size: 14px; color: #999;">
              Se il problema persiste, contatta il supporto tecnico.
            </p>

            <button class="button" onclick="history.back()">Torna Indietro</button>
            <button class="button" onclick="location.reload()" style="background: #999;">Riprova</button>
          </div>
        </body>
        </html>
      `;

      return res.status(500).send(errorHtml);
    }
  }

  /**
   * Recupera credenziali per il dropdown Credentials Field di Monday.com
   * POST /credentials/get
   *
   * Ritorna un array di credenziali disponibili per l'utente
   * Formato standard Monday.com Credentials Field:
   * [
   *   {
   *     title: "Account Aruba - email@aruba.it",
   *     value: userId
   *   }
   * ]
   *
   * Richiede: Authorization header con JWT valido
   */
  static async getCredentials(req, res) {
    try {
      const userId = req.monday?.userId;

      if (!userId) {
        console.warn('[AuthController] getCredentials - userId mancante');
        return res.status(400).json({
          error: 'User ID mancante',
          message: 'Impossibile estrarre userId dal token'
        });
      }

      const credentials = await IntegrationCredentials.findByUserId(userId);

      // Se credenziali trovate, ritorna in formato Credentials Field
      if (credentials) {
        console.log(`[AuthController] Get credentials for userId: ${userId}, found: true`);
        return res.status(200).json([
          {
            title: `Account Aruba - ${credentials.aruba_email}`,
            value: userId
          }
        ]);
      }

      // Se non trovate, ritorna array vuoto
      console.log(`[AuthController] Get credentials for userId: ${userId}, found: false`);
      return res.status(200).json([]);

    } catch (error) {
      console.error('[AuthController] Errore in getCredentials:', error);
      return res.status(500).json({
        error: 'Errore interno',
        message: error.message
      });
    }
  }

  /**
   * Elimina credenziali dell'utente
   * POST /credentials/delete
   *
   * Elimina le credenziali Aruba associate all'utente
   * Risposta: {success: true}
   *
   * Richiede: Authorization header con JWT valido
   */
  static async deleteCredentials(req, res) {
    try {
      const userId = req.monday?.userId;

      if (!userId) {
        console.warn('[AuthController] deleteCredentials - userId mancante');
        return res.status(400).json({
          error: 'User ID mancante',
          message: 'Impossibile estrarre userId dal token'
        });
      }

      const deleted = await IntegrationCredentials.delete(userId);

      if (!deleted) {
        console.log(`[AuthController] deleteCredentials - credenziali non trovate per userId: ${userId}`);
        return res.status(200).json({
          success: false,
          message: 'Credenziali non trovate'
        });
      }

      console.log(`[AuthController] Deleted credentials for userId: ${userId}`);
      await IntegrationCredentials.logAudit(userId, 'deleteCredentials', 'deleted');

      return res.status(200).json({
        success: true,
        message: 'Credenziali eliminate con successo'
      });

    } catch (error) {
      console.error('[AuthController] Errore in deleteCredentials:', error);
      return res.status(500).json({
        error: 'Errore nell\'eliminazione',
        message: error.message
      });
    }
  }

  /**
   * Recupera le credenziali dell'utente
   * POST /monday/getUserCredentials
   * Richiede: Authorization header con JWT valido
   */
  static async getUserCredentials(req, res) {
    try {
      const userId = req.monday?.userId;

      if (!userId) {
        return res.status(400).json({
          error: 'User ID mancante',
          message: 'Impossibile estrarre userId dal token'
        });
      }

      const credentials = await IntegrationCredentials.findByUserId(userId);

      if (!credentials) {
        return res.status(200).json({
          exists: false,
          message: 'Nessuna credenziale configurata'
        });
      }

      // Ritorna credenziali senza password
      res.status(200).json({
        exists: true,
        userId: credentials.userId,
        accountId: credentials.accountId,
        email: credentials.aruba_email,
        smtp_host: credentials.smtp_host,
        smtp_port: credentials.smtp_port,
        created_at: credentials.created_at,
        updated_at: credentials.updated_at
      });

    } catch (error) {
      console.error('[AuthController] Errore in getUserCredentials:', error);
      res.status(500).json({
        error: 'Errore interno',
        message: error.message
      });
    }
  }

  /**
   * Elimina le credenziali dell'utente
   * POST /monday/deleteUserCredentials
   * Richiede: Authorization header con JWT valido
   */
  static async deleteUserCredentials(req, res) {
    try {
      const userId = req.monday?.userId;

      if (!userId) {
        return res.status(400).json({
          error: 'User ID mancante',
          message: 'Impossibile estrarre userId dal token'
        });
      }

      const deleted = await IntegrationCredentials.delete(userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Credenziali non trovate'
        });
      }

      console.log(`[AuthController] Credenziali eliminate per user: ${userId}`);
      await IntegrationCredentials.logAudit(userId, 'delete-credentials', 'deleted');
      logAuthSuccess({
        userId,
        method: 'delete-credentials',
        source: 'Credentials Deletion'
      });

      return res.status(200).json({
        success: true,
        message: 'Credenziali eliminate con successo'
      });

    } catch (error) {
      console.error('[AuthController] Errore in deleteUserCredentials:', error);
      logAuthFailure({
        reason: error.message,
        method: 'delete-credentials',
        statusCode: 500
      });
      res.status(500).json({
        error: 'Errore nell\'eliminazione',
        message: error.message
      });
    }
  }
}

module.exports = AuthController;
