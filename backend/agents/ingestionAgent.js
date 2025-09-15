// Data ingestion and normalization stub
async function ingestionAgent(input) {
  const payload = input || {};
  const patient = payload.patient || {};
  const notes = payload.notes || '';
  const vitals = payload.vitals || {};
  const labs = payload.labs || {};

  return {
    patient,
    notes,
    vitals,
    labs,
  };
}

module.exports = { ingestionAgent };


