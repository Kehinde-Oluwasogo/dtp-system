const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Student } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// Student Registration
router.post('/student/register', asyncHandler(async (req, res) => {
    const { full_name, email, date_of_birth } = req.body;

    // Create student
    const student = await Student.create({
        full_name,
        email,
        date_of_birth
    });

    // Generate JWT token
    const token = jwt.sign(
        { 
            id: student.id, 
            email: student.email,
            type: 'student'
        }, 
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    // Send success response
    res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
            token,
            student: {
                id: student.id,
                full_name: student.full_name,
                email: student.email
            }
        }
    });
}));

// Student Login
router.post('/student/login', asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Find student
    const student = await Student.findOne({ where: { email } });
    if (!student) {
        return res.status(404).json({
            success: false,
            message: 'No account found with this email'
        });
    }

    // Generate JWT token
    const token = jwt.sign(
        { 
            id: student.id, 
            email: student.email,
            type: 'student'
        }, 
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    // Send success response
    res.json({
        success: true,
        message: 'Login successful',
        data: {
            token,
            student: {
                id: student.id,
                full_name: student.full_name,
                email: student.email
            }
        }
    });
}));

// Get Student Profile
router.get('/student/profile', asyncHandler(async (req, res) => {
    const { id } = req.user;
    
    const student = await Student.findByPk(id);
    if (!student) {
        return res.status(404).json({
            success: false,
            message: 'Student not found'
        });
    }

    res.json({
        success: true,
        data: {
            student: {
                id: student.id,
                full_name: student.full_name,
                email: student.email
            }
        }
    });
}));

module.exports = router;
