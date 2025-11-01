/**
 * Middleware per loggare le operazioni di autenticazione in modo sicuro
 * Nasconde i dati sensibili (token completi, secret, ecc.)
 */

/**
 * Sanitizza i token per il logging
 * @param {string} token - Token da sanitizzare
 * @returns {string} Token parzialmente mascherato
 */
const sanitizeToken = (token) => {
  if (!token || token.length < 20) {
    return '***';
  }
  const first = token.substring(0, 10);
  const last = token.substring(token.length - 10);
  return `${first}...${last}`;
};

/**
 * Middleware di logging per autenticazione
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authLogger = (req, res, next) => {
  // Cattura il token (se presente) senza salvarlo
  const authHeader = req.headers.authorization;
  const sanitized = authHeader ? sanitizeToken(authHeader) : 'nessuno';

  // Salva informazioni originali di response
  const originalJson = res.json;

  // Sovrascrivi il metodo json per loggare le risposte di autenticazione
  res.json = function (data) {
    // Log solo se è una risposta di errore di autenticazione o autorizzazione
    if (data.error && (res.statusCode === 401 || res.statusCode === 403)) {
      console.log(`[Auth Response] Status: ${res.statusCode}, Error: ${data.error}, Token: ${sanitized}`);
    }

    return originalJson.call(this, data);
  };

  // Log della richiesta entrante
  if (process.env.DEBUG_AUTH === 'true') {
    console.log(`[Auth Request] ${req.method} ${req.path} - Token: ${sanitized}`);
  }

  next();
};

/**
 * Utilità per loggare dettagli di autenticazione in modo sicuro
 * @param {string} context - Contesto del log
 * @param {Object} details - Dettagli da loggare
 */
const logAuthEvent = (context, details = {}) => {
  const safeDetails = {
    ...details,
    token: details.token ? sanitizeToken(details.token) : undefined,
    secret: details.secret ? '***' : undefined,
    password: details.password ? '***' : undefined
  };

  console.log(`[${context}]`, JSON.stringify(safeDetails, null, 2));
};

/**
 * Log di successo autenticazione
 * @param {Object} options - Opzioni log
 */
const logAuthSuccess = (options = {}) => {
  const { userId, accountId, method, source } = options;
  console.log(`[Auth Success] User: ${userId || 'unknown'}, Account: ${accountId || 'unknown'}, Method: ${method || 'unknown'}, Source: ${source || 'unknown'}`);
};

/**
 * Log di fallimento autenticazione
 * @param {Object} options - Opzioni log
 */
const logAuthFailure = (options = {}) => {
  const { reason, method, source, statusCode } = options;
  console.warn(`[Auth Failure] Reason: ${reason}, Method: ${method || 'unknown'}, Source: ${source || 'unknown'}, Status: ${statusCode || 401}`);
};

module.exports = {
  authLogger,
  sanitizeToken,
  logAuthEvent,
  logAuthSuccess,
  logAuthFailure
};
