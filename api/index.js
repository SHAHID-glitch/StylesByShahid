let app = null;
let startupError = null;

try {
  ({ app } = require('../backend/server'));
} catch (error) {
  startupError = error;
  console.error('❌ API bootstrap failure:', error);
}

module.exports = (req, res) => {
  if (startupError || !app) {
    return res.status(500).json({
      message: 'API bootstrap failed',
      error: startupError ? startupError.message : 'Unknown startup failure'
    });
  }

  return app(req, res);
};
