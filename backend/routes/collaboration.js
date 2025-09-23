const express = require('express');
const Joi = require('joi');
const Presentation = require('../models/Presentation');

const router = express.Router();

// Validation schemas
const addCollaboratorSchema = Joi.object({
  userId: Joi.string().required(),
  permission: Joi.string().valid('view', 'comment', 'edit').required()
});

const updateCollaboratorSchema = Joi.object({
  permission: Joi.string().valid('view', 'comment', 'edit').required()
});

const addCommentSchema = Joi.object({
  content: Joi.string().max(1000).required(),
  slideIndex: Joi.number().optional(),
  position: Joi.object({
    x: Joi.number().required(),
    y: Joi.number().required()
  }).optional()
});

const replyCommentSchema = Joi.object({
  content: Joi.string().max(1000).required()
});

// @route   POST /api/presentations/:id/collaborators
// @desc    Add a collaborator to presentation
// @access  Private (Owner only)
router.post('/:id/collaborators', async (req, res) => {
  try {
    const { error } = addCollaboratorSchema.validate(req.body);
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

    // Only owner can add collaborators
    if (presentation.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can add collaborators' });
    }

    const { userId, permission } = req.body;

    // Check if user exists
    const User = require('../models/User');
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Can't add owner as collaborator
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot add yourself as collaborator' });
    }

    await presentation.addCollaborator(userId, permission);
    await presentation.populate('collaborators.user', 'username firstName lastName avatar');

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit('collaboration-invite', {
        presentationId: presentation._id,
        presentationTitle: presentation.title,
        invitedBy: {
          id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          username: req.user.username
        },
        permission
      });
    }

    res.status(201).json({
      message: 'Collaborator added successfully',
      collaborators: presentation.collaborators
    });

  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/presentations/:id/collaborators/:userId
// @desc    Update collaborator permissions
// @access  Private (Owner only)
router.put('/:id/collaborators/:userId', async (req, res) => {
  try {
    const { error } = updateCollaboratorSchema.validate(req.body);
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

    // Only owner can update collaborator permissions
    if (presentation.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can update collaborator permissions' });
    }

    const { permission } = req.body;
    const collaborator = presentation.collaborators.find(
      collab => collab.user.toString() === req.params.userId
    );

    if (!collaborator) {
      return res.status(404).json({ message: 'Collaborator not found' });
    }

    collaborator.permission = permission;
    await presentation.save();

    await presentation.populate('collaborators.user', 'username firstName lastName avatar');

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.userId).emit('collaboration-updated', {
        presentationId: presentation._id,
        presentationTitle: presentation.title,
        newPermission: permission,
        updatedBy: {
          id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`
        }
      });
    }

    res.json({
      message: 'Collaborator permissions updated successfully',
      collaborators: presentation.collaborators
    });

  } catch (error) {
    console.error('Update collaborator error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/presentations/:id/collaborators/:userId
// @desc    Remove a collaborator
// @access  Private (Owner only)
router.delete('/:id/collaborators/:userId', async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);

    if (!presentation) {
      return res.status(404).json({ message: 'Presentation not found' });
    }

    // Only owner can remove collaborators
    if (presentation.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can remove collaborators' });
    }

    await presentation.removeCollaborator(req.params.userId);

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.userId).emit('collaboration-removed', {
        presentationId: presentation._id,
        presentationTitle: presentation.title,
        removedBy: {
          id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`
        }
      });
    }

    res.json({ message: 'Collaborator removed successfully' });

  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/presentations/:id/collaborators
// @desc    Get presentation collaborators
// @access  Private (Owner and collaborators)
router.get('/:id/collaborators', async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id)
      .populate('collaborators.user', 'username firstName lastName avatar')
      .populate('owner', 'username firstName lastName avatar');

    if (!presentation) {
      return res.status(404).json({ message: 'Presentation not found' });
    }

    // Check access permissions
    const isOwner = presentation.owner._id.toString() === req.user._id.toString();
    const isCollaborator = presentation.collaborators.some(
      collab => collab.user._id.toString() === req.user._id.toString()
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      owner: presentation.owner,
      collaborators: presentation.collaborators
    });

  } catch (error) {
    console.error('Get collaborators error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/presentations/:id/comments
// @desc    Add a comment to presentation
// @access  Private (Owner, collaborators, and public if allowed)
router.post('/:id/comments', async (req, res) => {
  try {
    const { error } = addCommentSchema.validate(req.body);
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

    // Check access permissions
    const isOwner = presentation.owner.toString() === req.user._id.toString();
    const collaborator = presentation.collaborators.find(
      collab => collab.user.toString() === req.user._id.toString()
    );
    const canComment = collaborator && (collaborator.permission === 'comment' || collaborator.permission === 'edit');
    const isPublicAndCommentsAllowed = presentation.isPublic && presentation.settings.allowComments;

    if (!isOwner && !canComment && !isPublicAndCommentsAllowed) {
      return res.status(403).json({ message: 'Comment access denied' });
    }

    const { content, slideIndex, position } = req.body;

    const newComment = {
      user: req.user._id,
      content,
      slideIndex,
      position
    };

    presentation.comments.push(newComment);
    await presentation.save();

    await presentation.populate('comments.user', 'username firstName lastName avatar');
    const addedComment = presentation.comments[presentation.comments.length - 1];

    // Emit real-time notification to all collaborators and owner
    const io = req.app.get('io');
    if (io) {
      const notificationData = {
        presentationId: presentation._id,
        comment: addedComment,
        commentedBy: {
          id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          username: req.user.username
        }
      };

      // Notify owner
      if (!isOwner) {
        io.to(presentation.owner.toString()).emit('new-comment', notificationData);
      }

      // Notify collaborators
      presentation.collaborators.forEach(collab => {
        if (collab.user.toString() !== req.user._id.toString()) {
          io.to(collab.user.toString()).emit('new-comment', notificationData);
        }
      });

      // Emit to presentation room for real-time collaboration
      io.to(presentation._id.toString()).emit('comment-added', addedComment);
    }

    res.status(201).json({
      message: 'Comment added successfully',
      comment: addedComment
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/presentations/:id/comments/:commentId/reply
// @desc    Reply to a comment
// @access  Private (Owner, collaborators, and public if allowed)
router.post('/:id/comments/:commentId/reply', async (req, res) => {
  try {
    const { error } = replyCommentSchema.validate(req.body);
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

    // Check access permissions (same as commenting)
    const isOwner = presentation.owner.toString() === req.user._id.toString();
    const collaborator = presentation.collaborators.find(
      collab => collab.user.toString() === req.user._id.toString()
    );
    const canComment = collaborator && (collaborator.permission === 'comment' || collaborator.permission === 'edit');
    const isPublicAndCommentsAllowed = presentation.isPublic && presentation.settings.allowComments;

    if (!isOwner && !canComment && !isPublicAndCommentsAllowed) {
      return res.status(403).json({ message: 'Comment access denied' });
    }

    const comment = presentation.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const { content } = req.body;

    const reply = {
      user: req.user._id,
      content
    };

    comment.replies.push(reply);
    await presentation.save();

    await presentation.populate('comments.user', 'username firstName lastName avatar');
    await presentation.populate('comments.replies.user', 'username firstName lastName avatar');

    const updatedComment = presentation.comments.id(req.params.commentId);
    const addedReply = updatedComment.replies[updatedComment.replies.length - 1];

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(presentation._id.toString()).emit('comment-reply-added', {
        commentId: req.params.commentId,
        reply: addedReply
      });
    }

    res.status(201).json({
      message: 'Reply added successfully',
      reply: addedReply
    });

  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/presentations/:id/comments/:commentId/resolve
// @desc    Resolve a comment
// @access  Private (Owner and edit collaborators)
router.put('/:id/comments/:commentId/resolve', async (req, res) => {
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
      return res.status(403).json({ message: 'Resolve access denied' });
    }

    const comment = presentation.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    comment.resolved = !comment.resolved;
    await presentation.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(presentation._id.toString()).emit('comment-resolved', {
        commentId: req.params.commentId,
        resolved: comment.resolved,
        resolvedBy: {
          id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`
        }
      });
    }

    res.json({
      message: `Comment ${comment.resolved ? 'resolved' : 'reopened'} successfully`,
      resolved: comment.resolved
    });

  } catch (error) {
    console.error('Resolve comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/presentations/:id/comments/:commentId
// @desc    Delete a comment
// @access  Private (Owner and comment author)
router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);

    if (!presentation) {
      return res.status(404).json({ message: 'Presentation not found' });
    }

    const comment = presentation.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check permissions (owner or comment author)
    const isOwner = presentation.owner.toString() === req.user._id.toString();
    const isCommentAuthor = comment.user.toString() === req.user._id.toString();

    if (!isOwner && !isCommentAuthor) {
      return res.status(403).json({ message: 'Delete access denied' });
    }

    comment.remove();
    await presentation.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(presentation._id.toString()).emit('comment-deleted', {
        commentId: req.params.commentId
      });
    }

    res.json({ message: 'Comment deleted successfully' });

  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/presentations/:id/comments
// @desc    Get presentation comments
// @access  Private (Owner, collaborators) or Public (if public presentation)
router.get('/:id/comments', async (req, res) => {
  try {
    const { page = 1, limit = 20, slideIndex, resolved } = req.query;

    const presentation = await Presentation.findById(req.params.id)
      .populate('comments.user', 'username firstName lastName avatar')
      .populate('comments.replies.user', 'username firstName lastName avatar');

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

    // Filter comments
    let comments = presentation.comments;

    if (slideIndex !== undefined) {
      comments = comments.filter(comment => comment.slideIndex === parseInt(slideIndex));
    }

    if (resolved !== undefined) {
      comments = comments.filter(comment => comment.resolved === (resolved === 'true'));
    }

    // Sort by newest first
    comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedComments = comments.slice(startIndex, endIndex);

    res.json({
      comments: paginatedComments,
      totalPages: Math.ceil(comments.length / limit),
      currentPage: parseInt(page),
      total: comments.length
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;