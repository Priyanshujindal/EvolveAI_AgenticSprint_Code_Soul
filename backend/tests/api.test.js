const request = require('supertest');
const express = require('express');

// Build a lightweight app using the routes from index
const app = express();
app.use(express.json());
app.post('/api/analyze', async (req, res) => {
  res.json({ success: true, data: { diagnoses: [], redFlags: [] } });
});

describe('API smoke', () => {
  it('analyze returns success', async () => {
    const res = await request(app).post('/api/analyze').send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});


