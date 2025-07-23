const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { Student } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  register = asyncHandler(async (req, res, next) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { full_name, email, date_of_birth, password } = req.body;

    // Check if user already exists
    const existingUser = await Student.findOne({ where: { email } });
    if (existingUser) {
      return next(new AppError('User already exists with this email', 409));
    }

    // Create new user
    const user = await Student.create({
      full_name,
      email,
      date_of_birth,
      password
    });

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Remove password from response
    const userResponse = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      age: user.age,
      is_eligible: user.is_eligible
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token,
        is_eligible: user.is_eligible
      }
    });
  });

  /**
   * Login user
   * POST /api/auth/login
   */
  login = asyncHandler(async (req, res, next) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { email, password } = req.body;

    // Find user
    const user = await Student.findOne({ where: { email } });

    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Check password using bcrypt
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Remove password from response
    const userResponse = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      age: user.age,
      is_eligible: user.is_eligible
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });
  });

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  getProfile = asyncHandler(async (req, res, next) => {
    const user = await Student.findByPk(req.user.id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  });

  /**
   * Check user eligibility
   * GET /api/auth/eligibility-check/:user_id
   */
  checkEligibility = asyncHandler(async (req, res, next) => {
    const { user_id } = req.params;

    const user = await Student.findByPk(user_id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Recalculate eligibility in case age has changed
    const isEligible = user.is_eligible; // This is already calculated in the model
    
    // Update if needed (though this should be automatic with the getter)
    if (user.changed('date_of_birth')) {
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: {
        user_id: user.id,
        is_eligible: isEligible,
        age: user.age,
        min_age_required: 16,
        max_age_required: 18
      }
    });
  });

  /**
   * Refresh JWT token
   * POST /api/auth/refresh
   */
  refreshToken = asyncHandler(async (req, res, next) => {
    const user = await Student.findByPk(req.user.id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Generate new JWT token
    const token = this.generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token
      }
    });
  });

  /**
   * Logout user (client-side token removal)
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req, res, next) => {
    // In a stateless JWT system, logout is typically handled client-side
    // by removing the token from storage
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  });

  /**
   * Generate JWT token
   * @param {string} userId - User ID
   * @returns {string} JWT token
   */
  generateToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN
      }
    );
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}

module.exports = new AuthController();
