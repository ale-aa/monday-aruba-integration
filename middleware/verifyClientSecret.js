const jwt = require('jsonwebtoken');

/**
 * Middleware per verificare JWT di Monday.com usando CLIENT_SECRET
 *
 * Questo middleware è usato per validare token ricevuti durante
 * il flusso di autorizzazione OAuth/autenticazione
 *
 * Token atteso nell'header: Authorization: Bearer <token>
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyClientSecret = (req, res, next) => {
  try {
    // Estrai il token dall'header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.warn(`[Monday ClientSecret Auth] Token mancante - ${req.method} ${req.path}`);
      return res.status(401).json({
        error: 'Token non fornito',
        message: 'Authorization header mancante'
      });
    }

    // Estrai il token dal formato "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.warn(`[Monday ClientSecret Auth] Formato token invalido - ${req.method} ${req.path}`);
      return res.status(401).json({
        error: 'Formato token invalido',
        message: 'Expected: Authorization: Bearer <token>'
      });
    }

    const token = parts[1];
    const clientSecret = process.env.MONDAY_CLIENT_SECRET;

    if (!clientSecret) {
      console.error('[Monday ClientSecret Auth] MONDAY_CLIENT_SECRET non configurato');
      return res.status(500).json({
        error: 'Configurazione server errata',
        message: 'MONDAY_CLIENT_SECRET non definito'
      });
    }

    // Verifica il JWT con CLIENT_SECRET
    const decoded = jwt.verify(token, clientSecret);

    // Log del successo
    console.log(`[Monday ClientSecret Auth] ✓ Token valido - User: ${decoded.userId || decoded.sub || 'unknown'}`);

    // Aggiungi i dati decodificati a req.monday
    req.monday = {
      userId: decoded.userId || decoded.sub,
      accountId: decoded.accountId,
      clientId: decoded.clientId,
      scope: decoded.scope,
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
      console.warn(`[Monday ClientSecret Auth] ✗ Token scaduto - ${req.method} ${req.path}`);
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Token non valido';
      console.warn(`[Monday ClientSecret Auth] ✗ Token non valido - ${req.method} ${req.path} - ${error.message}`);
    } else if (error.name === 'NotBeforeError') {
      statusCode = 401;
      message = 'Token non ancora valido';
      console.warn(`[Monday ClientSecret Auth] ✗ Token non ancora valido - ${req.method} ${req.path}`);
    } else {
      statusCode = 500;
      message = 'Errore interno nella validazione del token';
      console.error(`[Monday ClientSecret Auth] ✗ Errore inaspettato - ${error.message}`);
    }

    return res.status(statusCode).json({
      error: message,
      type: error.name
    });
  }
};

module.exports = verifyClientSecret;
