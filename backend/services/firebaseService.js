let admin = null;
try {
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (_) {}

async function getRecentCheckins(userId, limit = 7) {
  if (!admin || !userId) return [];
  try {
    const db = admin.firestore();
    const ref = db
      .collection('users')
      .doc(userId)
      .collection('dailyCheckins')
      .orderBy('date', 'desc')
      .limit(Math.max(1, Math.min(30, Number(limit) || 7)));
    const snap = await ref.get();
    const items = [];
    snap.forEach(doc => {
      const d = doc.data() || {};
      items.push({ id: doc.id, date: d.date, answers: d.answers, notes: d.notes || null });
    });
    return items;
  } catch (_) {
    return [];
  }
}

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

module.exports = { saveAnalysis, saveFeedback, saveRetrainingRecord, getRecentCheckins };


