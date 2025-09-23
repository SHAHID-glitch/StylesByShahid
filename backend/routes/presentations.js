const express = require('express');
const Joi = require('joi');
const Presentation = require('../models/Presentation');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const createPresentationSchema = Joi.object({
  title: Joi.string().max(100).required(),
  description: Joi.string().max(500).optional(),
  template: Joi.string().optional(),
  isPublic: Joi.boolean().optional()
});

const updatePresentationSchema = Joi.object({
  title: Joi.string().max(100).optional(),
  description: Joi.string().max(500).optional(),
  isPublic: Joi.boolean().optional(),
  status: Joi.string().valid('draft', 'published', 'archived').optional(),
  theme: Joi.object().optional(),
  settings: Joi.object().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  category: Joi.string().valid('business', 'education', 'marketing', 'personal', 'other').optional()
});

const slideSchema = Joi.object({
  title: Joi.string().optional(),
  content: Joi.object().optional(),
  layout: Joi.string().valid('title', 'content', 'two-column', 'image', 'blank', 'title-content').optional(),
  background: Joi.object().optional(),
  elements: Joi.array().optional(),
  transitions: Joi.string().valid('none', 'fade', 'slide', 'zoom', 'flip').optional(),
  duration: Joi.number().optional(),
  notes: Joi.string().optional(),
  order: Joi.number().required()
});

