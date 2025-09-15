module.exports = {
  PORT: process.env.PORT || 8080,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || '',
  // Accept comma-separated list of origins, default to localhost dev (5173, 5174)
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map(s => s.trim())
  ,
  // When true, allow all CORS origins (development only)
  DEV_ALLOW_ALL_CORS: process.env.DEV_ALLOW_ALL_CORS === 'true'
};


