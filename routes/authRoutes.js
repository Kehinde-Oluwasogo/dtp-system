const express = require('express');
const authController = require('../controllers/authController');
const { authenticate, authRateLimit } = require('../middleware/auth');
const {
  validateRegistration,
  validateLogin,
  validateObjectId
} = require('../middleware/validation');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authRateLimit, validateRegistration, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authRateLimit, validateLogin, authController.login);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   GET /api/auth/eligibility-check/:user_id
 * @desc    Check user eligibility based on age
 * @access  Public
 */
router.get('/eligibility-check/:user_id', validateObjectId, authController.checkEligibility);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh', authenticate, authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

module.exports = router;
