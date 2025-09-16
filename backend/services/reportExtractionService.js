// Simple regex-based extraction of common medical report entities from OCR text
// Optionally, can be extended to call LLM for normalization when configured.

let gemini = null;
try {
  gemini = require('./googleGeminiService');
} catch (_) {}

function toNumber(value) {
  if (typeof value !== 'string') return null;
  const m = value.replace(/[, ]/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function extractLabs(text) {
  const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const labs = [];
  const patterns = [
    { key: 'hemoglobin', rx: /(hemoglobin|hgb)\s*[:=\-]?\s*([\d.,]+)\s*(g\/dl|g\s*per\s*dl)?/i, unit: 'g/dL' },
    { key: 'wbc', rx: /(white\s*blood\s*cell\s*count|wbc)\s*[:=\-]?\s*([\d.,]+)\s*(x?10\^?3\/?\u00b5?l|10\^9\/L|k\/\u00b5l)?/i, unit: '10^3/µL' },
    { key: 'platelets', rx: /(platelets?|plt)\s*[:=\-]?\s*([\d.,]+)\s*(x?10\^?3\/?\u00b5?l|10\^9\/L|k\/\u00b5l)?/i, unit: '10^3/µL' },
    { key: 'glucose', rx: /(glucose|fasting\s*glucose)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mmol\/l)?/i, unit: 'mg/dL' },
    { key: 'creatinine', rx: /(creatinine|serum\s*creatinine)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|\u00b5mol\/l)?/i, unit: 'mg/dL' },
    { key: 'urea', rx: /(urea|bun)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mmol\/l)?/i, unit: 'mg/dL' },
    { key: 'sodium', rx: /(sodium|na\b)\s*[:=\-]?\s*([\d.,]+)\s*(mmol\/l|meq\/l)?/i, unit: 'mmol/L' },
    { key: 'potassium', rx: /(potassium|k\b)\s*[:=\-]?\s*([\d.,]+)\s*(mmol\/l|meq\/l)?/i, unit: 'mmol/L' },
    { key: 'hbA1c', rx: /(hba1c|glycated\s*hemoglobin)\s*[:=\-]?\s*([\d.,]+)\s*%?/i, unit: '%' },
  ];

  for (const line of lines) {
    for (const p of patterns) {
      const m = line.match(p.rx);
      if (m) {
        labs.push({
          name: p.key,
          value: toNumber(m[2]),
          unit: (m[3] && m[3].replace(/\s+/g, '')) || p.unit || '',
          raw: line,
          confidence: 0.7,
        });
      }
    }
  }
  // Deduplicate by name keeping the last occurrence
  const byName = new Map();
  for (const l of labs) byName.set(l.name, l);
  return Array.from(byName.values());
}

function extractMeta(text) {
  const meta = {};
  const d = (text || '').match(/(?:date|reported\s*on)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\-]\d{2}[\-]\d{2})/i);
  if (d) meta.date = d[1];
  const name = (text || '').match(/(?:patient|name)\s*[:\-]?\s*([A-Za-z ,.'-]{3,})/i);
  if (name) meta.patientName = name[1].trim();
  const mrn = (text || '').match(/(?:mrn|medical\s*record\s*number|patient\s*id)\s*[:\-]?\s*([A-Za-z0-9\-]+)/i);
  if (mrn) meta.patientId = mrn[1];
  return meta;
}

async function maybeGeminiExtraction(text) {
  if (!gemini || !gemini.chatWithGemini) return null;
  const systemPrompt = 'You extract structured clinical data from noisy OCR text. Return strict JSON with keys: meta{patientName,patientId,date}, labs[{name,value,unit}], diagnoses[], medications[]. Use null when unknown. Do not include any prose.';
  const messages = [
    { role: 'user', content: text.slice(0, 15000) }
  ];
  try {
    const result = await gemini.chatWithGemini(messages, { systemPrompt });
    const data = result && (result.data || result.response || result);
    // Best-effort normalization
    if (data && (data.meta || data.labs || data.diagnoses || data.medications)) return data;
  } catch (_) {}
  return null;
}

async function extractStructuredFromOcr(text, { useLLM = false } = {}) {
  const base = {
    meta: extractMeta(text || ''),
    labs: extractLabs(text || ''),
    diagnoses: [],
    medications: [],
  };
  if (useLLM) {
    const llm = await maybeGeminiExtraction(text || '');
    if (llm) {
      return {
        meta: { ...base.meta, ...(llm.meta || {}) },
        labs: Array.isArray(llm.labs) && llm.labs.length ? llm.labs : base.labs,
        diagnoses: Array.isArray(llm.diagnoses) ? llm.diagnoses : base.diagnoses,
        medications: Array.isArray(llm.medications) ? llm.medications : base.medications,
      };
    }
  }
  return base;
}

module.exports = { extractStructuredFromOcr };


