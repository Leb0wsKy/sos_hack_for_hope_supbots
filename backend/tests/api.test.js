import request from 'supertest';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@sos.tn';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'admin123';
const LEVEL2_EMAIL = process.env.TEST_LEVEL2_EMAIL || 'psy@sos.tn';
const LEVEL2_PASSWORD = process.env.TEST_LEVEL2_PASSWORD || 'psy123';
const LEVEL1_EMAIL = process.env.TEST_LEVEL1_EMAIL || 'fatma@sos.tn';
const LEVEL1_PASSWORD = process.env.TEST_LEVEL1_PASSWORD || 'fatma123';

describe('Hack For Hope API smoke tests', () => {
  let token;
  let level2Token;
  let level1Token;
  let createdSignalementId;
  let createdWorkflowId;

  it('logs in with seeded admin', async () => {
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');

    token = response.body.token;
  });

  it('logs in with Level 2 user', async () => {
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: LEVEL2_EMAIL, password: LEVEL2_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');

    level2Token = response.body.token;
  });

  it('logs in with Level 1 user', async () => {
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: LEVEL1_EMAIL, password: LEVEL1_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');

    level1Token = response.body.token;
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

  it('rejects signalement creation without description', async () => {
    const response = await request(BASE_URL)
      .post('/api/signalement')
      .set('Authorization', `Bearer ${level1Token}`)
      .send({ isAnonymous: true });

    expect(response.status).toBe(400);
  });

  it('creates a signalement with only required fields', async () => {
    const response = await request(BASE_URL)
      .post('/api/signalement')
      .set('Authorization', `Bearer ${level1Token}`)
      .send({
        isAnonymous: true,
        description: 'Test signalement description'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('isAnonymous', true);
    expect(response.body).toHaveProperty('createdBy', null);

    createdSignalementId = response.body._id;
  });

  it('creates a workflow for the signalement (Level 2)', async () => {
    const response = await request(BASE_URL)
      .post('/api/workflow')
      .set('Authorization', `Bearer ${level2Token}`)
      .send({ signalementId: createdSignalementId });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('_id');

    createdWorkflowId = response.body._id;
  });

  it('updates a workflow stage with attachment and deadline', async () => {
    const response = await request(BASE_URL)
      .put(`/api/workflow/${createdWorkflowId}/stage`)
      .set('Authorization', `Bearer ${level2Token}`)
      .field('stage', 'initialReport')
      .field('content', 'Initial report content')
      .field('dueAt', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .attach('attachments', Buffer.from('test'), 'test.pdf');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('stages');
    expect(response.body.stages).toHaveProperty('initialReport');
  });

  it('escalates the signalement to National Office (Level 2)', async () => {
    const response = await request(BASE_URL)
      .put(`/api/workflow/${createdWorkflowId}/escalate`)
      .set('Authorization', `Bearer ${level2Token}`)
      .send({ escalatedTo: 'NATIONAL_OFFICE' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('signalement');
    expect(response.body.signalement).toHaveProperty('escalationStatus', 'ESCALATED');
  });

  it('masks anonymous createdBy in signalement detail', async () => {
    const response = await request(BASE_URL)
      .get(`/api/signalement/${createdSignalementId}`)
      .set('Authorization', `Bearer ${level2Token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('createdBy', null);
  });

  it('exports analytics with anonymous masking', async () => {
    const response = await request(BASE_URL)
      .get('/api/analytics/export')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');

    const exported = response.body.data.find((item) => String(item._id) === String(createdSignalementId));
    if (exported) {
      expect(exported).toHaveProperty('createdBy', null);
    }
  });
});
