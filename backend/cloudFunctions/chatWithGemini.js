const { chatbotAgent } = require('../agents/chatbotAgent');

module.exports = async function chatWithGemini(req, res) {
  try {
    const { messages = [] } = req.body || {};
    const reply = await chatbotAgent(messages);
    res.json({ ok: true, data: reply });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};


