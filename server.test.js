const request = require('supertest');
const app = require('../server'); // تأكدي أن المسار يشير إلى ملف server.js الرئيسي لديكِ

describe('EvidenceSystem Backend Automated Tests', () => {
  
  // 1. اختبار نقطة الصحة (Health Check)
  test('GET /api/health should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  // 2. اختبار مسار الترحيب الجذري
  test('GET /api should return welcome message', async () => {
    const res = await request(app).get('/api');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  // 3. اختبار التعامل مع مسار غير موجود (404)
  test('GET /api/nonexistent-route should return 404 error', async () => {
    const res = await request(app).get('/api/nonexistent-route');
    expect(res.statusCode).toEqual(404);
    expect(res.body.success).toBe(false);
  });

});
