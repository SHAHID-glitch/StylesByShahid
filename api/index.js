let app = null;
let startupError = null;

try {
  ({ app } = require('../backend/server'));
} catch (error) {
  startupError = error;
  console.error('❌ CRITICAL API bootstrap failure:', error);
  console.error('Stack:', error.stack);
  
  // Export a fallback app that reports the error
  const express = require('express');
  app = express();
  app.use((req, res) => {
    res.status(500).json({
      message: 'API bootstrap failed',
      error: error.message,
      type: error.constructor.name
    });
  });
}

module.exports = app;
