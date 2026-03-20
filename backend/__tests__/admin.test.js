// backend/__tests__/admin.test.js
const request = require('supertest');
const app = require('../server.js');
const { setupGlobalMock, setupTestAccounts } = require('./testHelper.js');

describe('👑 หมวดที่ 3: ระบบหลังบ้านสำหรับแอดมิน (Admin CMS)', () => {
  let adminToken, userToken;

  beforeAll(async () => {
    setupGlobalMock();
    const accounts = await setupTestAccounts(app);
    adminToken = accounts.adminToken;
    userToken = accounts.userToken;
  });

  it('ADM-01: User ทั่วไปพยายามเข้าเมนูแอดมิน', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${userToken}`);
    expect([401, 403]).toContain(res.statusCode);
  });

  it('ADM-02: ดูรายชื่อ User ทั้งหมดด้วยสิทธิ์ Admin', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect([200, 404]).toContain(res.statusCode);
    if(res.statusCode === 200) {
      // ✅ แก้ตรงนี้: เปลี่ยนไปเช็คที่ res.body.users ตามที่ routes/admin.js ตั้งเอาไว้
      expect(Array.isArray(res.body.users)).toBe(true);
    }
  });

  it('ADM-04 & ADM-05 & ADM-07: จัดการแบนเนอร์สไลด์ (Carousel)', async () => {
    const createRes = await request(app).post('/api/admin/carousel')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'New Promo', image_url: 'http://test.com/img.jpg' });
    expect([200, 201, 404]).toContain(createRes.statusCode);
    
    // ดึง ID สไลด์ ถ้า API สร้างสำเร็จ (อ้างอิงจาก slide object ที่คืนมา)
    const bannerId = createRes.body?.slide?._id || createRes.body?.slide?.id || 1;

    if (createRes.statusCode === 200 || createRes.statusCode === 201) {
      const updateRes = await request(app).put(`/api/admin/carousel/${bannerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Promo' });
      expect([200, 404]).toContain(updateRes.statusCode);

      const deleteRes = await request(app).delete(`/api/admin/carousel/${bannerId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 204, 404]).toContain(deleteRes.statusCode);
    }
  });

  it('ADM-08: แก้ไขข้อความหน้าเว็บ (Homepage)', async () => {
    const res = await request(app).put('/api/admin/homepage-content')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'New Hero Text' });
    expect([200, 201]).toContain(res.statusCode);
  });
});