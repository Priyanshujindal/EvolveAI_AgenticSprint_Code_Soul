const { chatWithGemini } = require('../services/googleGeminiService');

async function chatbotAgent(messages, options = {}) {
  // Provide sensible defaults here; allow overrides via options
  const merged = {
    temperature: 0.3,
    topK: 32,
    topP: 0.95,
    maxOutputTokens: 512,
    ...options,
  };
  return chatWithGemini(messages, merged);
}

module.exports = { chatbotAgent };


