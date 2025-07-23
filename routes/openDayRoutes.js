const express = require('express');
const openDayController = require('../controllers/openDayController');
const { authenticate, authorize, checkEligibility } = require('../middleware/auth');
const {
  validateOpenDayCreation,
  validateOpenDayUpdate,
  validateObjectId,
  validatePagination
} = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/opendays/upcoming
 * @desc    Get upcoming open day events
 * @access  Public
 */
router.get('/upcoming', openDayController.getUpcomingOpenDays);

/**
 * @route   GET /api/opendays/date-range
 * @desc    Get open day events by date range
 * @access  Public
 */
router.get('/date-range', openDayController.getOpenDaysByDateRange);

/**
 * @route   GET /api/opendays/my-registrations
 * @desc    Get current user's registered events
 * @access  Private (Eligible users only)
 */
router.get('/my-registrations', authenticate, checkEligibility, openDayController.getMyRegistrations);

/**
 * @route   GET /api/opendays
 * @desc    Get all open day events with pagination and filtering
 * @access  Public
 */
router.get('/', validatePagination, openDayController.getAllOpenDays);

/**
 * @route   GET /api/opendays/:id
 * @desc    Get single open day event by ID
 * @access  Public
 */
router.get('/:id', validateObjectId, openDayController.getOpenDay);

/**
 * @route   POST /api/opendays
 * @desc    Create new open day event
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validateOpenDayCreation,
  openDayController.createOpenDay
);

/**
 * @route   PUT /api/opendays/:id
 * @desc    Update open day event
 * @access  Private (Admin or creator)
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validateObjectId,
  validateOpenDayUpdate,
  openDayController.updateOpenDay
);

/**
 * @route   DELETE /api/opendays/:id
 * @desc    Delete open day event
 * @access  Private (Admin or creator)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validateObjectId,
  openDayController.deleteOpenDay
);

/**
 * @route   POST /api/opendays/:id/register
 * @desc    Register for open day event
 * @access  Private (Eligible users only)
 */
router.post(
  '/:id/register',
  authenticate,
  checkEligibility,
  validateObjectId,
  openDayController.registerForOpenDay
);

/**
 * @route   POST /api/opendays/:id/cancel
 * @desc    Cancel registration for open day event
 * @access  Private (Eligible users only)
 */
router.post(
  '/:id/cancel',
  authenticate,
  checkEligibility,
  validateObjectId,
  openDayController.cancelRegistration
);

/**
 * @route   GET /api/opendays/:id/attendees
 * @desc    Get event attendees list
 * @access  Private (Admin only)
 */
router.get(
  '/:id/attendees',
  authenticate,
  authorize('admin'),
  validateObjectId,
  openDayController.getEventAttendees
);

module.exports = router;
