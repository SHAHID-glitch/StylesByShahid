const express = require('express');
const Presentation = require('../models/Presentation');
const Template = require('../models/Template');
const DatabaseAdapter = require('../models/DatabaseAdapter');
const DemoDatabase = require('../models/DemoDatabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// @route GET /api/dashboard
// @desc  Get simple dashboard summary for current user
// @access Private
router.get('/', async (req, res) => {
  try {
    console.log('[/api/dashboard] headers:', {
      authorization: req.header('Authorization')
    });
    console.log('[/api/dashboard] req.user:', req.user);

    if (!req.user) {
      return res.status(401).json({ message: 'No authenticated user present on request (req.user missing)' });
    }
    // Support demo DB fallback
    if (DatabaseAdapter.useDemo) {
      const userId = req.user.id || req.user._id;
      const presentations = await DemoDatabase.getPresentationsByUser(userId);
      const templates = await DemoDatabase.getTemplates();

      return res.json({
        user: {
          id: req.user.id || req.user._id,
          username: req.user.username,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email,
          role: req.user.role
        },
        presentationsCount: presentations.length,
        templatesCount: templates.length,
        recentPresentations: presentations.slice(0, 5)
      });
    }

    // Real DB
    const ownerId = req.user.id || req.user._id;
    const presentationsCount = await Presentation.countDocuments({ owner: ownerId });
    const templatesCount = await Template.countDocuments({});
    const recentPresentations = await Presentation.find({ owner: ownerId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title updatedAt status');

    res.json({
      user: {
        id: ownerId,
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        role: req.user.role
      },
      presentationsCount,
      templatesCount,
      recentPresentations
    });
  } catch (error) {
    console.error('Dashboard route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
