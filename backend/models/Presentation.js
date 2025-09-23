const mongoose = require('mongoose');

const slideSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Untitled Slide'
  },
  content: {
    type: Object,
    default: {}
  },
  layout: {
    type: String,
    enum: ['title', 'content', 'two-column', 'image', 'blank', 'title-content'],
    default: 'blank'
  },
  background: {
    type: {
      type: String,
      enum: ['color', 'gradient', 'image'],
      default: 'color'
    },
    value: {
      type: String,
      default: '#ffffff'
    }
  },
  elements: [{
    id: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['text', 'image', 'shape', 'chart', 'video', 'audio'],
      required: true 
    },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      width: { type: Number, default: 100 },
      height: { type: Number, default: 50 }
    },
    properties: {
      type: Object,
      default: {}
    },
    content: {
      type: mongoose.Schema.Types.Mixed
    },
    zIndex: { type: Number, default: 1 },
    locked: { type: Boolean, default: false },
    visible: { type: Boolean, default: true }
  }],
  transitions: {
    type: String,
    enum: ['none', 'fade', 'slide', 'zoom', 'flip'],
    default: 'none'
  },
  duration: {
    type: Number,
    default: 0 // 0 means manual advance
  },
  notes: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

const presentationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  slides: [slideSchema],
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    default: null
  },
  theme: {
    primaryColor: { type: String, default: '#4a6cf7' },
    secondaryColor: { type: String, default: '#c3cfe2' },
    backgroundColor: { type: String, default: '#ffffff' },
    textColor: { type: String, default: '#333333' },
    fontFamily: { type: String, default: 'Segoe UI' },
    fontSize: { type: Number, default: 16 }
  },
  settings: {
    aspectRatio: {
      type: String,
      enum: ['16:9', '4:3', '16:10'],
      default: '16:9'
    },
    autoPlay: { type: Boolean, default: false },
    loop: { type: Boolean, default: false },
    showControls: { type: Boolean, default: true },
    allowComments: { type: Boolean, default: true },
    publicView: { type: Boolean, default: false }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  shareUrl: {
    type: String,
    unique: true,
    sparse: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['view', 'comment', 'edit'],
      default: 'view'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  category: {
    type: String,
    enum: ['business', 'education', 'marketing', 'personal', 'other'],
    default: 'other'
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    slideIndex: {
      type: Number,
      default: null
    },
    position: {
      x: Number,
      y: Number
    },
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true,
        maxlength: 1000
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    resolved: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: Number,
    default: 1
  },
  exportSettings: {
    lastExportFormat: {
      type: String,
      enum: ['pdf', 'pptx', 'html', 'video'],
      default: null
    },
    lastExportDate: Date
  }
}, {
  timestamps: true
});

// Generate unique share URL
presentationSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('isPublic')) {
    if (this.isPublic && !this.shareUrl) {
      this.shareUrl = require('crypto').randomBytes(16).toString('hex');
    } else if (!this.isPublic) {
      this.shareUrl = undefined;
    }
  }
  next();
});

// Indexes for better query performance
presentationSchema.index({ owner: 1, createdAt: -1 });
presentationSchema.index({ shareUrl: 1 });
presentationSchema.index({ status: 1, isPublic: 1 });
presentationSchema.index({ tags: 1 });
presentationSchema.index({ 'collaborators.user': 1 });

// Virtual for slide count
presentationSchema.virtual('slideCount').get(function() {
  return this.slides.length;
});

// Virtual for like count
presentationSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
presentationSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Methods
presentationSchema.methods.addCollaborator = function(userId, permission = 'view') {
  const existingCollaborator = this.collaborators.find(
    collab => collab.user.toString() === userId.toString()
  );

  if (existingCollaborator) {
    existingCollaborator.permission = permission;
  } else {
    this.collaborators.push({ user: userId, permission });
  }

  return this.save();
};

presentationSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(
    collab => collab.user.toString() !== userId.toString()
  );
  return this.save();
};

presentationSchema.methods.addLike = function(userId) {
  const existingLike = this.likes.find(
    like => like.user.toString() === userId.toString()
  );

  if (!existingLike) {
    this.likes.push({ user: userId });
    return this.save();
  }
  return this;
};

presentationSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(
    like => like.user.toString() !== userId.toString()
  );
  return this.save();
};

presentationSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Static methods
presentationSchema.statics.getPublicPresentations = function(page = 1, limit = 10) {
  return this.find({ isPublic: true, status: 'published' })
    .populate('owner', 'username firstName lastName avatar')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

module.exports = mongoose.model('Presentation', presentationSchema);