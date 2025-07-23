const jwt = require('jsonwebtoken');
const { Student } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Middleware to authenticate user using JWT token
 */
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check for token in cookies (if using cookie-based auth)
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new AppError('Access denied. No token provided.', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await Student.findByPk(decoded.id);

    if (!user) {
      return next(new AppError('Token is invalid. User not found.', 401));
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Token is invalid', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired', 401));
    } else {
      return next(new AppError('Token verification failed', 401));
    }
  }
});

/**
 * Middleware to authorize users based on roles
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Access denied. Authentication required.', 401));
    }

    // For this prototype, all authenticated users are students
    // Admin authentication is handled separately
    const userRole = 'student';
    
    if (!roles.includes(userRole)) {
      return next(new AppError(`Access denied. Role '${userRole}' is not authorized.`, 403));
    }

    next();
  };
};

/**
 * Middleware to check if user is eligible
 */
const checkEligibility = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Access denied. Authentication required.', 401));
  }

  // Skip eligibility check for admin users - not applicable in this prototype
  // since admin auth is separate from student auth

  // Check if user is eligible
  if (!req.user.is_eligible) {
    return next(new AppError('Access denied. You are not eligible to access this resource.', 403));
  }

  next();
});

/**
 * Middleware to check if user owns the resource or is admin
 * @param {string} resourceUserField - Field name that contains the user ID in the resource
 */
const checkOwnership = (resourceUserField = 'user') => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Access denied. Authentication required.', 401));
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Get resource ID from params
    const resourceId = req.params.id;
    if (!resourceId) {
      return next(new AppError('Resource ID is required', 400));
    }

    // This middleware should be used after the resource is fetched in the controller
    // For now, we'll pass through and let the controller handle ownership checks
    next();
  });
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check for token in cookies
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    // No token provided, continue without authentication
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id).select('-password_hash');

    if (user) {
      // Add user to request object if found
      req.user = user;
    }

    next();
  } catch (error) {
    // Token is invalid, but continue without authentication
    next();
  }
});

/**
 * Middleware to validate user ownership of the account
 */
const validateAccountOwnership = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!req.user) {
    return next(new AppError('Access denied. Authentication required.', 401));
  }

  // Admin can access any account
  if (req.user.role === 'admin') {
    return next();
  }

  // User can only access their own account
  if (req.user.id !== id) {
    return next(new AppError('Access denied. You can only access your own account.', 403));
  }

  next();
});

/**
 * Rate limiting middleware for authentication endpoints
 */
const authRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true,
  // Only count failed requests
  skip: (req, res) => res.statusCode < 400
});

module.exports = {
  authenticate,
  authorize,
  checkEligibility,
  checkOwnership,
  optionalAuth,
  validateAccountOwnership,
  authRateLimit
};
