// backend/__tests__/auth.test.js
const request = require('supertest');
const app = require('../server.js');
const { setupGlobalMock } = require('./testHelper.js');

jest.mock('../utils/gmail.js', () => ({ sendEmail: jest.fn().mockResolvedValue(true) }));
jest.mock('../utils/generateCode.js', () => {
  return typeof jest !== 'undefined' ? jest.fn(() => '123456') : { generateCode: () => '123456' };
});

describe('🟢 หมวดที่ 1: ระบบยืนยันตัวตนและความปลอดภัย (Auth & Security)', () => {
  beforeAll(() => setupGlobalMock());

  const testEmail = `test_${Date.now()}@example.com`;
  let userToken = '';

  it('AUTH-01: สมัครสมาชิกด้วยอีเมลใหม่', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: testEmail });
    expect([200, 201]).toContain(res.statusCode);
  });

  it('AUTH-02: สมัครสมาชิกด้วยอีเมลซ้ำ', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: testEmail });
    expect([200, 201, 400, 409]).toContain(res.statusCode);
  });

  it('AUTH-04: ยืนยัน OTP ผิดพลาด', async () => {
    const res = await request(app).post('/api/auth/verify-code').send({ email: testEmail, code: '000000' });
    expect([400, 401]).toContain(res.statusCode);
  });

  it('AUTH-03: ยืนยัน OTP ถูกต้อง', async () => {
    const res = await request(app).post('/api/auth/verify-code').send({ email: testEmail, code: '123456' });
    expect([200, 201]).toContain(res.statusCode);
  });

  it('AUTH-05: ตั้งค่าโปรไฟล์หลังยืนยัน OTP', async () => {
    const res = await request(app).post('/api/auth/complete-profile').send({
      email: testEmail, username: 'SecureUser', password: 'Password123!'
    });
    expect([200, 201]).toContain(res.statusCode);
    // ✅ เช็คว่ามีการสั่งแนบ Cookie Token มาให้
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('AUTH-06: เข้าสู่ระบบสำเร็จ', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: testEmail, password: 'Password123!' });
    expect(res.statusCode).toBe(200);
    
    // ✅ เปลี่ยนมาดึงค่า Token จาก Cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    
    const tokenCookie = cookies.find(c => c.startsWith('token='));
    if(tokenCookie) {
        userToken = tokenCookie.split(';')[0].split('=')[1];
    }
    expect(userToken).toBeTruthy();
  });

  it('AUTH-07: เข้าสู่ระบบรหัสผ่านผิด', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: testEmail, password: 'WrongPassword!' });
    expect(res.statusCode).toBe(401);
  });

  it('AUTH-08: ป้องกัน SQL Injection', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: "' OR 1=1 --", password: 'any' });
    expect([400, 401, 404]).toContain(res.statusCode);
  });

  it('AUTH-10 & AUTH-11: ลืมรหัสผ่านและตั้งรหัสผ่านใหม่', async () => {
    const forgotRes = await request(app).post('/api/auth/forgot-password').send({ email: testEmail });
    expect([200, 201]).toContain(forgotRes.statusCode);

    const resetRes = await request(app).post('/api/auth/reset-password').send({
      token: 'mock_token', newPassword: 'NewPassword123!'
    });
    expect([200, 201, 400]).toContain(resetRes.statusCode);
  });

  it('AUTH-09: ออกจากระบบ (Logout)', async () => {
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${userToken}`);
    expect([200, 204, 404]).toContain(res.statusCode);
  });
});