const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Student } = require('../models');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  }
});

// Student Registration
router.post('/student/register', authLimiter, async (req, res) => {
  try {
    const {
      full_name,
      email,
      password,
      confirm_password,
      date_of_birth,
      phone,
      school,
      guardian_contact
    } = req.body;

    // Basic validation
    if (!full_name || !email || !password || !confirm_password || !date_of_birth) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if email already exists
    const existingStudent = await Student.findOne({ where: { email } });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create student (age validation will happen in the model)
    const student = await Student.create({
      full_name,
      email,
      password,
      date_of_birth,
      phone,
      school,
      guardian_contact
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: student.id, 
        email: student.email,
        type: 'student'
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: {
        student: {
          id: student.id,
          full_name: student.full_name,
          email: student.email,
          age: student.age,
          is_eligible: student.is_eligible
        },
        token
      }
    });

  } catch (error) {
    console.error('Student registration error:', error);
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'Validation error'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

// Student Login
router.post('/student/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find student
    const student = await Student.findOne({ where: { email } });
    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, student.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if student is eligible (age 16-18)
    if (!student.is_eligible) {
      return res.status(403).json({
        success: false,
        message: 'Only students aged 16-18 are eligible for this platform'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: student.id, 
        email: student.email,
        type: 'student'
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        student: {
          id: student.id,
          full_name: student.full_name,
          email: student.email,
          age: student.age,
          school: student.school
        },
        token
      }
    });

  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

// Admin Login (simplified for prototype)
router.post('/admin/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Simple hardcoded admin credentials for prototype
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Generate JWT token for admin
    const token = jwt.sign(
      { 
        id: 'admin', 
        username: username,
        type: 'admin'
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        admin: {
          id: 'admin',
          username: username,
          type: 'admin'
        },
        token
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during admin login'
    });
  }
});

// Get current user (both student and admin)
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    
    if (decoded.type === 'admin') {
      return res.json({
        success: true,
        data: {
          user: {
            id: decoded.id,
            username: decoded.username,
            type: 'admin'
          }
        }
      });
    } else if (decoded.type === 'student') {
      const student = await Student.findByPk(decoded.id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      return res.json({
        success: true,
        data: {
          user: {
            id: student.id,
            full_name: student.full_name,
            email: student.email,
            age: student.age,
            school: student.school,
            type: 'student'
          }
        }
      });
    }

    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

// Logout (optional - mainly for client-side token removal)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
