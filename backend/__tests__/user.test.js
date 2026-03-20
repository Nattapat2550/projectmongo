// backend/__tests__/user.test.js
const request = require('supertest');
const app = require('../server.js');
const { setupGlobalMock, setupTestAccounts } = require('./testHelper.js');

describe('👤 หมวดที่ 2: ระบบจัดการผู้ใช้ (User Profile)', () => {
  let userToken;

  beforeAll(async () => {
    setupGlobalMock();
    const accounts = await setupTestAccounts(app);
    userToken = accounts.userToken;
  });

  it('USR-01: ขอข้อมูลส่วนตัวโดยไม่มี Token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.statusCode).toBe(401);
  });

  it('USR-02: ขอข้อมูลส่วนตัวสำเร็จ', async () => {
    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    // ✅ แก้ตรงนี้: เปลี่ยนจาก res.body.user เป็น res.body เฉยๆ เพราะ API ส่งข้อมูลมาตรงๆ
    expect(res.body).toHaveProperty('email');
  });

  it('USR-03: แก้ไขชื่อผู้ใช้', async () => {
    const res = await request(app).put('/api/users/me').set('Authorization', `Bearer ${userToken}`).send({ username: 'NewNameTest' });
    expect(res.statusCode).toBe(200);
  });

  it('USR-04 & USR-05: ทดสอบการอัปโหลดไฟล์อวตาร์', async () => {
    const failRes = await request(app)
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('avatar', Buffer.from('fake text file'), 'test.txt');
    expect([400, 415, 500]).toContain(failRes.statusCode);

    const successRes = await request(app)
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('avatar', Buffer.from('fake image data'), 'profile.png');
    expect([200, 201]).toContain(successRes.statusCode);
  });

  it('USR-07: ลบบัญชีผู้ใช้งานตัวเอง', async () => {
    const res = await request(app).delete('/api/users/me').set('Authorization', `Bearer ${userToken}`);
    expect([200, 204]).toContain(res.statusCode);
  });
});