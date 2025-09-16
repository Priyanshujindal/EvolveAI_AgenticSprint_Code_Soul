const { chatbotAgent } = require('../agents/chatbotAgent');
const { getRecentCheckins } = require('../services/firebaseService');

module.exports = async function chatWithGemini(req, res) {
  try {
    const { messages = [], options = {} } = req.body || {};

    // Determine user id (prefer authenticated user; fallback to header for dev)
    const userId = (req.user && req.user.uid) || req.headers['x-user-id'] || null;

    let systemPrompt = options.systemPrompt;

    // If requested, fetch recent check-ins and inject concise summary into system prompt
    if (options.useCheckins && userId) {
      try {
        const checkins = await getRecentCheckins(userId, options.checkinLimit || 7);
        if (Array.isArray(checkins) && checkins.length > 0) {
          const latest = checkins[0];
          const formatDate = (d) => {
            try {
              const ts = (d && d.toDate) ? d.toDate() : (d?._seconds ? new Date(d._seconds * 1000) : new Date(d));
              return ts.toISOString().slice(0, 10);
            } catch (_) { return 'recent'; }
          };
          const latestDate = formatDate(latest.date);
          const summarizeAnswers = (a) => {
            if (!a || typeof a !== 'object') return 'no answers';
            const keys = Object.keys(a).slice(0, 8);
            return keys.map(k => `${k}:${String(a[k]).slice(0, 20)}`).join(', ');
          };
          const latestSummary = `Latest check-in (${latestDate}): ${summarizeAnswers(latest.answers)}${latest.notes ? `; notes: ${String(latest.notes).slice(0, 60)}` : ''}`;

          // Simple count-only history context to keep prompt small
          const historyCount = checkins.length;
          // Simple frequency-based trend over the last 7 days
          const now = Date.now();
          const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
          const recent7 = checkins.filter(c => {
            try {
              const dt = (c.date && c.date.toDate) ? c.date.toDate().getTime() : (c.date?._seconds ? c.date._seconds * 1000 : Date.parse(c.date));
              return Number.isFinite(dt) && dt >= sevenDaysAgo;
            } catch (_) { return false; }
          }).length;
          let trendFreq = 'Sparse (<=1/7)';
          if (recent7 >= 5) trendFreq = 'Regular (>=5/7)';
          else if (recent7 >= 2) trendFreq = 'Intermittent (2-4/7)';
          const historyLine = `History: ${historyCount} recent check-ins; cadence: ${trendFreq}.`;

          const prefix = `You are a health assistant. Use the user's recent daily check-ins to ground answers. If the user asks about their health, reference the latest check-in when relevant, avoid speculation, and encourage clinical follow-up for red-flag symptoms.`;
          const context = `${prefix}\n${historyLine}\n${latestSummary}`;
          systemPrompt = systemPrompt ? `${systemPrompt}\n\n${context}` : context;
        }
      } catch (_) {
        // fail open without check-in context
      }
    }

    const mergedOptions = { ...options, systemPrompt };
    const result = await chatbotAgent(messages, mergedOptions);
    res.json({ ok: true, data: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};


