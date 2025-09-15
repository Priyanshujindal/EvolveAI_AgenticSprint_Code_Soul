// Analysis agent stub (mock risk scoring and ranked diagnoses)
async function analysisAgent(normalized) {
  const diagnoses = [
    { label: 'Condition A', confidence: 0.72, evidence: ['fever', 'elevated CRP'] },
    { label: 'Condition B', confidence: 0.18, evidence: ['headache'] },
    { label: 'Condition C', confidence: 0.10, evidence: ['fatigue'] },
  ];

  const redFlags = [
    // Example structure
    // { condition: 'Sepsis', triggered: false, rationale: [] }
  ];

  return {
    diagnoses,
    redFlags,
    explainability: {
      method: 'mock',
      feature_attributions: { temperature: 0.4, crp: 0.25, heart_rate: 0.2 },
    },
  };
}

module.exports = { analysisAgent };


