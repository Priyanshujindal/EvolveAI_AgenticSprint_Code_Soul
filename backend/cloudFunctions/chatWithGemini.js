const { chatbotAgent } = require('../agents/chatbotAgent');
const { getRecentCheckins, getAllCheckins, getUserProfile } = require('../services/firebaseService');

module.exports = async function chatWithGemini(req, res) {
  try {
    const { messages = [], options = {} } = req.body || {};

    // Determine user id (prefer explicit client-provided id first, then auth/header)
    const userId = options.userId || (req.user && req.user.uid) || req.headers['x-user-id'] || null;

    let systemPrompt = options.systemPrompt;

    // If requested, fetch check-ins and inject context
    if (options.useCheckins && userId) {
      try {
        let checkins = [];
        // Prefer server-side fetch
        const fetched = options.useAllCheckins
          ? await getAllCheckins(userId, options.checkinMax || 365)
          : await getRecentCheckins(userId, options.checkinLimit || 7);
        if (Array.isArray(fetched) && fetched.length > 0) {
          checkins = fetched;
        } else if (Array.isArray(options.clientCheckins) && options.clientCheckins.length > 0) {
          // Fallback: use client-provided compact check-ins (already newest first)
          checkins = options.clientCheckins.map(c => ({ id: c.id, date: c.date, answers: c.answers, notes: c.notes || null }));
        }
        try { console.log('[chat] fetched checkins:', Array.isArray(checkins) ? checkins.length : 0); } catch (_) {}
        if (Array.isArray(checkins) && checkins.length > 0) {
          const latest = checkins[0];
          const formatDate = (d) => {
            try {
              const ts = (d && d.toDate) ? d.toDate() : (d?._seconds ? new Date(d._seconds * 1000) : new Date(d));
              return ts.toISOString().slice(0, 10);
            } catch (_) { return 'recent'; }
          };
          const latestDate = (() => {
            // Support either Firestore Timestamp or ISO string from client
            if (latest && typeof latest.date === 'string' && /\d{4}-\d{2}-\d{2}/.test(latest.date)) return latest.date;
            return formatDate(latest.date);
          })();
          const summarizeAnswers = (answers) => {
            if (!answers || typeof answers !== 'object') return 'no answers';
            const titleMap = {
              ns_q1: 'Abdominal Pain',
              ns_q2: 'Headache/Migraine',
              ns_q3: 'Nausea/Vomiting',
              ns_q4: 'Fatigue/Weakness',
              ns_q5: 'Fever/Chills',
              ns_q6: 'Cough/Breathing',
              ns_q7: 'Bowel Changes',
              ns_q8: 'Urination Changes',
              ns_q9: 'Skin/Wounds',
              ns_q10: 'Dizziness/Fainting',
              ns_q11: 'Sleep/Insomnia',
              ns_q12: 'Hot Flashes/Warmth'
            };
            const normalize = (value) => {
              const text = String(value || '').trim();
              if (text.length <= 80) return text;
              const cut = text.slice(0, 77);
              const lastSpace = cut.lastIndexOf(' ');
              return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + '…';
            };
            const isNotable = (text) => {
              const t = String(text || '').toLowerCase();
              return !(
                t === 'none' || t === 'normal' ||
                t.startsWith('slept well') ||
                t.startsWith('no unusual warmth') ||
                t.startsWith('no')
              );
            };
            const ordered = Object.keys(titleMap);
            const items = [];
            for (const key of ordered) {
              if (answers.hasOwnProperty(key) && isNotable(answers[key])) {
                items.push(`${titleMap[key]}: ${normalize(answers[key])}`);
              }
              if (items.length >= 8) break;
            }
            if (items.length === 0) return 'no notable issues reported';
            return items.join('; ');
          };
          const latestSummary = `Latest check-in (${latestDate}): ${summarizeAnswers(latest.answers)}${latest.notes ? `; notes: ${String(latest.notes).slice(0, 60)}` : ''}`;

          // Optionally include previous day's summary if available
          let previousSummary = '';
          if (checkins.length >= 2) {
            const prev = checkins[1];
            const prevDate = (() => {
              if (prev && typeof prev.date === 'string' && /\d{4}-\d{2}-\d{2}/.test(prev.date)) return prev.date;
              return formatDate(prev.date);
            })();
            previousSummary = `\nPrevious check-in (${prevDate}): ${summarizeAnswers(prev.answers)}${prev.notes ? `; notes: ${String(prev.notes).slice(0, 60)}` : ''}`;
          }

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

          const prefix = `You are a health assistant. Use the user's daily check-ins to ground answers. Be concise, practical, and empathetic. Do not include generic disclaimers (e.g., "I cannot diagnose"). Provide clear, actionable steps tailored to the user's symptoms.

Respond in this structure (omit sections not relevant):
- Immediate actions: concrete steps for the next 4–8 hours (e.g., fluids target, temperature control, breathing ease, light meals)
- Self-care today: specific do's (hydration amounts, rest, humidifier, saline rinses, small bland meals) and don'ts (alcohol, heavy exercise)
- Optional OTC (if appropriate): suggest common options with brief caveats/contraindications (e.g., acetaminophen dosing limits; avoid NSAIDs if ulcer risk; oral rehydration; cough suppressants only if sleep-disrupting). If uncertain about suitability, say "only if previously tolerated and no contraindications."
- Monitor: what to track (fever trend, breathing, hydration signs, urination frequency, rash spread), and simple thresholds
- When to seek care: timeframe based on severity (e.g., same-day urgent care for severe headache with fever; ER if breathing worsens, chest pain, repeated fainting, persistent vomiting, or signs of dehydration)
- Possible causes: 2–4 likely categories (e.g., viral URI/flu/COVID, migraine/exertional headache, gastroenteritis), keep neutral and avoid definitive labels
- Next 48h plan: what to try tomorrow if improving vs if unchanged/worsening

Reference the latest and previous check-ins when helpful, and avoid repeating long lists verbatim.`;
          let context = `${prefix}\n${historyLine}\n${latestSummary}${previousSummary}`;

          // Optionally include compact JSON of all check-ins for personalization
          if (options.useAllCheckins) {
            const compact = checkins.map(c => ({
              id: c.id,
              date: (() => { try { const ts = (c.date && c.date.toDate) ? c.date.toDate() : (c.date?._seconds ? new Date(c.date._seconds * 1000) : new Date(c.date)); return ts.toISOString().slice(0,10);} catch(_) { return 'recent'; } })(),
              answers: c.answers,
              notes: c.notes || null
            }));
            const json = JSON.stringify(compact).slice(0, options.checkinsCharLimit || 12000);
            context += `\nAll check-ins (compact JSON, newest first): ${json}`;
          }
          systemPrompt = systemPrompt ? `${systemPrompt}\n\n${context}` : context;
        }
      } catch (_) {
        // fail open without check-in context
      }
    }

    // If requested, fetch user profile and inject context
    if (options.useProfile && userId) {
      try {
        const profile = await getUserProfile(userId);
        try { console.log('[chat] has profile:', !!profile); } catch (_) {}
        if (profile) {
          const profileJson = JSON.stringify(profile, null, 2);
          const profileLine = `User profile (JSON):\n${profileJson}`;
          systemPrompt = systemPrompt ? `${systemPrompt}\n\n${profileLine}` : profileLine;
        }
      } catch (_) {
        // ignore
      }
    }

    // Debug logs (safe)
    try {
      console.log('[chat] userId:', userId, 'useCheckins:', !!options.useCheckins, 'useAllCheckins:', !!options.useAllCheckins, 'useProfile:', !!options.useProfile);
    } catch (_) {}

    // Fallback system prompt when no check-in/profile context was injected.
    // Use a neutral prompt to avoid incorrectly asserting the user has no history when data isn't accessible.
    if (!systemPrompt) {
      const askedForCheckins = !!options.useCheckins && !!(options.userId || (req.user && req.user.uid));
      if (askedForCheckins) {
        systemPrompt = "You are a health assistant. Be concise, practical, and empathetic. Do not add generic disclaimers (e.g., 'I cannot diagnose'). Use any information provided to personalize guidance. If severe or red-flag patterns are mentioned, clearly indicate urgency and suggested timeframe for seeking care. Offer concrete self-care steps and what to monitor.";
        try { console.log('[chat] note: no check-in context injected (zero or inaccessible). Using neutral fallback.'); } catch (_) {}
      } else {
        systemPrompt = "You are a health assistant. Be concise, practical, and empathetic. Do not add generic disclaimers. Encourage daily symptom logging to improve personalization, and provide clear next steps tailored to the user's message.";
      }
    }
    try { console.log('[chat] systemPrompt preview =>', (systemPrompt || '').slice(0, 500)); } catch (_) {}
    const mergedOptions = { ...options, systemPrompt };
    const result = await chatbotAgent(messages, mergedOptions);
    res.json({ ok: true, data: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};


