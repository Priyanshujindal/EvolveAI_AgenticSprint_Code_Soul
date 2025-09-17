// Enhanced medical report extraction with comprehensive lab patterns and AI-powered parsing
// Supports 50+ lab types with improved accuracy and confidence scoring

let gemini = null;
try {
  gemini = require('./googleGeminiService');
} catch (_) {}

function toNumber(value) {
  if (typeof value !== 'string') return null;
  // Handle various number formats including scientific notation
  const cleaned = value.replace(/[^\d.,\-+eE]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function calculateConfidence(match, pattern, line) {
  let confidence = 0.5; // Base confidence
  
  // Higher confidence for exact matches
  if (match[0].toLowerCase().includes(pattern.key.toLowerCase())) {
    confidence += 0.2;
  }
  
  // Higher confidence for complete unit matches
  if (match[3] && match[3].trim()) {
    confidence += 0.1;
  }
  
  // Higher confidence for values in reasonable ranges
  const value = toNumber(match[2]);
  if (value !== null) {
    const ranges = getReferenceRanges(pattern.key);
    if (ranges && value >= ranges.min * 0.1 && value <= ranges.max * 10) {
      confidence += 0.2;
    }
  }
  
  return Math.min(confidence, 0.95);
}

function getReferenceRanges(labKey) {
  const ranges = {
    hemoglobin: { min: 8, max: 20, unit: 'g/dL' },
    glucose: { min: 50, max: 300, unit: 'mg/dL' },
    creatinine: { min: 0.3, max: 3.0, unit: 'mg/dL' },
    wbc: { min: 2, max: 20, unit: '10^3/µL' },
    platelets: { min: 50, max: 500, unit: '10^3/µL' },
    sodium: { min: 120, max: 160, unit: 'mmol/L' },
    potassium: { min: 2.5, max: 6.0, unit: 'mmol/L' },
    urea: { min: 5, max: 50, unit: 'mg/dL' },
    hba1c: { min: 4, max: 15, unit: '%' },
    alt: { min: 5, max: 100, unit: 'U/L' },
    ast: { min: 5, max: 100, unit: 'U/L' },
    bilirubin: { min: 0.1, max: 3.0, unit: 'mg/dL' },
    albumin: { min: 2.5, max: 5.5, unit: 'g/dL' },
    calcium: { min: 8.0, max: 12.0, unit: 'mg/dL' },
    phosphorus: { min: 2.5, max: 5.0, unit: 'mg/dL' },
    magnesium: { min: 1.5, max: 2.5, unit: 'mg/dL' },
    chloride: { min: 95, max: 110, unit: 'mmol/L' },
    co2: { min: 20, max: 35, unit: 'mmol/L' },
    bun: { min: 5, max: 25, unit: 'mg/dL' },
    cholesterol: { min: 100, max: 300, unit: 'mg/dL' },
    hdl: { min: 20, max: 100, unit: 'mg/dL' },
    ldl: { min: 50, max: 200, unit: 'mg/dL' },
    triglycerides: { min: 50, max: 500, unit: 'mg/dL' },
    tsh: { min: 0.3, max: 5.0, unit: 'mIU/L' },
    t4: { min: 4.5, max: 12.5, unit: 'µg/dL' },
    t3: { min: 80, max: 200, unit: 'ng/dL' },
    ferritin: { min: 10, max: 300, unit: 'ng/mL' },
    iron: { min: 30, max: 200, unit: 'µg/dL' },
    tibc: { min: 200, max: 500, unit: 'µg/dL' },
    transferrin: { min: 200, max: 400, unit: 'mg/dL' },
    vitamin_d: { min: 20, max: 100, unit: 'ng/mL' },
    vitamin_b12: { min: 200, max: 1000, unit: 'pg/mL' },
    folate: { min: 3, max: 20, unit: 'ng/mL' },
    psa: { min: 0, max: 10, unit: 'ng/mL' },
    crp: { min: 0, max: 10, unit: 'mg/L' },
    esr: { min: 0, max: 50, unit: 'mm/hr' },
    pt: { min: 10, max: 20, unit: 'seconds' },
    ptt: { min: 25, max: 45, unit: 'seconds' },
    inr: { min: 0.8, max: 4.0, unit: 'ratio' },
    d_dimer: { min: 0, max: 1, unit: 'mg/L' },
    troponin: { min: 0, max: 0.1, unit: 'ng/mL' },
    ck_mb: { min: 0, max: 25, unit: 'ng/mL' },
    bnp: { min: 0, max: 100, unit: 'pg/mL' },
    nt_probnp: { min: 0, max: 500, unit: 'pg/mL' },
    lactate: { min: 0.5, max: 3.0, unit: 'mmol/L' },
    ammonia: { min: 10, max: 80, unit: 'µmol/L' },
    uric_acid: { min: 2.0, max: 8.0, unit: 'mg/dL' },
    lactate_dehydrogenase: { min: 100, max: 300, unit: 'U/L' },
    alkaline_phosphatase: { min: 30, max: 130, unit: 'U/L' },
    gamma_gt: { min: 5, max: 60, unit: 'U/L' },
    amylase: { min: 20, max: 100, unit: 'U/L' },
    lipase: { min: 10, max: 60, unit: 'U/L' }
  };
  return ranges[labKey];
}

function extractLabs(text) {
  const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const labs = [];
  
  // Comprehensive lab patterns with improved regex and confidence scoring
  const patterns = [
    // Blood Count
    { key: 'hemoglobin', rx: /(hemoglobin|hgb|hgb|hb)\s*[:=\-]?\s*([\d.,]+)\s*(g\/dl|g\s*per\s*dl|g\/dL)?/i, unit: 'g/dL' },
    { key: 'wbc', rx: /(white\s*blood\s*cell\s*count|wbc|leukocyte\s*count)\s*[:=\-]?\s*([\d.,]+)\s*(x?10\^?3\/?\u00b5?l|10\^9\/L|k\/\u00b5l|k\/ul)?/i, unit: '10^3/µL' },
    { key: 'rbc', rx: /(red\s*blood\s*cell\s*count|rbc|erythrocyte\s*count)\s*[:=\-]?\s*([\d.,]+)\s*(x?10\^?6\/?\u00b5?l|10\^12\/L|m\/\u00b5l)?/i, unit: '10^6/µL' },
    { key: 'platelets', rx: /(platelets?|plt|thrombocyte\s*count)\s*[:=\-]?\s*([\d.,]+)\s*(x?10\^?3\/?\u00b5?l|10\^9\/L|k\/\u00b5l|k\/ul)?/i, unit: '10^3/µL' },
    { key: 'hematocrit', rx: /(hematocrit|hct|packed\s*cell\s*volume)\s*[:=\-]?\s*([\d.,]+)\s*%?/i, unit: '%' },
    { key: 'mcv', rx: /(mean\s*corpuscular\s*volume|mcv)\s*[:=\-]?\s*([\d.,]+)\s*(fl|fL)?/i, unit: 'fL' },
    { key: 'mch', rx: /(mean\s*corpuscular\s*hemoglobin|mch)\s*[:=\-]?\s*([\d.,]+)\s*(pg|pG)?/i, unit: 'pg' },
    { key: 'mchc', rx: /(mean\s*corpuscular\s*hemoglobin\s*concentration|mchc)\s*[:=\-]?\s*([\d.,]+)\s*(g\/dl|g\/dL)?/i, unit: 'g/dL' },
    
    // Basic Metabolic Panel
    { key: 'glucose', rx: /(glucose|fasting\s*glucose|blood\s*sugar)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mmol\/l|mg\/dL)?/i, unit: 'mg/dL' },
    { key: 'creatinine', rx: /(creatinine|serum\s*creatinine|cr)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|\u00b5mol\/l|mg\/dL)?/i, unit: 'mg/dL' },
    { key: 'urea', rx: /(urea|bun|blood\s*urea\s*nitrogen)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mmol\/l|mg\/dL)?/i, unit: 'mg/dL' },
    { key: 'sodium', rx: /(sodium|na\b)\s*[:=\-]?\s*([\d.,]+)\s*(mmol\/l|meq\/l|mEq\/L)?/i, unit: 'mmol/L' },
    { key: 'potassium', rx: /(potassium|k\b)\s*[:=\-]?\s*([\d.,]+)\s*(mmol\/l|meq\/l|mEq\/L)?/i, unit: 'mmol/L' },
    { key: 'chloride', rx: /(chloride|cl\b)\s*[:=\-]?\s*([\d.,]+)\s*(mmol\/l|meq\/l|mEq\/L)?/i, unit: 'mmol/L' },
    { key: 'co2', rx: /(co2|bicarbonate|hco3|total\s*co2)\s*[:=\-]?\s*([\d.,]+)\s*(mmol\/l|meq\/l|mEq\/L)?/i, unit: 'mmol/L' },
    
    // Liver Function
    { key: 'alt', rx: /(alt|alanine\s*aminotransferase|sgot)\s*[:=\-]?\s*([\d.,]+)\s*(u\/l|U\/L|iu\/l)?/i, unit: 'U/L' },
    { key: 'ast', rx: /(ast|aspartate\s*aminotransferase|sgpt)\s*[:=\-]?\s*([\d.,]+)\s*(u\/l|U\/L|iu\/l)?/i, unit: 'U/L' },
    { key: 'bilirubin', rx: /(bilirubin|total\s*bilirubin|tbil)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mg\/dL|\u00b5mol\/l)?/i, unit: 'mg/dL' },
    { key: 'albumin', rx: /(albumin|alb)\s*[:=\-]?\s*([\d.,]+)\s*(g\/dl|g\/dL|g\/l)?/i, unit: 'g/dL' },
    { key: 'alkaline_phosphatase', rx: /(alkaline\s*phosphatase|alp|alk\s*phos)\s*[:=\-]?\s*([\d.,]+)\s*(u\/l|U\/L|iu\/l)?/i, unit: 'U/L' },
    { key: 'gamma_gt', rx: /(gamma\s*glutamyl\s*transferase|ggt|gamma\s*gt)\s*[:=\-]?\s*([\d.,]+)\s*(u\/l|U\/L|iu\/l)?/i, unit: 'U/L' },
    
    // Lipid Panel
    { key: 'cholesterol', rx: /(total\s*cholesterol|cholesterol|chol)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mg\/dL|mmol\/l)?/i, unit: 'mg/dL' },
    { key: 'hdl', rx: /(hdl|high\s*density\s*lipoprotein|hdl\s*cholesterol)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mg\/dL|mmol\/l)?/i, unit: 'mg/dL' },
    { key: 'ldl', rx: /(ldl|low\s*density\s*lipoprotein|ldl\s*cholesterol)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mg\/dL|mmol\/l)?/i, unit: 'mg/dL' },
    { key: 'triglycerides', rx: /(triglycerides|trig|tg)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mg\/dL|mmol\/l)?/i, unit: 'mg/dL' },
    
    // Diabetes
    { key: 'hbA1c', rx: /(hba1c|glycated\s*hemoglobin|hemoglobin\s*a1c|a1c)\s*[:=\-]?\s*([\d.,]+)\s*%?/i, unit: '%' },
    
    // Thyroid
    { key: 'tsh', rx: /(tsh|thyroid\s*stimulating\s*hormone|thyrotropin)\s*[:=\-]?\s*([\d.,]+)\s*(miu\/l|mIU\/L|uU\/ml)?/i, unit: 'mIU/L' },
    { key: 't4', rx: /(t4|thyroxine|free\s*t4|ft4)\s*[:=\-]?\s*([\d.,]+)\s*(\u00b5g\/dl|ng\/dl|pmol\/l)?/i, unit: 'µg/dL' },
    { key: 't3', rx: /(t3|triiodothyronine|free\s*t3|ft3)\s*[:=\-]?\s*([\d.,]+)\s*(ng\/dl|pg\/ml|pmol\/l)?/i, unit: 'ng/dL' },
    
    // Iron Studies
    { key: 'ferritin', rx: /(ferritin)\s*[:=\-]?\s*([\d.,]+)\s*(ng\/ml|ng\/mL|\u00b5g\/l)?/i, unit: 'ng/mL' },
    { key: 'iron', rx: /(iron|serum\s*iron|fe)\s*[:=\-]?\s*([\d.,]+)\s*(\u00b5g\/dl|ng\/ml|umol\/l)?/i, unit: 'µg/dL' },
    { key: 'tibc', rx: /(tibc|total\s*iron\s*binding\s*capacity)\s*[:=\-]?\s*([\d.,]+)\s*(\u00b5g\/dl|ng\/ml|umol\/l)?/i, unit: 'µg/dL' },
    { key: 'transferrin', rx: /(transferrin|trf)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|g\/l|mg\/dL)?/i, unit: 'mg/dL' },
    
    // Vitamins
    { key: 'vitamin_d', rx: /(vitamin\s*d|25\s*oh\s*vitamin\s*d|25\s*ohd|d25)\s*[:=\-]?\s*([\d.,]+)\s*(ng\/ml|ng\/mL|nmol\/l)?/i, unit: 'ng/mL' },
    { key: 'vitamin_b12', rx: /(vitamin\s*b12|b12|cobalamin)\s*[:=\-]?\s*([\d.,]+)\s*(pg\/ml|pmol\/l|pg\/mL)?/i, unit: 'pg/mL' },
    { key: 'folate', rx: /(folate|folic\s*acid|folate\s*serum)\s*[:=\-]?\s*([\d.,]+)\s*(ng\/ml|ng\/mL|nmol\/l)?/i, unit: 'ng/mL' },
    
    // Cardiac Markers
    { key: 'troponin', rx: /(troponin|trop\s*i|ctni|ctnt)\s*[:=\-]?\s*([\d.,]+)\s*(ng\/ml|ng\/mL|ug\/l)?/i, unit: 'ng/mL' },
    { key: 'ck_mb', rx: /(ck\s*mb|ckmb|creatine\s*kinase\s*mb)\s*[:=\-]?\s*([\d.,]+)\s*(ng\/ml|ng\/mL|ug\/l)?/i, unit: 'ng/mL' },
    { key: 'bnp', rx: /(bnp|brain\s*natriuretic\s*peptide)\s*[:=\-]?\s*([\d.,]+)\s*(pg\/ml|pg\/mL|ng\/l)?/i, unit: 'pg/mL' },
    { key: 'nt_probnp', rx: /(nt\s*probnp|nt\s*pro\s*bnp)\s*[:=\-]?\s*([\d.,]+)\s*(pg\/ml|pg\/mL|ng\/l)?/i, unit: 'pg/mL' },
    
    // Inflammatory Markers
    { key: 'crp', rx: /(crp|c\s*reactive\s*protein|high\s*sensitivity\s*crp|hs\s*crp)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/l|mg\/L|mg\/dl)?/i, unit: 'mg/L' },
    { key: 'esr', rx: /(esr|erythrocyte\s*sedimentation\s*rate|sed\s*rate)\s*[:=\-]?\s*([\d.,]+)\s*(mm\/hr|mm\/h)?/i, unit: 'mm/hr' },
    
    // Coagulation
    { key: 'pt', rx: /(pt|prothrombin\s*time|protime)\s*[:=\-]?\s*([\d.,]+)\s*(seconds|sec|s)?/i, unit: 'seconds' },
    { key: 'ptt', rx: /(ptt|partial\s*thromboplastin\s*time|aptt)\s*[:=\-]?\s*([\d.,]+)\s*(seconds|sec|s)?/i, unit: 'seconds' },
    { key: 'inr', rx: /(inr|international\s*normalized\s*ratio)\s*[:=\-]?\s*([\d.,]+)\s*(ratio|r)?/i, unit: 'ratio' },
    { key: 'd_dimer', rx: /(d\s*dimer|dimer)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/l|mg\/L|ng\/ml|ug\/ml)?/i, unit: 'mg/L' },
    
    // Other Important Labs
    { key: 'calcium', rx: /(calcium|ca|total\s*calcium)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mg\/dL|mmol\/l)?/i, unit: 'mg/dL' },
    { key: 'phosphorus', rx: /(phosphorus|phosphate|phos|p)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mg\/dL|mmol\/l)?/i, unit: 'mg/dL' },
    { key: 'magnesium', rx: /(magnesium|mg)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mg\/dL|mmol\/l)?/i, unit: 'mg/dL' },
    { key: 'lactate', rx: /(lactate|lactic\s*acid)\s*[:=\-]?\s*([\d.,]+)\s*(mmol\/l|mg\/dl|mmol\/L)?/i, unit: 'mmol/L' },
    { key: 'ammonia', rx: /(ammonia|nh3)\s*[:=\-]?\s*([\d.,]+)\s*(\u00b5mol\/l|umol\/l|ug\/dl)?/i, unit: 'µmol/L' },
    { key: 'uric_acid', rx: /(uric\s*acid|ua)\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mg\/dL|umol\/l)?/i, unit: 'mg/dL' },
    { key: 'psa', rx: /(psa|prostate\s*specific\s*antigen)\s*[:=\-]?\s*([\d.,]+)\s*(ng\/ml|ng\/mL|ug\/l)?/i, unit: 'ng/mL' },
    { key: 'lactate_dehydrogenase', rx: /(lactate\s*dehydrogenase|ldh|ld)\s*[:=\-]?\s*([\d.,]+)\s*(u\/l|U\/L|iu\/l)?/i, unit: 'U/L' },
    { key: 'amylase', rx: /(amylase|amy)\s*[:=\-]?\s*([\d.,]+)\s*(u\/l|U\/L|iu\/l)?/i, unit: 'U/L' },
    { key: 'lipase', rx: /(lipase|lip)\s*[:=\-]?\s*([\d.,]+)\s*(u\/l|U\/L|iu\/l)?/i, unit: 'U/L' }
  ];

  for (const line of lines) {
    for (const p of patterns) {
      const m = line.match(p.rx);
      if (m) {
        const value = toNumber(m[2]);
        const confidence = calculateConfidence(m, p, line);
        
        labs.push({
          name: p.key,
          value: value,
          unit: (m[3] && m[3].replace(/\s+/g, '')) || p.unit || '',
          raw: line,
          confidence: confidence,
          referenceRange: getReferenceRanges(p.key),
          status: value ? getLabStatus(value, p.key) : 'unknown'
        });
      }
    }
  }
  
  // Deduplicate by name keeping the highest confidence occurrence
  const byName = new Map();
  for (const l of labs) {
    const existing = byName.get(l.name);
    if (!existing || l.confidence > existing.confidence) {
      byName.set(l.name, l);
    }
  }
  return Array.from(byName.values());
}

