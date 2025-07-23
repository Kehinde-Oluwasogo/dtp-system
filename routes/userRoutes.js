const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, authorize, validateAccountOwnership } = require('../middleware/auth');
const {
  validateUserUpdate,
  validatePasswordChange,
  validateObjectId,
  validatePagination
} = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/users/eligible
 * @desc    Get eligible users
 * @access  Private (Admin only)
 */
router.get('/eligible', authenticate, authorize('admin'), validatePagination, userController.getEligibleUsers);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin only)
 */
router.get('/stats', authenticate, authorize('admin'), userController.getUserStats);

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filtering
 * @access  Private (Admin only)
 */
router.get('/', authenticate, authorize('admin'), validatePagination, userController.getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get single user by ID
 * @access  Private (Admin or account owner)
 */
router.get('/:id', authenticate, validateObjectId, validateAccountOwnership, userController.getUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user profile
 * @access  Private (Admin or account owner)
 */
router.put(
  '/:id',
  authenticate,
  validateObjectId,
  validateAccountOwnership,
  validateUserUpdate,
  userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user account
 * @access  Private (Admin or account owner)
 */
router.delete(
  '/:id',
  authenticate,
  validateObjectId,
  validateAccountOwnership,
  userController.deleteUser
);

/**
 * @route   PUT /api/users/:id/password
 * @desc    Change user password
 * @access  Private (Account owner only)
 */
router.put(
  '/:id/password',
  authenticate,
  validateObjectId,
  validatePasswordChange,
  (req, res, next) => {
    // Only the account owner can change their password
    if (req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only change your own password.'
      });
    }
    next();
  },
  userController.changePassword
);

/**
 * @route   PUT /api/users/:id/eligibility
 * @desc    Update user eligibility status
 * @access  Private (Admin only)
 */
router.put(
  '/:id/eligibility',
  authenticate,
  authorize('admin'),
  validateObjectId,
  userController.updateEligibility
);

module.exports = router;
