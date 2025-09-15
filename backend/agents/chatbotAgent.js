const { chatWithGemini } = require('../services/googleGeminiService');

async function chatbotAgent(messages) {
  return chatWithGemini(messages);
}

module.exports = { chatbotAgent };


