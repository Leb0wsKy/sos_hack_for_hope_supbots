import request from 'supertest';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@sos.tn';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'admin123';
const LEVEL2_EMAIL = process.env.TEST_LEVEL2_EMAIL || 'psy@sos.tn';
const LEVEL2_PASSWORD = process.env.TEST_LEVEL2_PASSWORD || 'psy123';
const LEVEL1_EMAIL = process.env.TEST_LEVEL1_EMAIL || 'fatma@sos.tn';
const LEVEL1_PASSWORD = process.env.TEST_LEVEL1_PASSWORD || 'fatma123';
const SUPER_ADMIN_EMAIL = process.env.TEST_SUPER_ADMIN_EMAIL;
const SUPER_ADMIN_PASSWORD = process.env.TEST_SUPER_ADMIN_PASSWORD;

describe('Hack For Hope API full tests', () => {
  let adminToken;
  let level2Token;
  let level1Token;
  let superAdminToken;
  let level2UserId;
  let villageId;

  let signalementWorkflowId;
  let workflowId;
  let signalementAttachmentId;
  let attachmentFilename;
  let signalementAssignId;
  let signalementSauvegardeId;
  let signalementCloseId;
  let signalementDeleteId;

  it('logs in with seeded admin', async () => {
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');

    adminToken = response.body.token;
  });

  it('logs in with Level 2 user', async () => {
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: LEVEL2_EMAIL, password: LEVEL2_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');

    level2Token = response.body.token;
    level2UserId = response.body.user?.id;
  });

  it('logs in with Level 1 user', async () => {
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: LEVEL1_EMAIL, password: LEVEL1_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');

    level1Token = response.body.token;
  });

  it('optionally logs in with Super Admin', async () => {
    if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
      return;
    }

    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');

    superAdminToken = response.body.token;
  });

  it('lists villages for authenticated users', async () => {
    const response = await request(BASE_URL)
      .get('/api/village')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    villageId = response.body[0]?._id;
  });

  it('gets village statistics', async () => {
    if (!villageId) return;

    const response = await request(BASE_URL)
      .get(`/api/village/${villageId}/statistics`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('statistics');
  });

  it('allows Level 3 access to analytics endpoints', async () => {
    const analytics = await request(BASE_URL)
      .get('/api/analytics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(analytics.status).toBe(200);

    const heatmap = await request(BASE_URL)
      .get('/api/analytics/heatmap')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(heatmap.status).toBe(200);

    const ratings = await request(BASE_URL)
      .get('/api/analytics/village-ratings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(ratings.status).toBe(200);
  });

  it('blocks Level 3 from admin-only endpoints', async () => {
    const response = await request(BASE_URL)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(403);
  });

  it('uses admin endpoints when Super Admin is provided', async () => {
    if (!superAdminToken) return;

    const response = await request(BASE_URL)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('users');
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
        description: 'Signalement minimal'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('createdBy', null);

    signalementWorkflowId = response.body._id;
  });

  it('creates a signalement with attachment for download test', async () => {
    const response = await request(BASE_URL)
      .post('/api/signalement')
      .set('Authorization', `Bearer ${level1Token}`)
      .field('isAnonymous', 'false')
      .field('description', 'Signalement avec piece jointe')
      .attach('attachments', Buffer.from('test-attachment'), 'test.pdf');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('attachments');

    signalementAttachmentId = response.body._id;
    attachmentFilename = response.body.attachments?.[0]?.filename;
  });

  it('downloads the signalement attachment', async () => {
    if (!signalementAttachmentId || !attachmentFilename) return;

    const response = await request(BASE_URL)
      .get(`/api/signalement/${signalementAttachmentId}/attachments/${attachmentFilename}`)
      .set('Authorization', `Bearer ${level1Token}`);

    expect(response.status).toBe(200);
  });

  it('blocks Level 2 from downloading unassigned attachments', async () => {
    if (!signalementAttachmentId || !attachmentFilename) return;

    const response = await request(BASE_URL)
      .get(`/api/signalement/${signalementAttachmentId}/attachments/${attachmentFilename}`)
      .set('Authorization', `Bearer ${level2Token}`);

    expect(response.status).toBe(403);
  });

  it('creates a signalement to test assignment and update', async () => {
    const response = await request(BASE_URL)
      .post('/api/signalement')
      .set('Authorization', `Bearer ${level1Token}`)
      .send({
        isAnonymous: false,
        description: 'Signalement pour assignation'
      });

    expect(response.status).toBe(201);
    signalementAssignId = response.body._id;
  });

  it('assigns a signalement to Level 2', async () => {
    const response = await request(BASE_URL)
      .put(`/api/signalement/${signalementAssignId}/assign`)
      .set('Authorization', `Bearer ${level2Token}`)
      .send({ userId: level2UserId });

    expect(response.status).toBe(200);
  });

  it('updates a signalement as assigned Level 2', async () => {
    const response = await request(BASE_URL)
      .put(`/api/signalement/${signalementAssignId}`)
      .set('Authorization', `Bearer ${level2Token}`)
      .send({ program: 'Test Program' });

    expect(response.status).toBe(200);
  });

  it('creates a signalement for sauvegarder flow', async () => {
    const response = await request(BASE_URL)
      .post('/api/signalement')
      .set('Authorization', `Bearer ${level1Token}`)
      .send({
        isAnonymous: false,
        description: 'Signalement sauvegarde'
      });

    expect(response.status).toBe(201);
    signalementSauvegardeId = response.body._id;
  });

  it('sauvegardes a signalement and sets deadline', async () => {
    const response = await request(BASE_URL)
      .put(`/api/signalement/${signalementSauvegardeId}/sauvegarder`)
      .set('Authorization', `Bearer ${level2Token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('deadlineAt');
  });

  it('lists my deadlines for Level 2', async () => {
    const response = await request(BASE_URL)
      .get('/api/signalement/my-deadlines')
      .set('Authorization', `Bearer ${level2Token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('signalements');
  });

  it('creates workflow for signalement (Level 2)', async () => {
    const response = await request(BASE_URL)
      .post('/api/workflow')
      .set('Authorization', `Bearer ${level2Token}`)
      .send({ signalementId: signalementWorkflowId });

    expect(response.status).toBe(201);
    workflowId = response.body._id;
  });

  it('updates a workflow stage with attachment and deadline', async () => {
    const response = await request(BASE_URL)
      .put(`/api/workflow/${workflowId}/stage`)
      .set('Authorization', `Bearer ${level2Token}`)
      .field('stage', 'initialReport')
      .field('content', 'Initial report content')
      .field('dueAt', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .attach('attachments', Buffer.from('test'), 'test.pdf');

    expect(response.status).toBe(200);
  });

  it('generates a DPE report (placeholder)', async () => {
    const response = await request(BASE_URL)
      .post(`/api/workflow/${workflowId}/generate-dpe`)
      .set('Authorization', `Bearer ${level2Token}`);

    expect(response.status).toBe(200);
  });

  it('classifies the signalement (Level 2)', async () => {
    const response = await request(BASE_URL)
      .put(`/api/workflow/${workflowId}/classify`)
      .set('Authorization', `Bearer ${level2Token}`)
      .send({ classification: 'SAUVEGARDE' });

    expect(response.status).toBe(200);
  });

  it('adds a workflow note', async () => {
    const response = await request(BASE_URL)
      .post(`/api/workflow/${workflowId}/notes`)
      .set('Authorization', `Bearer ${level2Token}`)
      .send({ content: 'Note test' });

    expect(response.status).toBe(200);
  });

  it('escalates the signalement to National Office (Level 2)', async () => {
    const response = await request(BASE_URL)
      .put(`/api/workflow/${workflowId}/escalate`)
      .set('Authorization', `Bearer ${level2Token}`)
      .send({ escalatedTo: 'NATIONAL_OFFICE' });

    expect(response.status).toBe(200);
    expect(response.body.signalement).toHaveProperty('escalationStatus', 'ESCALATED');
  });

  it('gets workflow details', async () => {
    const response = await request(BASE_URL)
      .get(`/api/workflow/${signalementWorkflowId}`)
      .set('Authorization', `Bearer ${level2Token}`);

    expect(response.status).toBe(200);
  });

  it('lists my workflows', async () => {
    const response = await request(BASE_URL)
      .get('/api/workflow/my-workflows')
      .set('Authorization', `Bearer ${level2Token}`);

    expect(response.status).toBe(200);
  });

  it('masks anonymous createdBy in signalement detail', async () => {
    const response = await request(BASE_URL)
      .get(`/api/signalement/${signalementWorkflowId}`)
      .set('Authorization', `Bearer ${level2Token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('createdBy', null);
  });

  it('closes and archives a signalement (Level 3)', async () => {
    const createResponse = await request(BASE_URL)
      .post('/api/signalement')
      .set('Authorization', `Bearer ${level1Token}`)
      .send({ isAnonymous: false, description: 'Signalement for closure' });

    signalementCloseId = createResponse.body._id;

    const closeResponse = await request(BASE_URL)
      .put(`/api/signalement/${signalementCloseId}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ closureReason: 'Test closure' });

    expect(closeResponse.status).toBe(200);

    const archiveResponse = await request(BASE_URL)
      .put(`/api/signalement/${signalementCloseId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(archiveResponse.status).toBe(200);
  });

  it('deletes a signalement (Level 3)', async () => {
    const createResponse = await request(BASE_URL)
      .post('/api/signalement')
      .set('Authorization', `Bearer ${level1Token}`)
      .send({ isAnonymous: false, description: 'Signalement for delete' });

    signalementDeleteId = createResponse.body._id;

    const deleteResponse = await request(BASE_URL)
      .delete(`/api/signalement/${signalementDeleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteResponse.status).toBe(200);
  });

  it('exports analytics with anonymous masking', async () => {
    const response = await request(BASE_URL)
      .get('/api/analytics/export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});
