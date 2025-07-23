const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

/**
 * Seed script to create initial admin user
 */
const seedAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('❌ Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      full_name: 'System Administrator',
      email: process.env.ADMIN_EMAIL || 'admin@dtp.com',
      date_of_birth: new Date('1990-01-01'),
      password_hash: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin',
      is_eligible: true
    });

    await adminUser.save();

    console.log('✅ Admin user created successfully');
    console.log(`📧 Email: ${adminUser.email}`);
    console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log('⚠️  Please change the default password after first login');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

// Run seed script
seedAdmin();
