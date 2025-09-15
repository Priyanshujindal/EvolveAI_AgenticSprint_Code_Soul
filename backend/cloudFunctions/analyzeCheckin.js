const { ingestionAgent } = require('../agents/ingestionAgent');
const { analysisAgent } = require('../agents/analysisAgent');
const { advisoryAgent } = require('../agents/advisoryAgent');
const { saveAnalysis } = require('../services/firebaseService');

module.exports = async function analyzeCheckin(req, res) {
  try {
    const payload = req.body || {};
    const normalized = await ingestionAgent(payload);
    const analysis = await analysisAgent(normalized);
    const advisory = await advisoryAgent(analysis);

    const userId = (req.user && req.user.uid) || payload.userId || 'anonymous';
    const saved = await saveAnalysis(userId, { input: payload, result: advisory });

    res.json({ ok: true, data: advisory, saved });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};


