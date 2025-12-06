require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');  // ✅ Security headers
const path = require('path');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { authLogger } = require('./middleware/authLogger');
const verifyMonday = require('./middleware/verifyMonday');
const verifyClientSecret = require('./middleware/verifyClientSecret');
const { emailLimiter, authorizationLimiter, apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const customFieldRoutes = require('./routes/customFieldRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet({  // ✅ Security headers
  strictTransportSecurity: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://monday.com',  // ✅ Restrict to Monday.com only
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(authLogger);

// ===== HTTPS ENFORCEMENT =====
// In production, redirect all HTTP requests to HTTPS
// x-forwarded-proto header is set by reverse proxy (Vercel, etc.)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Check if request is HTTPS (either direct TLS or x-forwarded-proto header)
    const isHttps =
      req.secure ||  // Direct HTTPS connection
      req.header('x-forwarded-proto') === 'https' ||  // Behind reverse proxy
      process.env.DEPLOYMENT_ENVIRONMENT === 'monday'; // Monday.com deployment

    if (!isHttps) {
      // Redirect to HTTPS with 308 (Permanent Redirect, preserves method)
      const host = req.header('host') || req.hostname;
      return res.redirect(308, `https://${host}${req.originalUrl}`);
    }
    next();
  });
}

// ===== DOMAIN VERIFICATION FOR MONDAY.COM =====
// Serve .well-known directory for domain ownership verification
// This allows Monday.com to verify app ownership via monday-app-association.json
app.use('/.well-known', express.static(path.join(__dirname, '.well-known'), {
  setHeaders: (res, filePath) => {
    // Ensure correct MIME type for JSON files
    if (filePath.endsWith('.json')) {
      res.set('Content-Type', 'application/json');
    }
    // Allow public access without authentication
    res.set('Cache-Control', 'public, max-age=3600');
  }
}));

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint (no rate limiting)
app.get('/', (req, res) => {
  res.send('OK');
});

// Test endpoint (no rate limiting)
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint works' });
});

// Apply rate limiting to authentication endpoints
app.use('/monday/authorize', authorizationLimiter);
app.use('/monday/save-credentials', authorizationLimiter);
app.use('/monday/getUserCredentials', apiLimiter);
app.use('/monday/deleteUserCredentials', apiLimiter);

// Apply rate limiting to email endpoints
app.use('/monday/sendEmail', emailLimiter);
app.use('/monday/testSMTP', apiLimiter);

// Register routes
app.use('/', authRoutes);
app.use('/', emailRoutes);
app.use('/', customFieldRoutes);

// Protected API Routes with Monday SIGNING_SECRET
app.get('/api/monday/test', verifyMonday, (req, res) => {
  res.status(200).json({
    message: 'Monday API test successful',
    userData: {
      userId: req.monday.userId,
      accountId: req.monday.accountId
    }
  });
});

// Protected API Routes with CLIENT_SECRET
app.get('/api/auth/test', verifyClientSecret, (req, res) => {
  res.status(200).json({
    message: 'Auth API test successful',
    userData: {
      userId: req.monday.userId,
      clientId: req.monday.clientId
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Rate limiting enabled for:');
  console.log('  - Email sending: 100 emails/hour per user');
  console.log('  - Authorization: 10 attempts/15 minutes per user');
  console.log('  - General API: 60 requests/minute per user');
  console.log('Press Ctrl+C to stop the server');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;
