const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const dotenv = require('dotenv');

// Load backend local env first, then fallback to project root env.
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Set fallback JWT secret if not found in .env
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'StylesByShahid-Super-Secret-Key-2025-Development-Mode';
  console.log('⚠️  Using fallback JWT_SECRET');
}

// Import database adapter
const DatabaseAdapter = require('./models/DatabaseAdapter');

// Import routes
const authRoutes = require('./routes/auth');
const presentationRoutes = require('./routes/presentations');
const templateRoutes = require('./routes/templates');
const uploadRoutes = require('./routes/upload');
const userRoutes = require('./routes/users');
const collaborationRoutes = require('./routes/collaboration');
const pptGeneratorRoutes = require('./routes/ppt-generator');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const isVercel = Boolean(process.env.VERCEL);

let server = null;
let io = {
  emit: () => {},
  on: () => {},
  to: () => ({ emit: () => {} })
};

if (!isVercel) {
  server = http.createServer(app);
  io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:8080",
      methods: ["GET", "POST"]
    }
  });
}

// Make io accessible to routes
app.set('io', io);

// Trust proxy for rate limiter
app.set('trust proxy', 1);

// Security middleware with custom CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:5000", "ws://localhost:5000", "https://api.github.com"]
    }
  }
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  skip: (req, res) => process.env.NODE_ENV === 'development'
});
app.use('/api', limiter);

// CORS configuration
const corsOrigin = process.env.CLIENT_URL || (isVercel ? true : "http://localhost:8080");
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Favicon handler
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Serve frontend static files from parent directory
app.use(express.static('../'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stylesbyhahid', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 3000,
  connectTimeoutMS: 3000
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  DatabaseAdapter.init();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('⚠️  Server will continue running without database connection');
  console.log('📝 Using demo mode - authentication is mocked');
  DatabaseAdapter.init();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/presentations', presentationRoutes);
app.use('/api/ppt-generator', pptGeneratorRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/collaboration', authMiddleware, collaborationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'StylesByShahid API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.io for real-time collaboration (disabled on Vercel serverless)
if (!isVercel) {
  io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);

    // Join presentation room
    socket.on('join-presentation', (presentationId) => {
      socket.join(presentationId);
      console.log(`User ${socket.id} joined presentation ${presentationId}`);
      socket.to(presentationId).emit('user-joined', socket.id);
    });

    // Handle real-time slide updates
    socket.on('slide-update', (data) => {
      socket.to(data.presentationId).emit('slide-updated', data);
    });

    // Handle cursor movements for collaboration
    socket.on('cursor-move', (data) => {
      socket.to(data.presentationId).emit('cursor-moved', {
        userId: socket.id,
        position: data.position
      });
    });

    // Handle comments
    socket.on('new-comment', (data) => {
      socket.to(data.presentationId).emit('comment-added', data);
    });

    socket.on('disconnect', () => {
      console.log('👤 User disconnected:', socket.id);
    });
  });
}

// Error handling middleware (must be last)
app.use(errorHandler);

// Serve index.html for any non-API routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile('../index.html', { root: __dirname });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

if (!isVercel) {
  const PORT = process.env.PORT || 5000;

  server.listen(PORT, () => {
    console.log(`🚀 StylesByShahid Backend running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = { app, io };