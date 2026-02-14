import request from 'supertest';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@sos.tn';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'admin123';

describe('Hack For Hope API smoke tests', () => {
  let token;

  it('logs in with seeded admin', async () => {
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');

    token = response.body.token;
  });

  it('lists villages for authenticated users', async () => {
    const response = await request(BASE_URL)
      .get('/api/village')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('allows Level 3 access to analytics', async () => {
    const response = await request(BASE_URL)
      .get('/api/analytics')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('overview');
  });

  it('blocks Level 3 from admin-only endpoints', async () => {
    const response = await request(BASE_URL)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });
});