// @route   GET /api/presentations
// @desc    Get user's presentations
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;

    // Build query
    let query = { 
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id }
      ]
    };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$and = [
        query.$and || {},
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
          ]
        }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const presentations = await Presentation.find(query)
      .populate('owner', 'username firstName lastName avatar')
      .populate('collaborators.user', 'username firstName lastName avatar')
      .populate('lastEditedBy', 'username firstName lastName')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-slides.elements'); // Exclude heavy slide elements for list view

    const total = await Presentation.countDocuments(query);

    res.json({
      presentations,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Get presentations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/presentations/public
// @desc    Get public presentations
// @access  Public
router.get('/public', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, sortBy = 'views' } = req.query;

    const presentations = await Presentation.getPublicPresentations(page, limit);
    
    res.json({ presentations });

  } catch (error) {
    console.error('Get public presentations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/presentations
// @desc    Create a new presentation
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { error } = createPresentationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.details[0].message 
      });
    }

    const presentationData = {
      ...req.body,
      owner: req.user._id,
      lastEditedBy: req.user._id,
      slides: [{
        title: 'Welcome Slide',
        layout: 'title',
        order: 0,
        elements: []
      }]
    };

    const presentation = new Presentation(presentationData);
    await presentation.save();

    await presentation.populate('owner', 'username firstName lastName avatar');

    res.status(201).json({
      message: 'Presentation created successfully',
      presentation
    });

  } catch (error) {
    console.error('Create presentation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/presentations/:id
// @desc    Get a specific presentation
// @access  Private/Public (based on sharing)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    let presentation;
    
    // Check if ID is a share URL
    if (id.length === 32) {
      presentation = await Presentation.findOne({ shareUrl: id });
    } else {
      presentation = await Presentation.findById(id);
    }

    if (!presentation) {
      return res.status(404).json({ message: 'Presentation not found' });
    }

    // Check access permissions
    const isOwner = req.user && presentation.owner.toString() === req.user._id.toString();
    const isCollaborator = req.user && presentation.collaborators.some(
      collab => collab.user.toString() === req.user._id.toString()
    );
    const isPublic = presentation.isPublic;

    if (!isOwner && !isCollaborator && !isPublic) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Increment views for public presentations or when viewed by non-owners
    if ((isPublic && !isOwner) || (!isOwner && !isCollaborator)) {
      await presentation.incrementViews();
    }

    await presentation.populate([
      { path: 'owner', select: 'username firstName lastName avatar' },
      { path: 'collaborators.user', select: 'username firstName lastName avatar' },
      { path: 'lastEditedBy', select: 'username firstName lastName' },
      { path: 'comments.user', select: 'username firstName lastName avatar' },
      { path: 'comments.replies.user', select: 'username firstName lastName avatar' },
      { path: 'template', select: 'name thumbnail theme' }
    ]);

    res.json({ presentation });

  } catch (error) {
    console.error('Get presentation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/presentations/:id
// @desc    Update a presentation
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { error } = updatePresentationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.details[0].message 
      });
    }

    const presentation = await Presentation.findById(req.params.id);

    if (!presentation) {
      return res.status(404).json({ message: 'Presentation not found' });
    }

    // Check permissions
    const isOwner = presentation.owner.toString() === req.user._id.toString();
    const hasEditAccess = presentation.collaborators.some(
      collab => collab.user.toString() === req.user._id.toString() && collab.permission === 'edit'
    );

    if (!isOwner && !hasEditAccess) {
      return res.status(403).json({ message: 'Edit access denied' });
    }

    // Update presentation
    Object.assign(presentation, req.body);
    presentation.lastEditedBy = req.user._id;
    presentation.version += 1;

    await presentation.save();
    await presentation.populate('owner', 'username firstName lastName avatar');

    res.json({
      message: 'Presentation updated successfully',
      presentation
    });

  } catch (error) {
    console.error('Update presentation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/presentations/:id
// @desc    Delete a presentation
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);

    if (!presentation) {
      return res.status(404).json({ message: 'Presentation not found' });
    }

    // Only owner can delete
    if (presentation.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can delete presentation' });
    }

    await Presentation.findByIdAndDelete(req.params.id);

    res.json({ message: 'Presentation deleted successfully' });

  } catch (error) {
    console.error('Delete presentation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/presentations/:id/duplicate
// @desc    Duplicate a presentation
// @access  Private
router.post('/:id/duplicate', async (req, res) => {
  try {
    const original = await Presentation.findById(req.params.id);

    if (!original) {
      return res.status(404).json({ message: 'Presentation not found' });
    }

    // Check access permissions
    const isOwner = original.owner.toString() === req.user._id.toString();
    const hasAccess = original.collaborators.some(
      collab => collab.user.toString() === req.user._id.toString()
    );
    const isPublic = original.isPublic;

    if (!isOwner && !hasAccess && !isPublic) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create duplicate
    const duplicateData = original.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    delete duplicateData.shareUrl;
    delete duplicateData.views;
    delete duplicateData.likes;
    delete duplicateData.comments;

    duplicateData.title = `${original.title} (Copy)`;
    duplicateData.owner = req.user._id;
    duplicateData.lastEditedBy = req.user._id;
    duplicateData.collaborators = [];
    duplicateData.isPublic = false;
    duplicateData.status = 'draft';
    duplicateData.version = 1;

    const duplicate = new Presentation(duplicateData);
    await duplicate.save();

    await duplicate.populate('owner', 'username firstName lastName avatar');

    res.status(201).json({
      message: 'Presentation duplicated successfully',
      presentation: duplicate
    });

  } catch (error) {
    console.error('Duplicate presentation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/presentations/:id/slides
// @desc    Add a new slide
// @access  Private
router.post('/:id/slides', async (req, res) => {
  try {
    const { error } = slideSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.details[0].message 
      });
    }

    const presentation = await Presentation.findById(req.params.id);

    if (!presentation) {
      return res.status(404).json({ message: 'Presentation not found' });
    }

    // Check permissions
    const isOwner = presentation.owner.toString() === req.user._id.toString();
    const hasEditAccess = presentation.collaborators.some(
      collab => collab.user.toString() === req.user._id.toString() && collab.permission === 'edit'
    );

    if (!isOwner && !hasEditAccess) {
      return res.status(403).json({ message: 'Edit access denied' });
    }

    // Add slide
    const newSlide = {
      ...req.body,
      elements: req.body.elements || []
    };

    presentation.slides.push(newSlide);
    presentation.lastEditedBy = req.user._id;
    presentation.version += 1;

    await presentation.save();

    res.status(201).json({
      message: 'Slide added successfully',
      slide: presentation.slides[presentation.slides.length - 1]
    });

  } catch (error) {
    console.error('Add slide error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/presentations/:id/slides/:slideId
// @desc    Update a slide
// @access  Private
router.put('/:id/slides/:slideId', async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);

    if (!presentation) {
      return res.status(404).json({ message: 'Presentation not found' });
    }

    // Check permissions
    const isOwner = presentation.owner.toString() === req.user._id.toString();
    const hasEditAccess = presentation.collaborators.some(
      collab => collab.user.toString() === req.user._id.toString() && collab.permission === 'edit'
    );

    if (!isOwner && !hasEditAccess) {
      return res.status(403).json({ message: 'Edit access denied' });
    }

    // Find and update slide
    const slide = presentation.slides.id(req.params.slideId);
    if (!slide) {
      return res.status(404).json({ message: 'Slide not found' });
    }

    Object.assign(slide, req.body);
    presentation.lastEditedBy = req.user._id;
    presentation.version += 1;

    await presentation.save();

    res.json({
      message: 'Slide updated successfully',
      slide
    });

  } catch (error) {
    console.error('Update slide error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/presentations/:id/slides/:slideId
// @desc    Delete a slide
// @access  Private
router.delete('/:id/slides/:slideId', async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);

    if (!presentation) {
      return res.status(404).json({ message: 'Presentation not found' });
    }

    // Check permissions
    const isOwner = presentation.owner.toString() === req.user._id.toString();
    const hasEditAccess = presentation.collaborators.some(
      collab => collab.user.toString() === req.user._id.toString() && collab.permission === 'edit'
    );

    if (!isOwner && !hasEditAccess) {
      return res.status(403).json({ message: 'Edit access denied' });
    }

    // Remove slide
    presentation.slides.id(req.params.slideId).remove();
    presentation.lastEditedBy = req.user._id;
    presentation.version += 1;

    await presentation.save();

    res.json({ message: 'Slide deleted successfully' });

  } catch (error) {
    console.error('Delete slide error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/presentations/:id/like
// @desc    Like/Unlike a presentation
// @access  Private
router.post('/:id/like', async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);

    if (!presentation) {
      return res.status(404).json({ message: 'Presentation not found' });
    }

    const existingLike = presentation.likes.find(
      like => like.user.toString() === req.user._id.toString()
    );

    if (existingLike) {
      await presentation.removeLike(req.user._id);
      res.json({ message: 'Like removed', liked: false });
    } else {
      await presentation.addLike(req.user._id);
      res.json({ message: 'Presentation liked', liked: true });
    }

  } catch (error) {
    console.error('Like presentation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;