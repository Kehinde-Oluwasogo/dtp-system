const { validationResult } = require('express-validator');
const { Podcast } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

class PodcastController {
  /**
   * Get all podcasts
   * GET /api/podcasts
   */
  getAllPodcasts = asyncHandler(async (req, res, next) => {
    const {
      page = 1,
      limit = 10,
      sort = '-created_at',
      search,
      tags,
      uploader
    } = req.query;

    // Build query object
    const query = { is_published: true };

    // Add search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',');
      query.tags = { $in: tagArray };
    }

    // Filter by uploader
    if (uploader) {
      query.uploaded_by = uploader;
    }

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: {
        path: 'uploaded_by',
        select: 'full_name'
      }
    };

    const result = await Podcast.paginate(query, options);

    res.status(200).json({
      success: true,
      data: {
        podcasts: result.docs,
        pagination: {
          page: result.page,
          pages: result.totalPages,
          total: result.totalDocs,
          limit: result.limit,
          hasNext: result.hasNextPage,
          hasPrev: result.hasPrevPage
        }
      }
    });
  });

  /**
   * Get single podcast by ID
   * GET /api/podcasts/:id
   */
  getPodcast = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const podcast = await Podcast.findById(id).populate('uploaded_by', 'full_name');

    if (!podcast) {
      return next(new AppError('Podcast not found', 404));
    }

    if (!podcast.is_published && req.user.role !== 'admin' && podcast.uploaded_by._id.toString() !== req.user.id) {
      return next(new AppError('Podcast not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        podcast
      }
    });
  });

  /**
   * Create new podcast
   * POST /api/podcasts
   */
  createPodcast = asyncHandler(async (req, res, next) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    const { title, description, tags } = req.body;

    // Handle file upload
    if (!req.file) {
      return next(new AppError('Audio file is required', 400));
    }

    try {
      // Upload file to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(req.file.path, {
        resource_type: 'video', // Cloudinary uses 'video' for audio files
        folder: 'podcasts',
        public_id: `podcast_${Date.now()}`,
        format: 'mp3'
      });

      // Create podcast record
      const podcast = new Podcast({
        title,
        description,
        url: cloudinaryResult.secure_url,
        duration: cloudinaryResult.duration,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        uploaded_by: req.user.id,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : []
      });

      await podcast.save();

      // Populate uploader info
      await podcast.populate('uploaded_by', 'full_name');

      res.status(201).json({
        success: true,
        message: 'Podcast created successfully',
        data: {
          podcast
        }
      });

    } catch (error) {
      // Clean up uploaded file if Cloudinary upload fails
      if (req.file && req.file.path) {
        const fs = require('fs');
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting temporary file:', err);
        });
      }
      
      return next(new AppError('Failed to upload podcast file', 500));
    }
  });

  /**
   * Update podcast
   * PUT /api/podcasts/:id
   */
  updatePodcast = asyncHandler(async (req, res, next) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { id } = req.params;
    const { title, description, tags, is_published } = req.body;

    const podcast = await Podcast.findById(id);

    if (!podcast) {
      return next(new AppError('Podcast not found', 404));
    }

    // Check authorization
    if (req.user.role !== 'admin' && podcast.uploaded_by.toString() !== req.user.id) {
      return next(new AppError('Access denied', 403));
    }

    // Update fields
    if (title) podcast.title = title;
    if (description) podcast.description = description;
    if (tags) podcast.tags = tags.split(',').map(tag => tag.trim());
    if (typeof is_published === 'boolean') podcast.is_published = is_published;

    await podcast.save();
    await podcast.populate('uploaded_by', 'full_name');

    res.status(200).json({
      success: true,
      message: 'Podcast updated successfully',
      data: {
        podcast
      }
    });
  });

  /**
   * Delete podcast
   * DELETE /api/podcasts/:id
   */
  deletePodcast = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const podcast = await Podcast.findById(id);

    if (!podcast) {
      return next(new AppError('Podcast not found', 404));
    }

    // Check authorization
    if (req.user.role !== 'admin' && podcast.uploaded_by.toString() !== req.user.id) {
      return next(new AppError('Access denied', 403));
    }

    try {
      // Delete file from Cloudinary
      const publicId = podcast.url.split('/').pop().split('.')[0];
      await deleteFromCloudinary(publicId, { resource_type: 'video' });
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
      // Continue with database deletion even if Cloudinary deletion fails
    }

    await Podcast.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Podcast deleted successfully'
    });
  });

  /**
   * Increment podcast play count
   * POST /api/podcasts/:id/play
   */
  playPodcast = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const podcast = await Podcast.findById(id);

    if (!podcast) {
      return next(new AppError('Podcast not found', 404));
    }

    if (!podcast.is_published) {
      return next(new AppError('Podcast not found', 404));
    }

    await podcast.incrementPlayCount();

    res.status(200).json({
      success: true,
      message: 'Play count updated',
      data: {
        play_count: podcast.play_count
      }
    });
  });

  /**
   * Get popular podcasts
   * GET /api/podcasts/popular
   */
  getPopularPodcasts = asyncHandler(async (req, res, next) => {
    const { limit = 10 } = req.query;

    const podcasts = await Podcast.getPopular(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        podcasts
      }
    });
  });

  /**
   * Get recent podcasts
   * GET /api/podcasts/recent
   */
  getRecentPodcasts = asyncHandler(async (req, res, next) => {
    const { limit = 10 } = req.query;

    const podcasts = await Podcast.getRecent(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        podcasts
      }
    });
  });

  /**
   * Get user's podcasts
   * GET /api/podcasts/my-podcasts
   */
  getMyPodcasts = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: '-created_at',
      populate: {
        path: 'uploaded_by',
        select: 'full_name'
      }
    };

    const result = await Podcast.paginate({ uploaded_by: req.user.id }, options);

    res.status(200).json({
      success: true,
      data: {
        podcasts: result.docs,
        pagination: {
          page: result.page,
          pages: result.totalPages,
          total: result.totalDocs,
          limit: result.limit,
          hasNext: result.hasNextPage,
          hasPrev: result.hasPrevPage
        }
      }
    });
  });
}

module.exports = new PodcastController();
