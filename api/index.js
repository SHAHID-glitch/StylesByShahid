let app = null;
let startupError = null;

try {
  ({ app } = require('../backend/server'));
} catch (error) {
  startupError = error;
  console.error('❌ CRITICAL API bootstrap failure:', error);
  console.error('Stack:', error.stack);
  console.error('Error type:', error.constructor.name);
  console.error('Module resolution issue detected - check backend dependencies');
  
  // Export a fallback app that reports the error
  const express = require('express');
  app = express();
  
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(503).json({
      message: 'API initializing - please retry',
      error: error.message,
      type: error.constructor.name
    });
  });
  
  // Catch-all for other routes
  app.use((req, res) => {
    res.status(503).json({
      message: 'API bootstrap failed',
      error: error.message,
      type: error.constructor.name,
      details: 'Check that all backend dependencies are installed'
    });
  });
}

// Vercel serverless handler - must be a function
module.exports = (req, res) => {
  if (!app) {
    return res.status(500).json({ 
      message: 'API not initialized',
      error: 'Express app failed to initialize'
    });
  }
  return app(req, res);
};
