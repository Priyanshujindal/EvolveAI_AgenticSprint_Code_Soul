const { hitlAgent } = require('../agents/hitlAgent');

module.exports = async function submitFeedback(req, res) {
  try {
    const { userId = 'demo', feedback } = req.body || {};
    const saved = await hitlAgent(userId, feedback);
    res.json({ ok: true, data: saved });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};


