const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DatabaseAdapter = require('../models/DatabaseAdapter');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    // Extract token from "Bearer TOKEN"
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database adapter (handles both MongoDB and demo DB)
    const user = await DatabaseAdapter.findUserById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found, authorization denied' });
    }

    // Add user to request object
    req.user = {
      id: user._id || user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error in authentication' });
  }
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (user) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Premium user middleware
const premiumAccess = (req, res, next) => {
  if (!req.user || (req.user.role !== 'premium' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Premium subscription required' });
  }
  next();
};

module.exports = {
  authMiddleware,
  optionalAuth,
  adminOnly,
  premiumAccess
};