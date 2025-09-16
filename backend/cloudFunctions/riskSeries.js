const { httpClient } = require('../utils/httpClient');
const { AI_SERVICE_URL } = require('../config/config');
const { getRecentCheckins } = require('../services/firebaseService');

module.exports = async function riskSeries(req, res) {
  try {
    const userId = (req.user && req.user.uid) || (req.body && req.body.userId) || req.query.userId;
    if (!userId) return res.status(400).json({ ok: false, error: 'Missing userId' });

    const items = await getRecentCheckins(userId, 30);
    const reversed = items.slice().reverse();
    const labels = reversed.map(it => (it?.date?.toDate ? it.date.toDate().toISOString().slice(0, 10) : ''));

    // Prefer configured URL; in dev, auto-try localhost if env not set
    const usePython = AI_SERVICE_URL || 'http://localhost:8000';
    let points = [];
    if (usePython) {
      try {
        // For now, approximate risk using top-1 diagnosis confidence from python per checkin notes only
        const results = [];
        for (const it of reversed) {
          const body = { notes: it.notes || 'daily checkin' };
          const { data } = await httpClient.post(`${usePython.replace(/\/$/, '')}/analyze`, body, { timeout: 5000 });
          const top = Array.isArray(data?.diagnoses) && data.diagnoses[0] ? Number(data.diagnoses[0].confidence) : null;
          results.push(typeof top === 'number' ? top : 0.5);
        }
        points = results;
      } catch (e) {
        // fall back to simple client-side compatible average if python unavailable
        points = reversed.map(() => 0.5);
      }
    } else {
      points = reversed.map(() => 0.5);
    }

    return res.json({ ok: true, labels, points });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};


