// backend/__tests__/testHelper.js
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // ✅ เพิ่มบรรทัดนี้
const User = require('../models/user');

function setupGlobalMock() {}

async function setupTestAccounts(app) {
  const uniqueSuffix = Date.now() + Math.random().toString().substring(2, 8);
  const userEmail = `user_${uniqueSuffix}@test.com`;
  const adminEmail = `admin_${uniqueSuffix}@test.com`;

  const passwordHash = bcrypt.hashSync('Password123!', 10);

  const user = await User.create({
    email: userEmail,
    username: 'TestUser',
    password: passwordHash, 
    role: 'user',
    isEmailVerified: true
  });

  const admin = await User.create({
    email: adminEmail,
    username: 'TestAdmin',
    password: passwordHash,
    role: 'admin',
    isEmailVerified: true
  });

  // ✅ สร้าง Token ด้วย JWT ตรงๆ เลย ป้องกันปัญหาการอ่าน Cookie พลาดตอนรัน Test
  const userToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const adminToken = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

  return {
    userToken,
    adminToken,
    testUserId: user._id,
    testAdminId: admin._id
  };
}

module.exports = { setupGlobalMock, setupTestAccounts };
it.skip('Dummy test to prevent Jest error', () => {});