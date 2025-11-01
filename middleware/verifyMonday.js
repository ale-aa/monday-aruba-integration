const jwt = require('jsonwebtoken');

/**
 * Middleware per verificare JWT di Monday.com usando SIGNING_SECRET
 *
 * Questo middleware è usato per validare token ricevuti da webhook
 * e operazioni sincrone di Monday.com
 *
 * Token atteso nell'header: Authorization: Bearer <token>
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyMonday = (req, res, next) => {
  try {
    // Estrai il token dall'header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.warn(`[Monday Auth] Token mancante - ${req.method} ${req.path}`);
      return res.status(401).json({
        error: 'Token non fornito',
        message: 'Authorization header mancante'
      });
    }

    // Estrai il token dal formato "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.warn(`[Monday Auth] Formato token invalido - ${req.method} ${req.path}`);
      return res.status(401).json({
        error: 'Formato token invalido',
        message: 'Expected: Authorization: Bearer <token>'
      });
    }

    const token = parts[1];
    const signingSecret = process.env.MONDAY_SIGNING_SECRET;

    if (!signingSecret) {
      console.error('[Monday Auth] MONDAY_SIGNING_SECRET non configurato');
      return res.status(500).json({
        error: 'Configurazione server errata',
        message: 'MONDAY_SIGNING_SECRET non definito'
      });
    }

    // Verifica il JWT
    const decoded = jwt.verify(token, signingSecret);

    // Log del successo (senza mostrare il payload completo)
    console.log(`[Monday Auth] ✓ Token valido - User: ${decoded.userId || 'unknown'}, Account: ${decoded.accountId || 'unknown'}`);

    // Aggiungi i dati decodificati a req.monday
    req.monday = {
      userId: decoded.userId,
      accountId: decoded.accountId,
      shortLivedToken: decoded.shortLivedToken,
      payload: decoded
    };

    next();

  } catch (error) {
    // Gestisci i diversi tipi di errore JWT
    let statusCode = 401;
    let message = 'Token non valido';

    if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token scaduto';
      console.warn(`[Monday Auth] ✗ Token scaduto - ${req.method} ${req.path}`);
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Token non valido';
      console.warn(`[Monday Auth] ✗ Token non valido - ${req.method} ${req.path} - ${error.message}`);
    } else if (error.name === 'NotBeforeError') {
      statusCode = 401;
      message = 'Token non ancora valido';
      console.warn(`[Monday Auth] ✗ Token non ancora valido - ${req.method} ${req.path}`);
    } else {
      statusCode = 500;
      message = 'Errore interno nella validazione del token';
      console.error(`[Monday Auth] ✗ Errore inaspettato - ${error.message}`);
    }

    return res.status(statusCode).json({
      error: message,
      type: error.name
    });
  }
};

module.exports = verifyMonday;
