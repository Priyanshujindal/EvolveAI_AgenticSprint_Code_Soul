const { httpClient } = require('../utils/httpClient');
const { GEMINI_API_KEY, GEMINI_MODEL } = require('../config/config');

// Default system behavior to improve clinical assistant responses
const DEFAULT_SYSTEM_PROMPT = [
  'You are a helpful, concise clinical assistant for clinicians and patients.',
  'Answer clearly and safely. If uncertain, say you are not sure.',
  'Do not provide diagnoses or treatment unless explicitly asked. Include disclaimers as appropriate.',
].join(' ');

// Trim history to last N turns to limit token usage
function trimHistory(messages, maxTurns = 12) {
  const safe = Array.isArray(messages) ? messages.filter(m => m && m.content) : [];
  if (safe.length <= maxTurns) return safe;
  return safe.slice(-maxTurns);
}

function buildContents(messages, systemPrompt) {
  const parts = [];
  if (systemPrompt) {
    parts.push({ role: 'user', parts: [{ text: `System: ${systemPrompt}` }] });
  }
  const text = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  parts.push({ role: 'user', parts: [{ text }] });
  return parts;
}

async function chatWithGemini(messages, options = {}) {
  if (!GEMINI_API_KEY) return { reply: 'Gemini API key missing.' };

  const model = (options && options.model) || GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const headers = { 'Content-Type': 'application/json' };
  const params = { key: GEMINI_API_KEY };

  const {
    temperature = 0.3,
    topK = 32,
    topP = 0.95,
    maxOutputTokens = 512,
    safetySettings = [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
  } = options || {};

  const trimmed = trimHistory(messages);
  const contents = buildContents(trimmed, systemPrompt);
  const generationConfig = { temperature, topK, topP, maxOutputTokens };

  const body = { contents, generationConfig, safetySettings };

  try {
    const { data } = await httpClient.post(url, body, { headers, params, timeout: 30000 });
    const candidate = data?.candidates?.[0];
    const blocked = candidate?.safetyRatings?.some(r => r.blocked);
    const reply = candidate?.content?.parts?.[0]?.text || '...';
    return { reply, blocked: !!blocked };
  } catch (error) {
    const status = error?.response?.status;
    const message = error?.response?.data?.error?.message || error?.message || 'Unknown error';
    return { reply: `Sorry, I had trouble generating a response. (${status || 'ERR'})`, error: message };
  }
}

module.exports = { chatWithGemini };


