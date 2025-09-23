const express = require('express');
const User = require('../models/User');
const Presentation = require('../models/Presentation');

const router = express.Router();

// @route   GET /api/users/profile/:id
// @desc    Get user profile
// @access  Public
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -email');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's public presentations
    const presentations = await Presentation.find({
      owner: user._id,
      isPublic: true,
      status: 'published'
    })
      .select('title description thumbnail views likes createdAt')
      .sort({ createdAt: -1 })
      .limit(6);

    // Get user stats
    const stats = {
      totalPresentations: await Presentation.countDocuments({ owner: user._id }),
      publicPresentations: await Presentation.countDocuments({ 
        owner: user._id, 
        isPublic: true, 
        status: 'published' 
      }),
      totalViews: await Presentation.aggregate([
        { $match: { owner: user._id } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ]).then(result => result[0]?.totalViews || 0),
      totalLikes: await Presentation.aggregate([
        { $match: { owner: user._id } },
        { $group: { _id: null, totalLikes: { $sum: { $size: '$likes' } } } }
      ]).then(result => result[0]?.totalLikes || 0)
    };

    res.json({
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt
      },
      presentations,
      stats
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/search
// @desc    Search users
// @access  Private
router.get('/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } }
      ]
    })
      .select('username firstName lastName avatar')
      .limit(parseInt(limit));

    res.json({ users });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', async (req, res) => {
  try {
    // Get recent presentations
    const recentPresentations = await Presentation.find({
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id }
      ]
    })
      .populate('owner', 'username firstName lastName avatar')
      .populate('lastEditedBy', 'username firstName lastName')
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('-slides.elements');

    // Get user statistics
    const stats = {
      totalPresentations: await Presentation.countDocuments({ owner: req.user._id }),
      draftPresentations: await Presentation.countDocuments({ 
        owner: req.user._id, 
        status: 'draft' 
      }),
      publishedPresentations: await Presentation.countDocuments({ 
        owner: req.user._id, 
        status: 'published' 
      }),
      collaborations: await Presentation.countDocuments({ 
        'collaborators.user': req.user._id 
      }),
      totalViews: await Presentation.aggregate([
        { $match: { owner: req.user._id } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ]).then(result => result[0]?.totalViews || 0),
      totalLikes: await Presentation.aggregate([
        { $match: { owner: req.user._id } },
        { $group: { _id: null, totalLikes: { $sum: { $size: '$likes' } } } }
      ]).then(result => result[0]?.totalLikes || 0)
    };

    // Get recent activity (presentations with recent updates)
    const recentActivity = await Presentation.find({
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id }
      ],
      updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    })
      .populate('owner', 'username firstName lastName')
      .populate('lastEditedBy', 'username firstName lastName')
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('title updatedAt lastEditedBy owner');

    res.json({
      recentPresentations,
      stats,
      recentActivity,
      user: {
        id: req.user._id,
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        avatar: req.user.avatar,
        role: req.user.role,
        subscription: req.user.subscription,
        preferences: req.user.preferences
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/activity
// @desc    Get user activity feed
// @access  Private
router.get('/activity', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Get presentations the user owns or collaborates on
    const presentations = await Presentation.find({
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id }
      ]
    })
      .populate('owner', 'username firstName lastName avatar')
      .populate('lastEditedBy', 'username firstName lastName avatar')
      .populate('comments.user', 'username firstName lastName avatar')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('title updatedAt lastEditedBy owner comments createdAt status');

    // Format activity feed
    const activities = [];

    presentations.forEach(presentation => {
      // Add presentation creation activity
      activities.push({
        type: 'presentation_created',
        presentation: {
          id: presentation._id,
          title: presentation.title
        },
        user: presentation.owner,
        timestamp: presentation.createdAt,
        description: `Created presentation "${presentation.title}"`
      });

      // Add recent comments
      presentation.comments.forEach(comment => {
        activities.push({
          type: 'comment_added',
          presentation: {
            id: presentation._id,
            title: presentation.title
          },
          user: comment.user,
          timestamp: comment.createdAt,
          description: `Commented on "${presentation.title}"`,
          content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : '')
        });
      });

      // Add edit activity if different from creation
      if (presentation.lastEditedBy && 
          presentation.lastEditedBy._id.toString() !== presentation.owner._id.toString()) {
        activities.push({
          type: 'presentation_edited',
          presentation: {
            id: presentation._id,
            title: presentation.title
          },
          user: presentation.lastEditedBy,
          timestamp: presentation.updatedAt,
          description: `Edited presentation "${presentation.title}"`
        });
      }
    });

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Paginate activities
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedActivities = activities.slice(startIndex, endIndex);

    res.json({
      activities: paginatedActivities,
      totalPages: Math.ceil(activities.length / limit),
      currentPage: parseInt(page),
      total: activities.length
    });

  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;