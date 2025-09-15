const { chatbotAgent } = require('../agents/chatbotAgent');

module.exports = async function chatWithGemini(req, res) {
  try {
    const { messages = [], options = {} } = req.body || {};
    const result = await chatbotAgent(messages, options);
    res.json({ ok: true, data: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};


