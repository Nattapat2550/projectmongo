const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/user');

const seedAdmin = async () => {
  await connectDB();

  try {
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('admin123', 12);
    await new User({
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      username: 'admin',
      role: 'admin',
      isEmailVerified: true
    }).save();

    console.log('Admin user created: admin@example.com / admin123');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedAdmin();