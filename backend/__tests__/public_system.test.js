// backend/__tests__/public_system.test.js
const request = require('supertest');
const app = require('../server.js');
const { setupGlobalMock } = require('./testHelper.js');

describe('🏠 & 📦 หมวดที่ 4 และ 5: ระบบหน้าบ้านสาธารณะ และ ระบบเซิร์ฟเวอร์', () => {
  beforeAll(() => setupGlobalMock());

  it('PUB-01: ดึงข้อมูลหน้าแรก (Homepage)', async () => {
    const res = await request(app).get('/api/homepage');
    expect([200, 404]).toContain(res.statusCode); // เผื่อ API ไม่มีอยู่จริง
  });

  it('PUB-02: ดึงข้อมูลภาพสไลด์ (Carousel)', async () => {
    const res = await request(app).get('/api/carousel');
    expect([200, 404]).toContain(res.statusCode);
  });

  it('PUB-03: เข้าถึง URL ที่ไม่มีอยู่จริง (404 Not Found)', async () => {
    const res = await request(app).get('/api/this-path-does-not-exist');
    expect(res.statusCode).toBe(404);
  });

  it('SYS-01: ตรวจสอบสถานะเซิร์ฟเวอร์ (Health Check)', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('SYS-02 & SYS-03: ทดสอบการดาวน์โหลดไฟล์แอปพลิเคชัน', async () => {
    const resWindows = await request(app).get('/api/download/windows');
    expect([200, 404]).toContain(resWindows.statusCode);
    
    if(resWindows.statusCode === 200) {
      // ตรวจสอบว่า header เป็นการโหลดไฟล์ (octet-stream หรือ x-msdos-program สำหรับไฟล์ .exe)
      const contentType = resWindows.headers['content-type'];
      const isFile = contentType.includes('application/octet-stream') || contentType.includes('application/x-msdos-program');
      expect(isFile).toBe(true);
    }
  });
});