// /backend/config/db.js
import mongoose from 'mongoose';

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is missing in .env');
    process.exit(1);
  }

  try {
    // ปรับ option ตาม mongoose v7+
    await mongoose.connect(uri, {
      // ใส่ option เพิ่มได้ถ้าต้องการ
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

export default connectDB;
