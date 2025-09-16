const { ingestionAgent } = require('../agents/ingestionAgent');
const { analysisAgent } = require('../agents/analysisAgent');
const { advisoryAgent } = require('../agents/advisoryAgent');
const { saveAnalysis } = require('../services/firebaseService');
const { httpClient } = require('../utils/httpClient');
const { AI_SERVICE_URL } = require('../config/config');

module.exports = async function analyzeCheckin(req, res) {
  try {
    const payload = req.body || {};
    let advisory = null;
    // Prefer configured URL; in dev, auto-try localhost if env not set
    const usePython = AI_SERVICE_URL || 'http://localhost:8000';
    const forceLocal = !!(payload && payload.payload && payload.payload.forceLocal);
    if (usePython && !forceLocal) {
      try {
        const body = {
          notes: payload?.payload?.notes || 'daily checkin',
          vitals: {},
          labs: {},
          topK: payload?.payload?.topK,
          explainMethod: payload?.payload?.explainMethod,
          useScipyWinsorize: payload?.payload?.useScipyWinsorize,
        };
        const { data } = await httpClient.post(`${usePython.replace(/\/$/, '')}/analyze`, body, { timeout: 8000 });
        advisory = await advisoryAgent(data);
      } catch (e) {
        // fall back to local analysis below
        console.warn('[analyzeCheckin] Python AI service unavailable, fallback to local:', e?.message || e);
      }
    }
    if (!advisory) {
      const normalized = await ingestionAgent(payload);
      const analysis = await analysisAgent(normalized);
      advisory = await advisoryAgent(analysis);
    }

    const userId = (req.user && req.user.uid) || payload.userId || 'anonymous';
    const saved = await saveAnalysis(userId, { input: payload, result: advisory });

    res.json({ ok: true, data: advisory, saved });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};


