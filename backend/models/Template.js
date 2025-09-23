const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
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
  category: {
    type: String,
    enum: ['business', 'education', 'marketing', 'creative', 'minimal', 'corporate', 'startup'],
    required: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  previewImages: [String],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  theme: {
    primaryColor: { type: String, required: true },
    secondaryColor: { type: String, required: true },
    backgroundColor: { type: String, required: true },
    textColor: { type: String, required: true },
    accentColor: { type: String, required: true },
    fontFamily: { type: String, required: true },
    headingFont: { type: String, required: true },
    bodyFont: { type: String, required: true }
  },
  slideLayouts: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['title', 'content', 'two-column', 'image', 'blank', 'title-content', 'comparison', 'timeline'],
      required: true
    },
    thumbnail: String,
    elements: [{
      type: {
        type: String,
        enum: ['text', 'image', 'shape', 'placeholder'],
        required: true
      },
      position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true }
      },
      properties: {
        type: Object,
        default: {}
      },
      content: mongoose.Schema.Types.Mixed
    }],
    background: {
      type: {
        type: String,
        enum: ['color', 'gradient', 'image', 'pattern'],
        default: 'color'
      },
      value: String
    }
  }],
  samplePresentation: {
    title: String,
    slides: [{
      title: String,
      layout: String,
      content: Object,
      elements: [Object]
    }]
  },
  usage: {
    downloads: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    presentations: { type: Number, default: 0 }
  },
  tags: [String],
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  featured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Indexes
templateSchema.index({ category: 1, isPublic: 1, status: 1 });
templateSchema.index({ isPremium: 1 });
templateSchema.index({ featured: 1 });
templateSchema.index({ tags: 1 });
templateSchema.index({ 'usage.downloads': -1 });
templateSchema.index({ 'rating.average': -1 });

// Methods
templateSchema.methods.addReview = function(userId, rating, comment) {
  // Remove existing review from same user
  this.reviews = this.reviews.filter(
    review => review.user.toString() !== userId.toString()
  );

  // Add new review
  this.reviews.push({ user: userId, rating, comment });

  // Recalculate rating
  this.calculateRating();
  
  return this.save();
};

templateSchema.methods.calculateRating = function() {
  if (this.reviews.length === 0) {
    this.rating.average = 0;
    this.rating.count = 0;
    return;
  }

  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  this.rating.average = Math.round((sum / this.reviews.length) * 10) / 10;
  this.rating.count = this.reviews.length;
};

templateSchema.methods.incrementDownloads = function() {
  this.usage.downloads += 1;
  return this.save();
};

templateSchema.methods.incrementLikes = function() {
  this.usage.likes += 1;
  return this.save();
};

templateSchema.methods.incrementUsage = function() {
  this.usage.presentations += 1;
  return this.save();
};

// Static methods
templateSchema.statics.getPublicTemplates = function(filters = {}) {
  const query = { isPublic: true, status: 'published' };
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.isPremium !== undefined) {
    query.isPremium = filters.isPremium;
  }
  
  if (filters.featured) {
    query.featured = true;
  }

  let sort = {};
  switch (filters.sortBy) {
    case 'popular':
      sort = { 'usage.downloads': -1 };
      break;
    case 'rating':
      sort = { 'rating.average': -1 };
      break;
    case 'newest':
      sort = { createdAt: -1 };
      break;
    default:
      sort = { createdAt: -1 };
  }

  return this.find(query)
    .populate('creator', 'username firstName lastName')
    .sort(sort);
};

templateSchema.statics.getFeaturedTemplates = function(limit = 6) {
  return this.find({ featured: true, isPublic: true, status: 'published' })
    .populate('creator', 'username firstName lastName')
    .sort({ 'usage.downloads': -1 })
    .limit(limit);
};

templateSchema.statics.searchTemplates = function(searchTerm, filters = {}) {
  const query = {
    isPublic: true,
    status: 'published',
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  };

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.isPremium !== undefined) {
    query.isPremium = filters.isPremium;
  }

  return this.find(query)
    .populate('creator', 'username firstName lastName')
    .sort({ 'rating.average': -1, 'usage.downloads': -1 });
};

module.exports = mongoose.model('Template', templateSchema);