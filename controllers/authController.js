const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const UserCredentials = require('../models/UserCredentials');
const { logAuthSuccess, logAuthFailure } = require('../middleware/authLogger');

/**
 * Controller per gestire il flusso di autorizzazione
 */
class AuthController {
  /**
   * Mostra il form di autorizzazione
   * GET /monday/authorize?token=<jwt_token>
   */
  static authorizeForm(req, res) {
    try {
      const { token, backToUrl } = req.query;

      if (!token) {
        return res.status(400).json({
          error: 'Token mancante',
          message: 'Parametro query "token" richiesto'
        });
      }

      const clientSecret = process.env.MONDAY_CLIENT_SECRET;
      if (!clientSecret) {
        console.error('[AuthController] MONDAY_CLIENT_SECRET non configurato');
        return res.status(500).json({
          error: 'Configurazione server errata',
          message: 'MONDAY_CLIENT_SECRET non definito'
        });
      }

      // Decoda il token
      let decoded;
      try {
        decoded = jwt.verify(token, clientSecret);
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

      const { userId, accountId } = decoded;

      if (!userId || !accountId) {
        return res.status(400).json({
          error: 'Dati token incompleti',
          message: 'userId e accountId richiesti nel token'
        });
      }

      logAuthSuccess({
        userId,
        accountId,
        method: 'authorize',
        source: 'Monday.com'
      });

      // Mostra il form HTML
      const safeBackToUrl = backToUrl ? encodeURIComponent(backToUrl) : '';
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

            <form method="POST" action="/monday/save-credentials">
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
                <label for="smtp_host">Server SMTP</label>
                <input
                  type="text"
                  id="smtp_host"
                  name="smtp_host"
                  placeholder="mail.aruba.it"
                  value="mail.aruba.it"
                >
              </div>

              <div class="form-group">
                <label for="smtp_port">Porta SMTP</label>
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

              <input type="hidden" name="userId" value="${userId}">
              <input type="hidden" name="accountId" value="${accountId}">
              <input type="hidden" name="backToUrl" value="${safeBackToUrl}">

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
              const backToUrl = '${safeBackToUrl}';
              if (backToUrl) {
                window.location.href = decodeURIComponent(backToUrl);
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
   * Salva le credenziali dell'utente
   * POST /monday/save-credentials
   */
  static saveCredentials(req, res) {
    try {
      const {
        userId,
        accountId,
        email,
        password,
        smtp_host,
        smtp_port,
        backToUrl
      } = req.body;

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

      console.log(`[AuthController] Salvando credenziali per user: ${userId}`);

      // Salva o aggiorna le credenziali
      try {
        const existing = UserCredentials.findByUserId(userId);

        if (existing) {
          // Aggiorna credenziali esistenti
          UserCredentials.update(userId, {
            aruba_email: email.trim(),
            aruba_password: password,
            smtp_host: smtpHost,
            smtp_port: smtpPort
          });
          logAuthSuccess({
            userId,
            accountId,
            method: 'save-credentials',
            source: 'Credentials Update'
          });
        } else {
          // Crea nuove credenziali
          UserCredentials.create({
            monday_user_id: userId,
            monday_account_id: accountId,
            aruba_email: email.trim(),
            aruba_password: password,
            smtp_host: smtpHost,
            smtp_port: smtpPort
          });
          logAuthSuccess({
            userId,
            accountId,
            method: 'save-credentials',
            source: 'Credentials Create'
          });
        }

        // Se backToUrl è fornito, redireziona con parametro di successo
        if (backToUrl && backToUrl.trim()) {
          try {
            const decodedUrl = decodeURIComponent(backToUrl);
            const separator = decodedUrl.includes('?') ? '&' : '?';
            return res.redirect(
              `${decodedUrl}${separator}success=true&message=Credenziali+salvate+con+successo`
            );
          } catch (error) {
            console.error('[AuthController] Errore nel redirect:', error);
          }
        }

        // Default: ritorna JSON di successo
        res.status(201).json({
          success: true,
          message: 'Credenziali salvate con successo',
          user: {
            userId,
            accountId,
            email: email.trim()
          }
        });

      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({
            error: 'Credenziali già presenti',
            message: 'Le credenziali per questo utente sono già state configurate'
          });
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
      res.status(500).json({
        error: 'Errore nel salvataggio',
        message: error.message
      });
    }
  }

  /**
   * Recupera le credenziali dell'utente
   * POST /monday/getUserCredentials
   * Richiede: Authorization header con JWT valido
   */
  static getUserCredentials(req, res) {
    try {
      const userId = req.monday?.userId;

      if (!userId) {
        return res.status(400).json({
          error: 'User ID mancante',
          message: 'Impossibile estrarre userId dal token'
        });
      }

      const credentials = UserCredentials.findByUserId(userId);

      if (!credentials) {
        return res.status(200).json({
          exists: false,
          message: 'Nessuna credenziale configurata'
        });
      }

      // Ritorna credenziali senza password
      res.status(200).json({
        exists: true,
        userId: credentials.monday_user_id,
        accountId: credentials.monday_account_id,
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
  static deleteUserCredentials(req, res) {
    try {
      const userId = req.monday?.userId;

      if (!userId) {
        return res.status(400).json({
          error: 'User ID mancante',
          message: 'Impossibile estrarre userId dal token'
        });
      }

      const deleted = UserCredentials.delete(userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Credenziali non trovate'
        });
      }

      console.log(`[AuthController] Credenziali eliminate per user: ${userId}`);
      logAuthSuccess({
        userId,
        method: 'delete-credentials',
        source: 'Credentials Deletion'
      });

      res.status(200).json({
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
