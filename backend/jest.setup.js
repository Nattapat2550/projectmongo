// backend/jest.setup.js
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/projectmongo_test'; 
process.env.JWT_SECRET = 'test_secret_for_jest_only';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.PORT = '0'; 

// เพิ่มบรรทัดนี้: หลอก (Mock) แพ็กเกจ uuid ไม่ให้ Jest วิ่งไปโหลดไฟล์จริง
jest.mock('uuid', () => ({
  v4: () => 'test-mock-uuid-' + Math.random()
}));