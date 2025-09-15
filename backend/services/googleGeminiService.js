const { httpClient } = require('../utils/httpClient');
const { GEMINI_API_KEY } = require('../config/config');

async function chatWithGemini(messages) {
  if (!GEMINI_API_KEY) return { reply: 'Gemini API key missing.' };
  // Using Generative Language API (pseudo minimal call)
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  const headers = { 'Content-Type': 'application/json' };
  const params = { key: GEMINI_API_KEY };
  const contents = [
    {
      role: 'user',
      parts: [{ text: messages?.map(m => `${m.role}: ${m.content}`).join('\n') || 'Hello' }]
    }
  ];
  const body = { contents };
  const { data } = await httpClient.post(url, body, { headers, params });
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '...';
  return { reply };
}

module.exports = { chatWithGemini };


