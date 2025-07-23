const express = require('express');
const multer = require('multer');
const path = require('path');
const podcastController = require('../controllers/podcastController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const {
  validatePodcastCreation,
  validatePodcastUpdate,
  validateObjectId,
  validatePagination
} = require('../middleware/validation');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/podcasts/temp/');
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for audio files only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /mp3|wav|ogg|m4a|aac/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 1
  },
  fileFilter: fileFilter
});

/**
 * @route   GET /api/podcasts/popular
 * @desc    Get popular podcasts
 * @access  Public
 */
router.get('/popular', podcastController.getPopularPodcasts);

/**
 * @route   GET /api/podcasts/recent
 * @desc    Get recent podcasts
 * @access  Public
 */
router.get('/recent', podcastController.getRecentPodcasts);

/**
 * @route   GET /api/podcasts/my-podcasts
 * @desc    Get current user's podcasts
 * @access  Private (Admin only)
 */
router.get('/my-podcasts', authenticate, authorize('admin'), validatePagination, podcastController.getMyPodcasts);

/**
 * @route   GET /api/podcasts
 * @desc    Get all podcasts with pagination and filtering
 * @access  Public
 */
router.get('/', validatePagination, podcastController.getAllPodcasts);

/**
 * @route   GET /api/podcasts/:id
 * @desc    Get single podcast by ID
 * @access  Public (but may require auth for unpublished podcasts)
 */
router.get('/:id', validateObjectId, optionalAuth, podcastController.getPodcast);

/**
 * @route   POST /api/podcasts
 * @desc    Create new podcast
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  upload.single('audio'),
  validatePodcastCreation,
  podcastController.createPodcast
);

/**
 * @route   PUT /api/podcasts/:id
 * @desc    Update podcast
 * @access  Private (Admin or owner)
 */
router.put(
  '/:id',
  authenticate,
  validateObjectId,
  validatePodcastUpdate,
  podcastController.updatePodcast
);

/**
 * @route   DELETE /api/podcasts/:id
 * @desc    Delete podcast
 * @access  Private (Admin or owner)
 */
router.delete(
  '/:id',
  authenticate,
  validateObjectId,
  podcastController.deletePodcast
);

/**
 * @route   POST /api/podcasts/:id/play
 * @desc    Increment podcast play count
 * @access  Public
 */
router.post('/:id/play', validateObjectId, podcastController.playPodcast);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 100MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file allowed.'
      });
    }
  }
  next(error);
});

module.exports = router;
