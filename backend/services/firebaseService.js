let admin = null;
try {
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (_) {}

async function saveAnalysis(userId, analysis) {
  if (!admin) return { id: 'mock-id', userId, analysis };
  const db = admin.firestore();
  const ref = await db.collection('analyses').add({ userId, analysis, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  return { id: ref.id };
}

async function saveFeedback(userId, feedback) {
  if (!admin) return { id: 'mock-feedback-id', userId, feedback };
  const db = admin.firestore();
  const ref = await db.collection('feedback').add({ userId, feedback, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  return { id: ref.id };
}

async function saveRetrainingRecord(userId, feedback) {
  // Save records to Firestore if available; otherwise append to a local JSON file for dev
  if (admin) {
    const db = admin.firestore();
    const ref = await db.collection('retraining_records').add({ userId, feedback, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return { id: ref.id };
  }
  try {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(process.cwd(), 'feedback_export.json');
    let items = [];
    if (fs.existsSync(file)) {
      items = JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
    }
    items.push({ userId, feedback, createdAt: new Date().toISOString() });
    fs.writeFileSync(file, JSON.stringify(items, null, 2));
    return { file };
  } catch (_) {
    return { skipped: true };
  }
}

module.exports = { saveAnalysis, saveFeedback, saveRetrainingRecord };


