import mongoose from 'mongoose';

export async function connectDB(uri) {
  try {
    const mongoUri = uri || process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI is not set');
    await mongoose.connect(mongoUri, { dbName: 'projectmongo' });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}
