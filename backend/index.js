// Load environment variables from .env if present
try { require('dotenv').config(); } catch (_) {}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logInfo } = require('./utils/logger');
const { requestIdMiddleware } = require('./utils/requestId');

const { ingestionAgent } = require('./agents/ingestionAgent');
const { analysisAgent } = require('./agents/analysisAgent');
const { advisoryAgent } = require('./agents/advisoryAgent');
const { httpClient } = require('./utils/httpClient');
const { validateAnalyzePayload } = require('./validations/inputValidation');

const analyzeCheckin = require('./cloudFunctions/analyzeCheckin');
const processReport = require('./cloudFunctions/processReport');
const chatWithGemini = require('./cloudFunctions/chatWithGemini');
const findNearbyAmbulance = require('./cloudFunctions/findNearbyAmbulance');
const submitFeedback = require('./cloudFunctions/submitFeedback');

const app = express();
app.set('trust proxy', true);
// CORS must be before any route-specific middlewares to ensure preflight success
const { ALLOWED_ORIGINS, DEV_ALLOW_ALL_CORS, AI_SERVICE_URL } = require('./config/config');
const corsOptions = {
  origin: DEV_ALLOW_ALL_CORS ? true : (origin, callback) => {
    // Allow requests without origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    // Allow explicit whitelist from config
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Allow any localhost/127.0.0.1 with any port in dev
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    // normalize custom header casing
    'x-user-id',
    'X-User-Id'
  ],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Security headers
// Helmet with CSP allowing Firebase Auth endpoints
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: [
        "'self'"
      ],
      // Use camelCase directive names per Helmet API
      connectSrc: [
        "'self'",
        'https://identitytoolkit.googleapis.com',
        'https://securetoken.googleapis.com',
        'https://www.googleapis.com',
        'https://firebase.googleapis.com',
        'https://oauth2.googleapis.com',
        'https://oauthaccountmanager.googleapis.com',
        'https://accounts.google.com',
        'https://firebaseinstallations.googleapis.com',
        'https://www.gstatic.com',
        'https://www.google-analytics.com',
        'https://firestore.googleapis.com',
        'https://firebasestorage.googleapis.com',
        'https://apis.google.com',
        'http://localhost:8080'
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://apis.google.com',
        'https://www.googletagmanager.com',
        'https://www.google.com',
        'https://www.recaptcha.net',
        'https://www.gstatic.com',
        'https://www.google-analytics.com'
      ],
      // Some browsers differentiate element-specific script sources
      scriptSrcElem: [
        "'self'",
        "'unsafe-inline'",
        'https://apis.google.com',
        'https://www.googletagmanager.com',
        'https://www.google.com',
        'https://www.recaptcha.net',
        'https://www.gstatic.com',
        'https://www.google-analytics.com'
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://www.gstatic.com',
      ],
      imgSrc: [
        "'self'",
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://www.google.com',
        'https://www.gstatic.com',
        'https://lh3.googleusercontent.com',
        'data:'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'data:'
      ],
      frameSrc: [
        "'self'",
        'https://apis.google.com',
        'https://accounts.google.com',
        'https://agentic-hackthon.firebaseapp.com',
        'https://*.firebaseapp.com',
        'https://www.google.com',
        'https://www.recaptcha.net',
        'https://www.gstatic.com'
      ],
      // Some user agents still honor childSrc over frameSrc
      childSrc: [
        "'self'",
        'https://apis.google.com',
        'https://accounts.google.com',
        'https://agentic-hackthon.firebaseapp.com',
        'https://*.firebaseapp.com',
        'https://www.google.com',
        'https://www.recaptcha.net',
        'https://www.gstatic.com'
      ],
      connectSrc: [
        "'self'",
        'https://identitytoolkit.googleapis.com',
        'https://securetoken.googleapis.com',
        'https://www.googleapis.com',
        'https://firebase.googleapis.com',
        'https://oauth2.googleapis.com',
        'https://oauthaccountmanager.googleapis.com',
        'https://accounts.google.com',
        'https://firebaseinstallations.googleapis.com',
        'https://www.gstatic.com',
        'https://www.google-analytics.com',
        'https://firestore.googleapis.com',
        'https://firebasestorage.googleapis.com',
        'https://apis.google.com',
        'https://recaptcha.google.com',
        'https://www.google.com',
        'https://www.recaptcha.net',
        'http://localhost:8080'
      ],
      objectSrc: [
        "'none'"
      ],
      workerSrc: [
        "'self'",
        'blob:'
      ],
    },
  },
}));
// Basic rate limiting for API and functions
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use(['/api', '/functions'], limiter);
app.use(express.json({ limit: '1mb' }));
// Request ID and basic request logging
app.use(requestIdMiddleware);
app.use((req, _res, next) => {
  logInfo('request', { id: req.id, method: req.method, path: req.path, ip: req.ip });
  next();
});
const { requireAuth } = require('./middleware/authMiddleware');

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const validation = validateAnalyzePayload(req.body);
    if (!validation.ok) {
      return res.status(400).json({ success: false, error: validation.error });
    }
    const usePython = AI_SERVICE_URL;
    if (usePython) {
      const { data } = await httpClient.post(`${usePython.replace(/\/$/, '')}/analyze`, req.body || {});
      const advisory = await advisoryAgent(data);
      return res.json({ success: true, data: advisory });
    }

    const normalized = await ingestionAgent(req.body || {});
    const result = await analysisAgent(normalized);
    const advisory = await advisoryAgent(result);
    // Optionally persist advisory for auditing if user context is available
    try {
      const { saveAnalysis } = require('./services/firebaseService');
      const userId = (req.user && req.user.uid) || 'anonymous';
      await saveAnalysis(userId, { input: req.body || {}, result: advisory });
    } catch (_) {}
    res.json({ success: true, data: advisory });
  } catch (err) {
    // Basic error response; production should use centralized error middleware
    res.status(500).json({ success: false, error: err?.message || 'Unknown error' });
  }
});

// Cloud function style endpoints
app.post('/functions/analyzeCheckin', requireAuth, analyzeCheckin);
app.post('/functions/processReport', requireAuth, processReport);
app.post('/functions/chat', requireAuth, chatWithGemini);
app.get('/functions/findNearbyAmbulance', findNearbyAmbulance);
app.post('/functions/submitFeedback', requireAuth, submitFeedback);

// Serve frontend build in production for a single combined app
try {
  const path = require('path');
  const fs = require('fs');
  const distPath = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(distPath)) {
    const expressStatic = express.static(distPath);
    app.use(expressStatic);
    app.get('*', (req, res, next) => {
      // Avoid intercepting API routes
      if (req.path.startsWith('/api') || req.path.startsWith('/functions') || req.path.startsWith('/health')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
} catch (_) {}

const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

const { PORT: CONFIG_PORT } = require('./config/config');
const BASE_PORT = Number(CONFIG_PORT || 8080);
function tryListen(port, attemptsLeft) {
  const server = app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} in use, retrying on ${nextPort}...`);
      setTimeout(() => tryListen(nextPort, attemptsLeft - 1), 250);
    } else if (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });
}

// Graceful shutdown
let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  logInfo('shutdown', { signal });
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

if (require.main === module) {
  tryListen(BASE_PORT, 5);
}

module.exports = { app };


