const { validationResult } = require('express-validator');
const { Student } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

class UserController {
  /**
   * Get all users (Admin only)
   * GET /api/users
   */
  getAllUsers = asyncHandler(async (req, res, next) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    const {
      page = 1,
      limit = 10,
      sort = 'created_at',
      search,
      eligible_only,
      role
    } = req.query;

    // Build query object
    let query = {};

    // Filter by eligibility
    if (eligible_only === 'true') {
      query.is_eligible = true;
    } else if (eligible_only === 'false') {
      query.is_eligible = false;
    }

    // Filter by role
    if (role) {
      query.role = role;
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sort.startsWith('-') ? { [sort.substring(1)]: -1 } : { [sort]: 1 },
      select: '-password_hash' // Exclude password hash
    };

    const users = await User.find(query)
      .select(options.select)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: options.page,
          pages: Math.ceil(total / options.limit),
          total,
          limit: options.limit,
          hasNext: options.page < Math.ceil(total / options.limit),
          hasPrev: options.page > 1
        }
      }
    });
  });

  /**
   * Get single user by ID
   * GET /api/users/:id
   */
  getUser = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // Check authorization - users can only view their own profile unless admin
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return next(new AppError('Access denied', 403));
    }

    const user = await User.findById(id).select('-password_hash');

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
   * Update user profile
   * PUT /api/users/:id
   */
  updateUser = asyncHandler(async (req, res, next) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { id } = req.params;
    const { full_name, email, date_of_birth, role } = req.body;

    // Check authorization
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return next(new AppError('Access denied', 403));
    }

    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Only admin can change role
    if (role && req.user.role !== 'admin') {
      return next(new AppError('Only admin can change user roles', 403));
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return next(new AppError('Email is already taken', 409));
      }
    }

    // Update fields
    if (full_name) user.full_name = full_name;
    if (email) user.email = email;
    if (date_of_birth) user.date_of_birth = new Date(date_of_birth);
    if (role && req.user.role === 'admin') user.role = role;

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password_hash;

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: userResponse
      }
    });
  });

  /**
   * Delete user account
   * DELETE /api/users/:id
   */
  deleteUser = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // Check authorization
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return next(new AppError('Access denied', 403));
    }

    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent admin from deleting themselves
    if (req.user.id === id && req.user.role === 'admin') {
      return next(new AppError('Admin cannot delete their own account', 400));
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User account deleted successfully'
    });
  });

  /**
   * Get eligible users (Admin only)
   * GET /api/users/eligible
   */
  getEligibleUsers = asyncHandler(async (req, res, next) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    const { page = 1, limit = 10 } = req.query;

    const users = await User.findEligible()
      .select('-password_hash')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ created_at: -1 });

    const total = await User.countDocuments({ is_eligible: true });

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  });

  /**
   * Get user statistics (Admin only)
   * GET /api/users/stats
   */
  getUserStats = asyncHandler(async (req, res, next) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          eligibleUsers: {
            $sum: { $cond: [{ $eq: ['$is_eligible', true] }, 1, 0] }
          },
          ineligibleUsers: {
            $sum: { $cond: [{ $eq: ['$is_eligible', false] }, 1, 0] }
          },
          adminUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
          },
          regularUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRegistrations = await User.countDocuments({
      created_at: { $gte: thirtyDaysAgo }
    });

    const result = stats[0] || {
      totalUsers: 0,
      eligibleUsers: 0,
      ineligibleUsers: 0,
      adminUsers: 0,
      regularUsers: 0
    };

    result.recentRegistrations = recentRegistrations;
    result.eligibilityRate = result.totalUsers > 0 
      ? ((result.eligibleUsers / result.totalUsers) * 100).toFixed(2) + '%'
      : '0%';

    res.status(200).json({
      success: true,
      data: {
        stats: result
      }
    });
  });

  /**
   * Change user password
   * PUT /api/users/:id/password
   */
  changePassword = asyncHandler(async (req, res, next) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { id } = req.params;
    const { current_password, new_password } = req.body;

    // Check authorization
    if (req.user.id !== id) {
      return next(new AppError('Access denied', 403));
    }

    const user = await User.findById(id).select('+password_hash');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(current_password);
    if (!isCurrentPasswordValid) {
      return next(new AppError('Current password is incorrect', 400));
    }

    // Update password
    user.password_hash = new_password; // Will be hashed by pre-save middleware
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  });

  /**
   * Update user eligibility (Admin only)
   * PUT /api/users/:id/eligibility
   */
  updateEligibility = asyncHandler(async (req, res, next) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    const { id } = req.params;
    const { is_eligible } = req.body;

    if (typeof is_eligible !== 'boolean') {
      return next(new AppError('Eligibility status must be a boolean value', 400));
    }

    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    user.is_eligible = is_eligible;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User eligibility updated successfully',
      data: {
        user_id: user._id,
        is_eligible: user.is_eligible,
        age: user.age
      }
    });
  });
}

module.exports = new UserController();