function getLabStatus(value, labKey) {
  const ranges = getReferenceRanges(labKey);
  if (!ranges || value === null) return 'unknown';
  
  if (value < ranges.min) return 'low';
  if (value > ranges.max) return 'high';
  return 'normal';
}

function extractMeta(text) {
  const meta = {};
  
  // Enhanced date extraction with multiple formats
  const datePatterns = [
    /(?:date|reported\s*on|collected\s*on)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:date|reported\s*on|collected\s*on)\s*[:\-]?\s*(\d{4}[\-]\d{2}[\-]\d{2})/i,
    /(?:date|reported\s*on|collected\s*on)\s*[:\-]?\s*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      meta.date = match[1];
      break;
    }
  }
  
  // Enhanced patient name extraction
  const namePatterns = [
    /(?:patient|name|patient\s*name)\s*[:\-]?\s*([A-Za-z ,.'-]{3,})/i,
    /(?:patient|name|patient\s*name)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      meta.patientName = match[1].trim();
      break;
    }
  }
  
  // Enhanced patient ID extraction
  const idPatterns = [
    /(?:mrn|medical\s*record\s*number|patient\s*id|id)\s*[:\-]?\s*([A-Za-z0-9\-]+)/i,
    /(?:mrn|medical\s*record\s*number|patient\s*id|id)\s*[:\-]?\s*(\d+)/i
  ];
  
  for (const pattern of idPatterns) {
    const match = text.match(pattern);
    if (match) {
      meta.patientId = match[1];
      break;
    }
  }
  
  // Extract age and gender if available
  const ageMatch = text.match(/(?:age)\s*[:\-]?\s*(\d+)/i);
  if (ageMatch) meta.age = parseInt(ageMatch[1]);
  
  const genderMatch = text.match(/(?:gender|sex)\s*[:\-]?\s*(male|female|m|f)/i);
  if (genderMatch) meta.gender = genderMatch[1].toLowerCase();
  
  return meta;
}

async function maybeGeminiExtraction(text) {
  if (!gemini || !gemini.chatWithGemini) return null;
  
  const systemPrompt = `You are a medical AI assistant that extracts structured clinical data from OCR text. 
  Return ONLY valid JSON with this exact structure:
  {
    "meta": {
      "patientName": "string or null",
      "patientId": "string or null", 
      "date": "string or null",
      "age": "number or null",
      "gender": "string or null"
    },
    "labs": [
      {
        "name": "string",
        "value": "number or null",
        "unit": "string",
        "confidence": "number between 0-1"
      }
    ],
    "diagnoses": ["string array"],
    "medications": ["string array"]
  }
  
  Extract all lab values you can find. Use null for missing values. Be precise with units and values.`;

  const messages = [
    { role: 'user', content: text.slice(0, 15000) }
  ];
  
  try {
    const result = await gemini.chatWithGemini(messages, { 
      systemPrompt,
      temperature: 0.1,
      maxOutputTokens: 2048
    });
    
    const data = result && (result.data || result.response || result);
    if (data && (data.meta || data.labs || data.diagnoses || data.medications)) {
      return data;
    }
  } catch (error) {
    console.warn('Gemini extraction failed:', error.message);
  }
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