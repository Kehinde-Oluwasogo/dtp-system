const { validationResult } = require('express-validator');
const { OpenDay, Student } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

class OpenDayController {
  /**
   * Get all open day events
   * GET /api/opendays
   */
  getAllOpenDays = asyncHandler(async (req, res, next) => {
    const {
      page = 1,
      limit = 10,
      sort = 'date',
      search,
      event_type,
      upcoming_only = 'true'
    } = req.query;

    // Build query object
    let query = {};

    // Filter upcoming events only
    if (upcoming_only === 'true') {
      query.date = { $gt: new Date() };
      query.is_registration_open = true;
    }

    // Add search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by event type
    if (event_type) {
      query.event_type = event_type;
    }

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: {
        path: 'created_by',
        select: 'full_name'
      }
    };

    const result = await OpenDay.paginate(query, options);

    res.status(200).json({
      success: true,
      data: {
        opendays: result.docs,
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
   * Get single open day event by ID
   * GET /api/opendays/:id
   */
  getOpenDay = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const openday = await OpenDay.findById(id)
      .populate('created_by', 'full_name')
      .populate('attendees.user', 'full_name email');

    if (!openday) {
      return next(new AppError('Open day event not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        openday
      }
    });
  });

  /**
   * Create new open day event
   * POST /api/opendays
   */
  createOpenDay = asyncHandler(async (req, res, next) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    const {
      event_name,
      description,
      date,
      location,
      capacity,
      registration_deadline,
      event_type,
      virtual_link,
      tags
    } = req.body;

    // Create open day event
    const openday = new OpenDay({
      event_name,
      description,
      date: new Date(date),
      location,
      capacity: capacity || 100,
      registration_deadline: registration_deadline ? new Date(registration_deadline) : null,
      event_type: event_type || 'physical',
      virtual_link,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      created_by: req.user.id
    });

    await openday.save();

    // Populate creator info
    await openday.populate('created_by', 'full_name');

    res.status(201).json({
      success: true,
      message: 'Open day event created successfully',
      data: {
        openday
      }
    });
  });

  /**
   * Update open day event
   * PUT /api/opendays/:id
   */
  updateOpenDay = asyncHandler(async (req, res, next) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { id } = req.params;
    const {
      event_name,
      description,
      date,
      location,
      capacity,
      registration_deadline,
      is_registration_open,
      event_type,
      virtual_link,
      tags
    } = req.body;

    const openday = await OpenDay.findById(id);

    if (!openday) {
      return next(new AppError('Open day event not found', 404));
    }

    // Check authorization
    if (req.user.role !== 'admin' && openday.created_by.toString() !== req.user.id) {
      return next(new AppError('Access denied', 403));
    }

    // Update fields
    if (event_name) openday.event_name = event_name;
    if (description) openday.description = description;
    if (date) openday.date = new Date(date);
    if (location) openday.location = location;
    if (capacity) openday.capacity = capacity;
    if (registration_deadline) openday.registration_deadline = new Date(registration_deadline);
    if (typeof is_registration_open === 'boolean') openday.is_registration_open = is_registration_open;
    if (event_type) openday.event_type = event_type;
    if (virtual_link) openday.virtual_link = virtual_link;
    if (tags) openday.tags = tags.split(',').map(tag => tag.trim());

    await openday.save();
    await openday.populate('created_by', 'full_name');

    res.status(200).json({
      success: true,
      message: 'Open day event updated successfully',
      data: {
        openday
      }
    });
  });

  /**
   * Delete open day event
   * DELETE /api/opendays/:id
   */
  deleteOpenDay = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const openday = await OpenDay.findById(id);

    if (!openday) {
      return next(new AppError('Open day event not found', 404));
    }

    // Check authorization
    if (req.user.role !== 'admin' && openday.created_by.toString() !== req.user.id) {
      return next(new AppError('Access denied', 403));
    }

    // Check if event has registered attendees
    if (openday.registered_count > 0) {
      return next(new AppError('Cannot delete event with registered attendees', 400));
    }

    await OpenDay.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Open day event deleted successfully'
    });
  });

  /**
   * Register for open day event
   * POST /api/opendays/:id/register
   */
  registerForOpenDay = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is eligible
    const user = await User.findById(userId);
    if (!user.is_eligible) {
      return next(new AppError('You are not eligible to register for events', 403));
    }

    const openday = await OpenDay.findById(id);

    if (!openday) {
      return next(new AppError('Open day event not found', 404));
    }

    try {
      await openday.registerUser(userId);

      res.status(200).json({
        success: true,
        message: 'Successfully registered for the event',
        data: {
          event_name: openday.event_name,
          registered_count: openday.registered_count,
          remaining_capacity: openday.remaining_capacity
        }
      });
    } catch (error) {
      return next(new AppError(error.message, 400));
    }
  });

  /**
   * Cancel registration for open day event
   * POST /api/opendays/:id/cancel
   */
  cancelRegistration = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;

    const openday = await OpenDay.findById(id);

    if (!openday) {
      return next(new AppError('Open day event not found', 404));
    }

    try {
      await openday.cancelRegistration(userId);

      res.status(200).json({
        success: true,
        message: 'Registration cancelled successfully',
        data: {
          event_name: openday.event_name,
          registered_count: openday.registered_count,
          remaining_capacity: openday.remaining_capacity
        }
      });
    } catch (error) {
      return next(new AppError(error.message, 400));
    }
  });

  /**
   * Get upcoming open day events
   * GET /api/opendays/upcoming
   */
  getUpcomingOpenDays = asyncHandler(async (req, res, next) => {
    const { limit = 10 } = req.query;

    const opendays = await OpenDay.getUpcoming(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        opendays
      }
    });
  });

  /**
   * Get open day events by date range
   * GET /api/opendays/date-range
   */
  getOpenDaysByDateRange = asyncHandler(async (req, res, next) => {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return next(new AppError('Start date and end date are required', 400));
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate >= endDate) {
      return next(new AppError('Start date must be before end date', 400));
    }

    const opendays = await OpenDay.getByDateRange(startDate, endDate);

    res.status(200).json({
      success: true,
      data: {
        opendays,
        date_range: {
          start: startDate,
          end: endDate
        }
      }
    });
  });

  /**
   * Get user's registered events
   * GET /api/opendays/my-registrations
   */
  getMyRegistrations = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;

    const opendays = await OpenDay.find({
      'attendees.user': userId,
      'attendees.attendance_status': 'registered'
    })
    .populate('created_by', 'full_name')
    .sort({ date: 1 });

    res.status(200).json({
      success: true,
      data: {
        registrations: opendays
      }
    });
  });

  /**
   * Get event attendees (Admin only)
   * GET /api/opendays/:id/attendees
   */
  getEventAttendees = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    const openday = await OpenDay.findById(id)
      .populate('attendees.user', 'full_name email date_of_birth')
      .select('event_name attendees registered_count capacity');

    if (!openday) {
      return next(new AppError('Open day event not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        event_name: openday.event_name,
        registered_count: openday.registered_count,
        capacity: openday.capacity,
        attendees: openday.attendees
      }
    });
  });
}

module.exports = new OpenDayController();
