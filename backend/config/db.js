const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
      // Removed: bufferCommands: false, bufferMaxEntries: 0 (deprecated in Mongoose 7+)
    });
    console.log(`MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);

    mongoose.connection.on('error', err => {
      console.error('MongoDB error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Reconnecting in 5s...');
      setTimeout(connectDB, 5000);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;  // Re-throw to halt startup
  }
};

module.exports = connectDB;