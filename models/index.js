const { sequelize } = require('../config/database');
const Student = require('./Student');
const Podcast = require('./Podcast');
const OpenDay = require('./OpenDay');

// Define any associations here if needed
// Example: Student.hasMany(OpenDay) - if students can create events

const db = {
  sequelize,
  Student,
  Podcast,
  OpenDay
};

// Initialize database and create tables
const initializeDatabase = async () => {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sync all models with the database
    await sequelize.sync({ force: true }); // Forcing recreation of tables with new schema
    console.log('All models have been synchronized with the database.');
    
    return true;
  } catch (error) {
    console.error('Unable to initialize database:', error);
    return false;
  }
};

module.exports = { ...db, initializeDatabase };
