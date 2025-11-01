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
    // ===== DETAILED JWT LOGGING =====
    console.log('[VerifyMonday] ===== JWT VERIFICATION START =====');
    console.log('[VerifyMonday] Endpoint:', req.method, req.path);
    console.log('[VerifyMonday] Header Authorization:', req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'NOT PROVIDED');

    // Estrai il token dall'header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.warn(`[VerifyMonday] ✗ Token mancante - ${req.method} ${req.path}`);
      return res.status(401).json({
        error: 'Token non fornito',
        message: 'Authorization header mancante'
      });
    }

    // Estrai il token dal formato "Bearer <token>" oppure come token diretto
    let token;
    const parts = authHeader.split(' ');

    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
      console.log('[VerifyMonday] Token extracted from Bearer format');
    } else if (parts.length === 1) {
      // Supporta anche token senza 'Bearer '
      token = parts[0];
      console.log('[VerifyMonday] Token extracted directly (no Bearer prefix)');
    } else {
      console.warn(`[VerifyMonday] ✗ Formato token invalido - ${req.method} ${req.path}`);
      console.log('[VerifyMonday] Expected: Bearer <token> or just <token>');
      return res.status(401).json({
        error: 'Formato token invalido',
        message: 'Expected: Authorization: Bearer <token>'
      });
    }

    console.log('[VerifyMonday] Token substring:', token.substring(0, 20) + '...');

    const signingSecret = process.env.MONDAY_SIGNING_SECRET;
    console.log('[VerifyMonday] SIGNING_SECRET configured:', signingSecret ? 'YES' : 'NO');

    if (!signingSecret) {
      console.error('[Monday Auth] MONDAY_SIGNING_SECRET non configurato');
      return res.status(500).json({
        error: 'Configurazione server errata',
        message: 'MONDAY_SIGNING_SECRET non definito'
      });
    }

    // Verifica il JWT
    console.log('[VerifyMonday] Verifying JWT with SIGNING_SECRET...');
    let decoded;
    try {
      decoded = jwt.verify(token, signingSecret);
    } catch (jwtError) {
      console.error('[VerifyMonday] JWT verification failed:', jwtError.message);
      throw jwtError;
    }

    // Log del successo
    console.log(`[VerifyMonday] ✓ Token valido - User: ${decoded.userId || 'unknown'}, Account: ${decoded.accountId || 'unknown'}`);
    console.log('[VerifyMonday] Decoded payload:', JSON.stringify(decoded, null, 2));

    // Aggiungi i dati decodificati a req.monday
    req.monday = {
      userId: decoded.userId,
      accountId: decoded.accountId,
      shortLivedToken: decoded.shortLivedToken,
      payload: decoded
    };

    console.log('[VerifyMonday] ===== JWT VERIFICATION SUCCESS =====');
    next();

  } catch (error) {
    // Gestisci i diversi tipi di errore JWT
    let statusCode = 401;
    let message = 'Token non valido';

    console.error('[VerifyMonday] ===== JWT VERIFICATION FAILED =====');
    console.error('[VerifyMonday] Error name:', error.name);
    console.error('[VerifyMonday] Error message:', error.message);
    console.error('[VerifyMonday] Full error:', error);

    if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token scaduto';
      console.warn(`[VerifyMonday] ✗ Token scaduto - ${req.method} ${req.path}`);
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Token non valido';
      console.warn(`[VerifyMonday] ✗ Token non valido - ${req.method} ${req.path} - ${error.message}`);
    } else if (error.name === 'NotBeforeError') {
      statusCode = 401;
      message = 'Token non ancora valido';
      console.warn(`[VerifyMonday] ✗ Token non ancora valido - ${req.method} ${req.path}`);
    } else {
      statusCode = 500;
      message = 'Errore interno nella validazione del token';
      console.error(`[VerifyMonday] ✗ Errore inaspettato - ${error.message}`);
    }

    return res.status(statusCode).json({
      error: message,
      type: error.name,
      details: process.env.DEBUG_MODE === 'true' ? error.message : undefined
    });
  }
};

module.exports = verifyMonday;
