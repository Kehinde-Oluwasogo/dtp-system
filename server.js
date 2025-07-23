const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database initialization
const { initializeDatabase } = require('./models');

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentAuthRoutes = require('./routes/studentAuthRoutes');
// const podcastRoutes = require('./routes/podcastRoutes');
// const openDayRoutes = require('./routes/openDayRoutes');
// const userRoutes = require('./routes/userRoutes');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Trust proxy settings
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:3000", "https://*"],
            formAction: ["'self'"]
        }
    }
}));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// Database connection and initialization
const startServer = async () => {
  try {
    // Initialize database
    const dbInitialized = await initializeDatabase();
    
    if (!dbInitialized) {
      console.error('❌ Failed to initialize database');
      process.exit(1);
    }
    
    console.log('✅ Database initialized successfully');
    
    // Routes
    app.use('/api/auth', studentAuthRoutes);
    // app.use('/api/podcasts', podcastRoutes);
    // app.use('/api/opendays', openDayRoutes);
    // app.use('/api/users', userRoutes);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Error handling middleware
    app.use(errorHandler);

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    });

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
