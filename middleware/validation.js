const { body, param, query } = require('express-validator');

/**
 * Validation rules for user registration
 */
const validateRegistration = [
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('date_of_birth')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Please provide a valid date in YYYY-MM-DD format')
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      if (birthDate >= today) {
        throw new Error('Date of birth must be in the past');
      }
      return true;
    }),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

/**
 * Validation rules for user login
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for user profile update
 */
const validateUserUpdate = [
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date in YYYY-MM-DD format')
    .custom((value) => {
      if (value) {
        const birthDate = new Date(value);
        const today = new Date();
        if (birthDate >= today) {
          throw new Error('Date of birth must be in the past');
        }
      }
      return true;
    }),

  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either "user" or "admin"')
];

/**
 * Validation rules for password change
 */
const validatePasswordChange = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),

  body('new_password')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
    .custom((value, { req }) => {
      if (value === req.body.current_password) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

/**
 * Validation rules for podcast creation
 */
const validatePodcastCreation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Podcast title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Podcast description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('tags')
    .optional()
    .custom((value) => {
      if (value) {
        const tags = value.split(',');
        if (tags.length > 10) {
          throw new Error('Maximum 10 tags allowed');
        }
        for (const tag of tags) {
          if (tag.trim().length > 50) {
            throw new Error('Each tag must be 50 characters or less');
          }
        }
      }
      return true;
    })
];

/**
 * Validation rules for podcast update
 */
const validatePodcastUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('is_published')
    .optional()
    .isBoolean()
    .withMessage('Published status must be a boolean value'),

  body('tags')
    .optional()
    .custom((value) => {
      if (value) {
        const tags = value.split(',');
        if (tags.length > 10) {
          throw new Error('Maximum 10 tags allowed');
        }
        for (const tag of tags) {
          if (tag.trim().length > 50) {
            throw new Error('Each tag must be 50 characters or less');
          }
        }
      }
      return true;
    })
];

/**
 * Validation rules for open day creation
 */
const validateOpenDayCreation = [
  body('event_name')
    .trim()
    .notEmpty()
    .withMessage('Event name is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Event name must be between 3 and 200 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Event description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('date')
    .notEmpty()
    .withMessage('Event date is required')
    .isISO8601()
    .withMessage('Please provide a valid date in ISO format')
    .custom((value) => {
      const eventDate = new Date(value);
      const now = new Date();
      if (eventDate <= now) {
        throw new Error('Event date must be in the future');
      }
      return true;
    }),

  body('location')
    .trim()
    .notEmpty()
    .withMessage('Event location is required')
    .isLength({ min: 5, max: 300 })
    .withMessage('Location must be between 5 and 300 characters'),

  body('capacity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Capacity must be between 1 and 10000'),

  body('registration_deadline')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid registration deadline in ISO format')
    .custom((value, { req }) => {
      if (value) {
        const deadline = new Date(value);
        const eventDate = new Date(req.body.date);
        if (deadline > eventDate) {
          throw new Error('Registration deadline must be before or on the event date');
        }
      }
      return true;
    }),

  body('event_type')
    .optional()
    .isIn(['virtual', 'physical', 'hybrid'])
    .withMessage('Event type must be "virtual", "physical", or "hybrid"'),

  body('virtual_link')
    .optional()
    .custom((value, { req }) => {
      if (value && (req.body.event_type === 'virtual' || req.body.event_type === 'hybrid')) {
        const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
        if (!urlRegex.test(value)) {
          throw new Error('Please provide a valid virtual meeting link');
        }
      }
      return true;
    }),

  body('tags')
    .optional()
    .custom((value) => {
      if (value) {
        const tags = value.split(',');
        if (tags.length > 10) {
          throw new Error('Maximum 10 tags allowed');
        }
        for (const tag of tags) {
          if (tag.trim().length > 50) {
            throw new Error('Each tag must be 50 characters or less');
          }
        }
      }
      return true;
    })
];

/**
 * Validation rules for open day update
 */
const validateOpenDayUpdate = [
  body('event_name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Event name must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date in ISO format')
    .custom((value) => {
      if (value) {
        const eventDate = new Date(value);
        const now = new Date();
        if (eventDate <= now) {
          throw new Error('Event date must be in the future');
        }
      }
      return true;
    }),

  body('location')
    .optional()
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage('Location must be between 5 and 300 characters'),

  body('capacity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Capacity must be between 1 and 10000'),

  body('is_registration_open')
    .optional()
    .isBoolean()
    .withMessage('Registration status must be a boolean value'),

  body('event_type')
    .optional()
    .isIn(['virtual', 'physical', 'hybrid'])
    .withMessage('Event type must be "virtual", "physical", or "hybrid"'),

  body('virtual_link')
    .optional()
    .custom((value, { req }) => {
      if (value && (req.body.event_type === 'virtual' || req.body.event_type === 'hybrid')) {
        const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
        if (!urlRegex.test(value)) {
          throw new Error('Please provide a valid virtual meeting link');
        }
      }
      return true;
    })
];

/**
 * Validation rules for MongoDB ObjectId parameters
 */
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format')
];

/**
 * Validation rules for pagination query parameters
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateUserUpdate,
  validatePasswordChange,
  validatePodcastCreation,
  validatePodcastUpdate,
  validateOpenDayCreation,
  validateOpenDayUpdate,
  validateObjectId,
  validatePagination
};
