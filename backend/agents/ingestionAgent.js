// Data ingestion and normalization stub
async function ingestionAgent(input) {
  const payload = input || {};
  const patient = payload.patient || {};
  const notes = typeof payload.notes === 'string' ? payload.notes : '';
  const vitals = payload.vitals || {};
  const labs = payload.labs || {};

  // Map commonly provided fields into normalized notes/patient/vitals
  // Accept alternate naming from UI: symptoms, severity, onsetDate, temperatureC
  const mergedPatient = { ...patient };
  if (payload.severity && !mergedPatient.reportedSeverity) {
    mergedPatient.reportedSeverity = payload.severity;
  }
  if (payload.onsetDate && !mergedPatient.onsetDate) {
    mergedPatient.onsetDate = payload.onsetDate;
  }

  const mergedVitals = { ...vitals };
  if (payload.vitals && typeof payload.vitals.temperatureC !== 'undefined') {
    mergedVitals.temperatureC = payload.vitals.temperatureC;
  } else if (typeof payload.temperatureC !== 'undefined') {
    mergedVitals.temperatureC = payload.temperatureC;
  }

  const mergedNotes = [
    notes,
    payload.symptoms ? `Symptoms: ${String(payload.symptoms)}` : null,
    payload.severity ? `Severity: ${String(payload.severity)}` : null,
    payload.onsetDate ? `Onset: ${String(payload.onsetDate)}` : null,
  ].filter(Boolean).join(' | ');

  return {
    patient: mergedPatient,
    notes: mergedNotes,
    vitals: mergedVitals,
    labs,
  };
}

module.exports = { ingestionAgent };


