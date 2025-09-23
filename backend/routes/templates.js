const express = require('express');
const Joi = require('joi');
const Template = require('../models/Template');
const { authMiddleware, optionalAuth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const createTemplateSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().max(500).optional(),
  category: Joi.string().valid('business', 'education', 'marketing', 'creative', 'minimal', 'corporate', 'startup').required(),
  thumbnail: Joi.string().required(),
  previewImages: Joi.array().items(Joi.string()).optional(),
  isPremium: Joi.boolean().optional(),
  theme: Joi.object({
    primaryColor: Joi.string().required(),
    secondaryColor: Joi.string().required(),
    backgroundColor: Joi.string().required(),
    textColor: Joi.string().required(),
    accentColor: Joi.string().required(),
    fontFamily: Joi.string().required(),
    headingFont: Joi.string().required(),
    bodyFont: Joi.string().required()
  }).required(),
  slideLayouts: Joi.array().items(Joi.object()).optional(),
  samplePresentation: Joi.object().optional(),
  tags: Joi.array().items(Joi.string()).optional()
});

const reviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().max(500).optional()
});

// @route   GET /api/templates
// @desc    Get public templates with filters
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      isPremium, 
      featured, 
      search, 
      sortBy = 'newest' 
    } = req.query;

    let templates;

    if (search) {
      templates = await Template.searchTemplates(search, { 
        category, 
        isPremium: isPremium ? isPremium === 'true' : undefined 
      });
    } else {
      templates = await Template.getPublicTemplates({ 
        category, 
        isPremium: isPremium ? isPremium === 'true' : undefined, 
        featured: featured === 'true',
        sortBy 
      });
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedTemplates = templates.slice(startIndex, endIndex);

    // Check if user has premium access
    const userHasPremium = req.user && (req.user.role === 'premium' || req.user.role === 'admin');

    // Filter out premium templates for non-premium users
    const filteredTemplates = paginatedTemplates.filter(template => {
      return !template.isPremium || userHasPremium;
    });

    res.json({
      templates: filteredTemplates,
      totalPages: Math.ceil(templates.length / limit),
      currentPage: parseInt(page),
      total: templates.length,
      hasMore: endIndex < templates.length
    });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/templates/featured
// @desc    Get featured templates
// @access  Public
router.get('/featured', optionalAuth, async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const templates = await Template.getFeaturedTemplates(parseInt(limit));
    
    // Check if user has premium access
    const userHasPremium = req.user && (req.user.role === 'premium' || req.user.role === 'admin');

    // Filter out premium templates for non-premium users
    const filteredTemplates = templates.filter(template => {
      return !template.isPremium || userHasPremium;
    });

    res.json({ templates: filteredTemplates });

  } catch (error) {
    console.error('Get featured templates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/templates/categories
// @desc    Get template categories with counts
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Template.aggregate([
      { $match: { isPublic: true, status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const formattedCategories = categories.map(cat => ({
      name: cat._id,
      count: cat.count,
      displayName: cat._id.charAt(0).toUpperCase() + cat._id.slice(1)
    }));

    res.json({ categories: formattedCategories });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/templates/:id
// @desc    Get a specific template
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id)
      .populate('creator', 'username firstName lastName avatar')
      .populate('reviews.user', 'username firstName lastName avatar');

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (!template.isPublic && template.status !== 'published') {
      return res.status(404).json({ message: 'Template not available' });
    }

    // Check if user has access to premium template
    const userHasPremium = req.user && (req.user.role === 'premium' || req.user.role === 'admin');
    const isCreator = req.user && template.creator._id.toString() === req.user._id.toString();

    if (template.isPremium && !userHasPremium && !isCreator) {
      return res.status(403).json({ 
        message: 'Premium subscription required',
        isPremium: true 
      });
    }

    res.json({ template });

  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/templates
// @desc    Create a new template (Admin only)
// @access  Private (Admin)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { error } = createTemplateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.details[0].message 
      });
    }

    const templateData = {
      ...req.body,
      creator: req.user._id
    };

    const template = new Template(templateData);
    await template.save();

    await template.populate('creator', 'username firstName lastName avatar');

    res.status(201).json({
      message: 'Template created successfully',
      template
    });

  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/templates/:id
// @desc    Update a template (Admin only)
// @access  Private (Admin)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    Object.assign(template, req.body);
    await template.save();

    await template.populate('creator', 'username firstName lastName avatar');

    res.json({
      message: 'Template updated successfully',
      template
    });

  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/templates/:id
// @desc    Delete a template (Admin only)
// @access  Private (Admin)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    await Template.findByIdAndDelete(req.params.id);

    res.json({ message: 'Template deleted successfully' });

  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/templates/:id/use
// @desc    Record template usage (for analytics)
// @access  Private
router.post('/:id/use', authMiddleware, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Check if user has access to premium template
    const userHasPremium = req.user.role === 'premium' || req.user.role === 'admin';
    
    if (template.isPremium && !userHasPremium) {
      return res.status(403).json({ 
        message: 'Premium subscription required',
        isPremium: true 
      });
    }

    await template.incrementDownloads();
    await template.incrementUsage();

    res.json({ 
      message: 'Template usage recorded',
      template: {
        id: template._id,
        name: template.name,
        theme: template.theme,
        slideLayouts: template.slideLayouts
      }
    });

  } catch (error) {
    console.error('Record template usage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/templates/:id/review
// @desc    Add a review to a template
// @access  Private
router.post('/:id/review', authMiddleware, async (req, res) => {
  try {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.details[0].message 
      });
    }

    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const { rating, comment } = req.body;

    await template.addReview(req.user._id, rating, comment);
    await template.populate('reviews.user', 'username firstName lastName avatar');

    res.status(201).json({
      message: 'Review added successfully',
      review: template.reviews[template.reviews.length - 1],
      newRating: template.rating
    });

  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/templates/:id/reviews
// @desc    Get template reviews
// @access  Public
router.get('/:id/reviews', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const template = await Template.findById(req.params.id)
      .populate('reviews.user', 'username firstName lastName avatar')
      .select('reviews rating');

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Sort reviews by newest first
    template.reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedReviews = template.reviews.slice(startIndex, endIndex);

    res.json({
      reviews: paginatedReviews,
      totalPages: Math.ceil(template.reviews.length / limit),
      currentPage: parseInt(page),
      total: template.reviews.length,
      rating: template.rating
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/templates/:id/like
// @desc    Like a template (increment likes)
// @access  Private
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    await template.incrementLikes();

    res.json({ 
      message: 'Template liked',
      likes: template.usage.likes
    });

  } catch (error) {
    console.error('Like template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/templates/user/:userId
// @desc    Get templates created by a specific user
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;

    const templates = await Template.find({ 
      creator: req.params.userId, 
      isPublic: true, 
      status: 'published' 
    })
      .populate('creator', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Template.countDocuments({ 
      creator: req.params.userId, 
      isPublic: true, 
      status: 'published' 
    });

    res.json({
      templates,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Get user templates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;