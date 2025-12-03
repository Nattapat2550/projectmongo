const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI is not set in environment variables');
}

// ใช้ global Promise
mongoose.Promise = global.Promise;

// ตั้งค่า strictQuery (จะ on/off ก็ได้)
mongoose.set('strictQuery', false);

// connect MongoDB
mongoose
  .connect(uri, {
    // ใช้ค่า default ของ mongoose เวอร์ชันใหม่ (ไม่ต้องใส่ออปชันเพิ่มก็ได้)
  })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });

module.exports = mongoose;
