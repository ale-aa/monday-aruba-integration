const jwt = require('jsonwebtoken');

/**
 * Verifica e decodifica un JWT token usando SIGNING_SECRET
 * @param {string} token - Il token JWT da verificare
 * @param {string} signingSecret - Il segreto di firma (MONDAY_SIGNING_SECRET)
 * @returns {Object} Payload decodificato del token
 * @throws {Error} Se il token è invalido o la verifica fallisce
 */
function verifyJWT(token, signingSecret) {
  if (!token) {
    throw new Error('Token mancante');
  }

  if (!signingSecret) {
    throw new Error('MONDAY_SIGNING_SECRET non configurato');
  }

  try {
    console.log('[JWT Utils] Verifying token...');
    const decoded = jwt.verify(token, signingSecret);
    console.log('[JWT Utils] ✓ Token verified successfully');
    return decoded;
  } catch (error) {
    console.error('[JWT Utils] JWT verification failed:', error.message);
    throw error;
  }
}

module.exports = {
  verifyJWT
};
