const { saveAnalysis, saveFeedback, saveRetrainingRecord } = require('../services/firebaseService');

async function hitlAgent(userId, feedback) {
  const savedFeedback = await saveFeedback(userId, feedback);
  // Store a retraining record for later export
  try {
    await saveRetrainingRecord(userId, feedback);
  } catch (_) {}
  return savedFeedback;
}

module.exports = { hitlAgent };


