/**
 * Input Validation and Sanitization Utilities
 *
 * Provides functions for validating and sanitizing user input
 * to prevent injection attacks and ensure data integrity
 */

/**
 * Email validation regex
 * Matches standard email format: user@domain.com
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * URL validation regex
 * Matches http/https URLs
 */
const URL_REGEX = /^https?:\/\/.+/i;

/**
 * Alphanumeric with underscore/dash only
 * Useful for usernames, identifiers
 */
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmed = email.trim();

  // Check length (max per RFC 5321 is 254)
  if (trimmed.length > 254 || trimmed.length < 5) {
    return false;
  }

  // Check format
  if (!EMAIL_REGEX.test(trimmed)) {
    return false;
  }

  // Split and validate parts
  const [localPart, domain] = trimmed.split('@');

  // Local part: max 64 chars
  if (localPart.length > 64) {
    return false;
  }

  // Domain must have at least one dot and valid TLD
  if (!domain.includes('.')) {
    return false;
  }

  const tld = domain.split('.').pop();
  if (tld.length < 2 || tld.length > 6) {
    return false;
  }

  return true;
}

/**
 * Validates array of emails
 * @param {string|string[]} emails - Single email or array of emails
 * @returns {boolean} True if all emails are valid
 */
function isValidEmailArray(emails) {
  if (!emails) {
    return false;
  }

  const emailArray = Array.isArray(emails) ? emails : [emails];

  return emailArray.every(email => isValidEmail(email));
}

/**
 * Validates email subject
 * @param {string} subject - Subject line
 * @returns {boolean} True if valid (1-998 chars)
 */
function isValidSubject(subject) {
  if (!subject || typeof subject !== 'string') {
    return false;
  }

  const trimmed = subject.trim();
  const length = trimmed.length;

  // Subject must be 1-998 characters per RFC 5322
  return length > 0 && length <= 998;
}

/**
 * Validates email body
 * @param {string|object} body - Email body (text or JSON)
 * @returns {boolean} True if valid
 */
function isValidBody(body) {
  if (!body) {
    return false;
  }

  if (typeof body === 'string') {
    return body.trim().length > 0;
  }

  // If object, must be serializable to JSON
  if (typeof body === 'object') {
    try {
      JSON.stringify(body);
      return true;
    } catch (e) {
      return false;
    }
  }

  return false;
}

/**
 * Sanitizes string input - removes potential XSS vectors
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Escapes HTML special characters
 * @param {string} input - String to escape
 * @returns {string} Escaped string safe for HTML
 */
function escapeHtml(input) {
  if (typeof input !== 'string') {
    return '';
  }

  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };

  return input.replace(/[&<>"'\/]/g, char => escapeMap[char]);
}

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid HTTP(S) URL
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  if (!URL_REGEX.test(url)) {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {object} { isValid, score, feedback }
 */
function validatePasswordStrength(password) {
  const result = {
    isValid: false,
    score: 0,
    feedback: []
  };

  if (!password || typeof password !== 'string') {
    result.feedback.push('Password must be a non-empty string');
    return result;
  }

  // Minimum length
  if (password.length < 8) {
    result.feedback.push('Password must be at least 8 characters');
  } else {
    result.score += 1;
  }

  // Maximum length (prevent DoS)
  if (password.length > 128) {
    result.feedback.push('Password must not exceed 128 characters');
    return result;
  } else if (password.length >= 12) {
    result.score += 1;
  }

  // Lowercase letters
  if (/[a-z]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Password should contain lowercase letters');
  }

  // Uppercase letters
  if (/[A-Z]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Password should contain uppercase letters');
  }

  // Numbers
  if (/[0-9]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Password should contain numbers');
  }

  // Special characters
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Password should contain special characters');
  }

  // Check for common weak patterns
  const weakPatterns = [
    /(.)\1{2,}/, // Same char repeated 3+ times
    /^123|password|admin|letmein/i, // Common passwords
  ];

  if (weakPatterns.some(pattern => pattern.test(password))) {
    result.feedback.push('Password contains common patterns');
    result.score = Math.max(0, result.score - 2);
  }

  // Score: 0-2 = weak, 3-4 = fair, 5-6 = good, 7+ = strong
  result.isValid = result.score >= 3 && result.feedback.length === 0;

  return result;
}

/**
 * Validates port number
 * @param {number|string} port - Port to validate
 * @returns {boolean} True if valid port (1-65535)
 */
function isValidPort(port) {
  const portNum = parseInt(port, 10);
  return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
}

/**
 * Sanitizes object properties for logging (remove sensitive data)
 * @param {object} obj - Object to sanitize
 * @param {string[]} sensitiveKeys - Keys to redact
 * @returns {object} Sanitized object
 */
function sanitizeForLogging(obj, sensitiveKeys = ['password', 'secret', 'token', 'key']) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };

  sensitiveKeys.forEach(key => {
    if (sanitized[key]) {
      sanitized[key] = '***REDACTED***';
    }
  });

  return sanitized;
}

/**
 * Validates SMTP host
 * @param {string} host - SMTP host to validate
 * @returns {boolean} True if valid hostname
 */
function isValidSmtpHost(host) {
  if (!host || typeof host !== 'string') {
    return false;
  }

  const trimmed = host.trim();

  // Check length
  if (trimmed.length < 3 || trimmed.length > 255) {
    return false;
  }

  // Check format (domain or IP)
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

  return domainRegex.test(trimmed) || ipv4Regex.test(trimmed);
}

/**
 * Validates form data from POST request
 * @param {object} data - Form data object
 * @returns {object} { isValid, errors }
 */
function validateFormData(data) {
  const errors = {};

  // Validate email
  if (data.email && !isValidEmail(data.email)) {
    errors.email = 'Invalid email format';
  }

  // Validate password
  if (data.password) {
    const strength = validatePasswordStrength(data.password);
    if (!strength.isValid) {
      errors.password = strength.feedback.join(', ');
    }
  }

  // Validate SMTP host
  if (data.smtp_host && !isValidSmtpHost(data.smtp_host)) {
    errors.smtp_host = 'Invalid SMTP host';
  }

  // Validate SMTP port
  if (data.smtp_port && !isValidPort(data.smtp_port)) {
    errors.smtp_port = 'Invalid port number (1-65535)';
  }

  // Validate redirect URL
  if (data.backToUrl && !isValidUrl(data.backToUrl)) {
    errors.backToUrl = 'Invalid redirect URL';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  // Validation functions
  isValidEmail,
  isValidEmailArray,
  isValidSubject,
  isValidBody,
  isValidUrl,
  isValidPort,
  isValidSmtpHost,
  validatePasswordStrength,
  validateFormData,

  // Sanitization functions
  sanitizeString,
  escapeHtml,
  sanitizeForLogging,

  // Constants
  EMAIL_REGEX,
  URL_REGEX,
  ALPHANUMERIC_REGEX
};
