/**
 * Demo Database - In-memory storage for demo mode
 * Used when MongoDB is not available
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class DemoDatabase {
  constructor() {
    this.users = new Map();
    this.presentations = new Map();
    this.templates = new Map();
    this.isAvailable = true;
  }

  // User operations
  async createUser(userData) {
    const id = crypto.randomUUID();
    
    // Check if user already exists
    const existingUser = Array.from(this.users.values()).find(
      u => u.email === userData.email || u.username === userData.username
    );
    
    if (existingUser) {
      const error = new Error(
        existingUser.email === userData.email ? 'Email already registered' : 'Username already taken'
      );
      error.status = 400;
      throw error;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const user = {
      _id: id,
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      avatar: null,
      role: 'user',
      isEmailVerified: false,
      lastLoginDate: null,
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          collaboration: true
        }
      },
      subscription: {
        plan: 'free',
        isActive: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(id, user);
    return this.getUserResponse(user);
  }

  async findUserByEmail(email) {
    const user = Array.from(this.users.values()).find(u => u.email === email);
    return user || null;
  }

  async findUserById(id) {
    const user = this.users.get(id);
    return user || null;
  }

  async comparePassword(candidatePassword, savedPassword) {
    return bcrypt.compare(candidatePassword, savedPassword);
  }

  generateAuthToken(userId) {
    const secret = process.env.JWT_SECRET || 'StylesByShahid-Super-Secret-Key-2025-Development-Mode';
    return jwt.sign({ id: userId }, secret, { expiresIn: '7d' });
  }

  getUserResponse(user) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Presentation operations
  async createPresentation(data) {
    const id = crypto.randomUUID();
    const presentation = {
      _id: id,
      title: data.title,
      description: data.description || '',
      ownerId: data.ownerId,
      template: data.template || null,
      slides: data.slides || [],
      collaborators: [],
      isPublic: data.isPublic || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.presentations.set(id, presentation);
    return presentation;
  }

  async getPresentationsByUser(userId) {
    return Array.from(this.presentations.values()).filter(p => p.ownerId === userId);
  }

  // Template operations
  async getTemplates() {
    return Array.from(this.templates.values());
  }
}

module.exports = new DemoDatabase();
