/**
 * Database Adapter - Provides a unified interface for both MongoDB and Demo Database
 */

const User = require('../models/User');
const DemoDatabase = require('../models/DemoDatabase');

class DatabaseAdapter {
  constructor() {
    this.useDemo = false;
  }

  async init() {
    try {
      // Try to test the connection by counting users
      await User.countDocuments({});
      this.useDemo = false;
      console.log('📦 Using MongoDB for database operations');
    } catch (error) {
      // Fall back to demo database
      this.useDemo = true;
      console.log('🎮 MongoDB unavailable - using demo database for authentication');
    }
  }

  async findUserByEmail(email) {
    if (this.useDemo) {
      return DemoDatabase.findUserByEmail(email);
    }
    return User.findOne({ email });
  }

  async findUserById(id) {
    if (this.useDemo) {
      return DemoDatabase.findUserById(id);
    }
    return User.findById(id);
  }

  async createUser(userData) {
    if (this.useDemo) {
      return DemoDatabase.createUser(userData);
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: userData.email }, { username: userData.username }]
    });

    if (existingUser) {
      const error = new Error(
        existingUser.email === userData.email ? 'Email already registered' : 'Username already taken'
      );
      error.status = 400;
      throw error;
    }

    const user = new User(userData);
    await user.save();
    return user;
  }

  async comparePassword(candidatePassword, savedPassword) {
    if (this.useDemo) {
      return DemoDatabase.comparePassword(candidatePassword, savedPassword);
    }
    // In actual Mongoose User model, this would be a method on the document
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(candidatePassword, savedPassword);
  }

  generateAuthToken(userId) {
    if (this.useDemo) {
      return DemoDatabase.generateAuthToken(userId);
    }
    return User.generateAuthToken ? User.generateAuthToken(userId) : this.createJWT(userId);
  }

  createJWT(userId) {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'StylesByShahid-Super-Secret-Key-2025-Development-Mode';
    return jwt.sign({ id: userId }, secret, { expiresIn: '7d' });
  }

  getUserResponse(user) {
    if (this.useDemo || !user.toObject) {
      return DemoDatabase.getUserResponse(user);
    }
    const userObj = user.toObject();
    const { password, ...userWithoutPassword } = userObj;
    return userWithoutPassword;
  }
}

module.exports = new DatabaseAdapter();
