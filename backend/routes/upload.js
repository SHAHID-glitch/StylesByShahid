const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Ensure upload directories exist
const uploadDirs = ['uploads/images', 'uploads/videos', 'uploads/audio', 'uploads/documents'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for different file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    if (file.mimetype.startsWith('image/')) {
      uploadPath += 'images/';
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath += 'videos/';
    } else if (file.mimetype.startsWith('audio/')) {
      uploadPath += 'audio/';
    } else {
      uploadPath += 'documents/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
  const allowedAudioTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg'];
  const allowedDocumentTypes = ['application/pdf', 'text/plain'];

  const allowedTypes = [
    ...allowedImageTypes,
    ...allowedVideoTypes,
    ...allowedAudioTypes,
    ...allowedDocumentTypes
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Maximum 5 files at once
  }
});

// Helper function to get file info
const getFileInfo = (file) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return {
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    url: `${baseUrl}/${file.path.replace(/\\/g, '/')}`,
    uploadedAt: new Date()
  };
};

// @route   POST /api/upload/image
// @desc    Upload single image
// @access  Private
router.post('/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const fileInfo = getFileInfo(req.file);
    
    res.json({
      message: 'Image uploaded successfully',
      file: fileInfo
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'Server error during image upload' });
  }
});

// @route   POST /api/upload/images
// @desc    Upload multiple images
// @access  Private
router.post('/images', upload.array('images', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }

    const files = req.files.map(file => getFileInfo(file));
    
    res.json({
      message: `${files.length} images uploaded successfully`,
      files
    });

  } catch (error) {
    console.error('Multiple images upload error:', error);
    res.status(500).json({ message: 'Server error during images upload' });
  }
});

// @route   POST /api/upload/video
// @desc    Upload single video
// @access  Private
router.post('/video', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided' });
    }

    const fileInfo = getFileInfo(req.file);
    
    res.json({
      message: 'Video uploaded successfully',
      file: fileInfo
    });

  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ message: 'Server error during video upload' });
  }
});

// @route   POST /api/upload/audio
// @desc    Upload single audio file
// @access  Private
router.post('/audio', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const fileInfo = getFileInfo(req.file);
    
    res.json({
      message: 'Audio uploaded successfully',
      file: fileInfo
    });

  } catch (error) {
    console.error('Audio upload error:', error);
    res.status(500).json({ message: 'Server error during audio upload' });
  }
});

// @route   POST /api/upload/document
// @desc    Upload document (PDF, text files)
// @access  Private
router.post('/document', upload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No document file provided' });
    }

    const fileInfo = getFileInfo(req.file);
    
    res.json({
      message: 'Document uploaded successfully',
      file: fileInfo
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ message: 'Server error during document upload' });
  }
});

// @route   POST /api/upload/mixed
// @desc    Upload mixed file types
// @access  Private
router.post('/mixed', upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    const files = req.files.map(file => getFileInfo(file));
    
    res.json({
      message: `${files.length} files uploaded successfully`,
      files
    });

  } catch (error) {
    console.error('Mixed files upload error:', error);
    res.status(500).json({ message: 'Server error during files upload' });
  }
});

// @route   DELETE /api/upload/:filename
// @desc    Delete uploaded file
// @access  Private
router.delete('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Find file in all upload directories
    const possiblePaths = [
      path.join('uploads/images', filename),
      path.join('uploads/videos', filename),
      path.join('uploads/audio', filename),
      path.join('uploads/documents', filename)
    ];

    let filePath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        filePath = possiblePath;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete file
    fs.unlinkSync(filePath);
    
    res.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ message: 'Server error during file deletion' });
  }
});

// @route   GET /api/upload/info/:filename
// @desc    Get file information
// @access  Private
router.get('/info/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Find file in all upload directories
    const possiblePaths = [
      { path: path.join('uploads/images', filename), type: 'image' },
      { path: path.join('uploads/videos', filename), type: 'video' },
      { path: path.join('uploads/audio', filename), type: 'audio' },
      { path: path.join('uploads/documents', filename), type: 'document' }
    ];

    let fileInfo = null;
    for (const { path: possiblePath, type } of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        const stats = fs.statSync(possiblePath);
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        
        fileInfo = {
          filename,
          type,
          size: stats.size,
          url: `${baseUrl}/${possiblePath.replace(/\\/g, '/')}`,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
        break;
      }
    }

    if (!fileInfo) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.json({ file: fileInfo });

  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({ message: 'Server error while getting file info' });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large', 
        maxSize: `${(parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1024 / 1024}MB` 
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum 5 files allowed.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected field name' });
    }
  }
  
  if (error.message.includes('File type')) {
    return res.status(400).json({ message: error.message });
  }

  console.error('Upload error:', error);
  res.status(500).json({ message: 'Server error during file upload' });
});

module.exports = router;