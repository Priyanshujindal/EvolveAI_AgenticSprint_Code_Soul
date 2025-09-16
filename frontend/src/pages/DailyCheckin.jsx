import React, { useEffect, useMemo, useState } from 'react';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Textarea from '../components/ui/Textarea';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ui/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { addDoc, collection, getDocs, query, where, serverTimestamp, Timestamp, orderBy, limit } from 'firebase/firestore';
import RiskChart from '../components/RiskChart';
import { analyzeCheckinApi, aiHealth } from '../services/api';

export default function DailyCheckin() {
  const { notify } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [answers, setAnswers] = useState({
    q1: '', // Sleep & Energy
    q2: '', // Pain or Discomfort
    q2_specify: '',
    q3: '', // Heart & Respiratory - yes/no
    q3_severity: '',
    q4: '', // Digestive & Temperature
    q4_specify: '',
    q5: '', // Mental & Emotional
    q6_activity: '', // Physical Activity intensity
    q6_hydration: '', // Hydration level
    q6_diet: '', // Diet adherence
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedToday, setSubmittedToday] = useState(false);
  const [latestSubmission, setLatestSubmission] = useState(null);
  const [history, setHistory] = useState([]);
  const [points, setPoints] = useState([]);
  const [trendLabel, setTrendLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [aiStatus, setAiStatus] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [topK, setTopK] = useState(3);
  const [explainMethod, setExplainMethod] = useState('auto');
  const [useScipyWinsorize, setUseScipyWinsorize] = useState(true);
  const [forceLocal, setForceLocal] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('analysisPrefs') || '{}');
      if (saved && typeof saved === 'object') {
        if (saved.topK) setTopK(saved.topK);
        if (saved.explainMethod) setExplainMethod(saved.explainMethod);
        if (typeof saved.useScipyWinsorize === 'boolean') setUseScipyWinsorize(saved.useScipyWinsorize);
        if (typeof saved.forceLocal === 'boolean') setForceLocal(saved.forceLocal);
      }
    } catch (_) {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('analysisPrefs', JSON.stringify({ topK, explainMethod, useScipyWinsorize, forceLocal }));
    } catch (_) {}
  }, [topK, explainMethod, useScipyWinsorize, forceLocal]);

  const isValid = useMemo(() => {
    // New 10-question MCQ set
    const requiredKeys = ['ns_q1','ns_q2','ns_q3','ns_q4','ns_q5','ns_q6','ns_q7','ns_q8','ns_q9','ns_q10'];
    for (const k of requiredKeys) {
      if (!answers[k]) return false;
    }
    return true;
  }, [answers]);

  function todayRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
  }

  useEffect(() => {
    async function checkToday() {
      if (!db || !user) return;
      const { start, end } = todayRange();
      const ref = collection(db, 'users', user.uid, 'dailyCheckins');
      // Simple range query to avoid additional index requirements
      const q = query(ref, where('date', '>=', start), where('date', '<', end));
      try {
        const snap = await getDocs(q);
        if (!snap.empty) {
          setSubmittedToday(true);
          setLatestSubmission(snap.docs[0].data());
        } else {
          setSubmittedToday(false);
          setLatestSubmission(null);
        }
      } catch (err) {
        console.error('[DailyCheckin] checkToday error:', err);
      }
    }
    checkToday();
  }, [user]);

  // Compute a simple well-being score [0..1] from answers
  function scoreFromAnswers(a) {
    if (!a) return 0.5;
    const map4 = (v) => ({
      'None': 1.0,
      'Normal': 1.0,
      'Mild': 0.7,
      'Slight irregularity – mild constipation/diarrhea': 0.7,
      'Slight – minor discomfort or frequency change': 0.7,
      'Moderate': 0.4,
      'Moderate – noticeable, affects tasks': 0.4,
      'Moderate – interfered with tasks': 0.4,
      'Moderate – affected meals': 0.4,
      'Moderate – frequent or loose stools': 0.4,
      'Moderate – frequent or painful urination': 0.4,
      'Severe': 0.2,
      'Severe – persistent pain': 0.2,
      'Severe – unable to perform daily activities': 0.2,
      'Severe – persistent vomiting': 0.2,
      'Severe – could barely perform activities': 0.2,
      'Severe – high fever (>102°F / 38.8°C)': 0.2,
      'Severe – persistent cough or severe breathing issues': 0.2,
      'Severe – persistent diarrhea/constipation': 0.2,
      'Severe – inability to urinate normally or severe discomfort': 0.2,
      'Severe – bleeding, large lesions, or non-healing wounds': 0.2,
      'Severe – fainting or inability to stand': 0.2,
    })[v] ?? 0.5;
    const parts = [
      map4(a.ns_q1), map4(a.ns_q2), map4(a.ns_q3), map4(a.ns_q4), map4(a.ns_q5),
      map4(a.ns_q6), map4(a.ns_q7), map4(a.ns_q8), map4(a.ns_q9), map4(a.ns_q10)
    ];
    const avg = parts.reduce((s, v) => s + v, 0) / parts.length;
    return Math.max(0, Math.min(1, Number(avg.toFixed(3))));
  }

  // Load recent history and compute trend
  useEffect(() => {
    async function loadHistory() {
      if (!db || !user) return;
      try {
        const ref = collection(db, 'users', user.uid, 'dailyCheckins');
        const q = query(ref, orderBy('date', 'desc'), limit(30));
        const snap = await getDocs(q);
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const reversed = items.slice().reverse();
        const pts = reversed.map(it => scoreFromAnswers(it.answers));
        const n = pts.length;
        let trend = '';
        if (n >= 6) {
          const prev = pts.slice(n - 6, n - 3).reduce((s, v) => s + v, 0) / 3;
          const last = pts.slice(n - 3).reduce((s, v) => s + v, 0) / 3;
          const delta = last - prev;
          if (delta > 0.06) trend = 'Improving';
          else if (delta < -0.06) trend = 'Worsening';
          else trend = 'Stable';
        }
        setHistory(items);
        setPoints(pts);
        setTrendLabel(trend);
      } catch (err) {
        console.error('[DailyCheckin] loadHistory error:', err);
      }
    }
    loadHistory();
  }, [user, submittedToday]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setAiLoading(true);
        const r = await aiHealth();
        if (mounted) setAiStatus(r);
      } catch (_) {
        if (mounted) setAiStatus({ ok: true, python: { available: false } });
      } finally {
        if (mounted) setAiLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  function setField(name, value) {
    setAnswers(prev => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!user) {
      notify('Please log in first!', 'error');
      return;
    }
    if (!db) {
      notify('App is not connected to Firestore. Check Firebase config.', 'error');
      return;
    }
    if (submittedToday) {
      notify("You've already completed today's check-in.", 'info');
      return;
    }
    if (!isValid) {
      notify('Please answer all required questions.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const userCheckinsRef = collection(db, 'users', user.uid, 'dailyCheckins');
      const payload = {
        // Use client timestamp to ensure immediate query-ability for today checks
        date: Timestamp.now(),
        // Keep serverTimestamp as an additional field if you want authoritative server time
        dateServer: serverTimestamp(),
        answers: {
          ns_q1: answers.ns_q1,
          ns_q2: answers.ns_q2,
          ns_q3: answers.ns_q3,
          ns_q4: answers.ns_q4,
          ns_q5: answers.ns_q5,
          ns_q6: answers.ns_q6,
          ns_q7: answers.ns_q7,
          ns_q8: answers.ns_q8,
          ns_q9: answers.ns_q9,
          ns_q10: answers.ns_q10,
        },
        analyzed: false,
        notes: notes || null,
        // Analysis flags for backend Python service
        topK: Number(topK),
        explainMethod,
        useScipyWinsorize,
        forceLocal,
      };
      console.log('[DailyCheckin] Submitting payload:', payload);
      await addDoc(userCheckinsRef, payload);
      notify('Daily check-in saved!', 'success');
      setSubmittedToday(true);
      // Fire-and-forget analyze request
      try {
        analyzeCheckinApi({ userId: user.uid, payload });
      } catch (_) {}
    } catch (err) {
      console.error('[DailyCheckin] Firestore addDoc error:', err);
      const msg = err?.message || 'Error saving check-in. Please try again.';
      notify(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Daily Check-in</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>AI Service</CardTitle>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="text-slate-600 inline-flex items-center gap-2"><Spinner size={16} /> Checking service...</div>
            ) : (
              <div className="text-sm text-slate-700 dark:text-slate-300">
                Python service: {aiStatus?.python?.available ? (
                  <span className="text-emerald-600 font-medium">Available</span>
                ) : (
                  <span className="text-slate-500">Unavailable</span>
                )}
                {aiStatus?.python?.available && (
                  <span className="ml-2 text-xs text-slate-500">Torch: {String(!!aiStatus?.python?.torchAvailable)} • CUDA: {String(!!aiStatus?.python?.cudaAvailable)}</span>
                )}
              </div>
            )}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Top K</label>
                <input type="number" min={1} max={3} value={topK} onChange={e => setTopK(e.target.value)} className="border rounded px-2 py-1 w-full" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Explainability</label>
                <select value={explainMethod} onChange={e => setExplainMethod(e.target.value)} className="border rounded px-2 py-1 w-full">
                  <option value="auto">Auto</option>
                  <option value="captum">Captum</option>
                  <option value="shap">SHAP</option>
                  <option value="none">None</option>
                </select>
              </div>
              <label className="flex items-center gap-2 mt-6 md:mt-0">
                <input type="checkbox" checked={useScipyWinsorize} onChange={e => setUseScipyWinsorize(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm text-slate-700">Use SciPy winsorization</span>
              </label>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Today's Check-in</CardTitle>
          </CardHeader>
          <CardContent>
            {submittedToday ? (
              <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <p className="font-medium">You've already submitted today's check-in. Come back tomorrow.</p>
                {latestSubmission && latestSubmission.answers && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500">Your last responses:</p>
                    <ul className="list-disc ml-5 mt-1 space-y-1">
                      <li>Sleep & Energy: {latestSubmission.answers.q1}</li>
                      <li>Pain/Discomfort: {latestSubmission.answers.q2}{latestSubmission.answers.q2_specify ? ` (${latestSubmission.answers.q2_specify})` : ''}</li>
                      <li>Heart/Respiratory: {latestSubmission.answers.q3}{latestSubmission.answers.q3 === 'Yes' && latestSubmission.answers.q3_severity ? ` (${latestSubmission.answers.q3_severity})` : ''}</li>
                      <li>Digestive/Temperature: {latestSubmission.answers.q4}{latestSubmission.answers.q4_specify ? ` (${latestSubmission.answers.q4_specify})` : ''}</li>
                      <li>Mental & Emotional: {latestSubmission.answers.q5}</li>
                      <li>Activity: {latestSubmission.answers.q6_activity}, Hydration: {latestSubmission.answers.q6_hydration}, Diet: {latestSubmission.answers.q6_diet}</li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Daily Symptom Tracking MCQs</div>
                {/* New MCQ set */}
                {[
                  { key: 'ns_q1', title: 'Stomach / Abdominal Pain Today', opts: ['None','Mild – occasional discomfort','Moderate – noticeable, affects tasks','Severe – persistent pain'] },
                  { key: 'ns_q2', title: 'Headache or Migraine Today', opts: ['None','Mild – didn’t interfere with work','Moderate – interfered with tasks','Severe – unable to perform daily activities'] },
                  { key: 'ns_q3', title: 'Nausea or Vomiting Today', opts: ['None','Mild – occasional queasiness','Moderate – affected meals','Severe – persistent vomiting'] },
                  { key: 'ns_q4', title: 'Fatigue or Weakness Today', opts: ['None – felt energetic','Mild – slightly tired','Moderate – noticeable fatigue','Severe – could barely perform activities'] },
                  { key: 'ns_q5', title: 'Fever or Chills Today', opts: ['None','Mild – slight temperature fluctuation','Moderate – measurable fever (100–102°F / 37.7–38.8°C)','Severe – high fever (>102°F / 38.8°C)'] },
                  { key: 'ns_q6', title: 'Cough or Shortness of Breath Today', opts: ['None','Mild – occasional cough or shortness of breath','Moderate – daily cough or breathing difficulty','Severe – persistent cough or severe breathing issues'] },
                  { key: 'ns_q7', title: 'Changes in Bowel Movements Today', opts: ['Normal','Slight irregularity – mild constipation/diarrhea','Moderate – frequent or loose stools','Severe – persistent diarrhea/constipation'] },
                  { key: 'ns_q8', title: 'Changes in Urination Today', opts: ['Normal','Slight – minor discomfort or frequency change','Moderate – frequent or painful urination','Severe – inability to urinate normally or severe discomfort'] },
                  { key: 'ns_q9', title: 'Skin Changes / Wounds Today', opts: ['None','Minor – small rashes, bruises, or pimples','Noticeable – persistent rash, sores, or swelling','Severe – bleeding, large lesions, or non-healing wounds'] },
                  { key: 'ns_q10', title: 'Dizziness or Fainting Today', opts: ['None','Mild – occasional lightheadedness','Moderate – dizziness affecting tasks','Severe – fainting or inability to stand'] },
                ].map((q, idx) => (
                  <div key={q.key}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-[10px]">{idx + 1}</span>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">{q.title}</label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-2">
                      {q.opts.map(opt => (
                        <button
                          type="button"
                          key={opt}
                          onClick={() => setField(q.key, opt)}
                          className={`px-3 py-2 rounded-md border text-sm text-left transition ${answers[q.key] === opt ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Daily health notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Add notes for today (optional)</label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Type anything noteworthy about your health today..." />
                </div>

                {/* Hide legacy sections below to avoid duplicate questions */}
                <div className="hidden">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-[10px]">1</span>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Sleep & Energy</label>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">How well did you sleep last night, and how energetic do you feel today?</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {['Very low','Low','Moderate','High','Very high'].map(opt => (
                      <button type="button" key={opt} onClick={() => setField('q1', opt)} className={`px-3 py-2 rounded-md border text-sm transition ${answers.q1 === opt ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'}`}>{opt}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-[10px]">2</span>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Pain or Discomfort</label>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">Did you experience any unusual pain, discomfort, or bodily symptoms today?</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['None','Mild','Moderate','Severe'].map(opt => (
                      <button type="button" key={opt} onClick={() => setField('q2', opt)} className={`px-3 py-2 rounded-md border text-sm transition ${answers.q2 === opt ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'}`}>{opt}</button>
                    ))}
                  </div>
                  {(answers.q2 === 'Mild' || answers.q2 === 'Moderate' || answers.q2 === 'Severe') && (
                    <input
                      type="text"
                      placeholder="Specify location (optional)"
                      value={answers.q2_specify}
                      onChange={e => setField('q2_specify', e.target.value)}
                      className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-[10px]">3</span>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Heart & Respiratory Health</label>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">Chest pain, palpitations, shortness of breath, or rapid heartbeat today?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['No','Yes'].map(opt => (
                      <button type="button" key={opt} onClick={() => setField('q3', opt)} className={`px-3 py-2 rounded-md border text-sm transition ${answers.q3 === opt ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'}`}>{opt}</button>
                    ))}
                  </div>
                  {answers.q3 === 'Yes' && (
                    <div className="mt-2 grid grid-cols-3 md:grid-cols-6 gap-2">
                      {['Mild','Moderate','Severe'].map(opt => (
                        <button type="button" key={opt} onClick={() => setField('q3_severity', opt)} className={`px-3 py-2 rounded-md border text-sm transition ${answers.q3_severity === opt ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'}`}>{opt}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-[10px]">4</span>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Digestive & Temperature Symptoms</label>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">Digestive issues (nausea, vomiting, diarrhea, constipation, heartburn) or fever/chills today?</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['None','Mild','Moderate','Severe'].map(opt => (
                      <button type="button" key={opt} onClick={() => setField('q4', opt)} className={`px-3 py-2 rounded-md border text-sm transition ${answers.q4 === opt ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'}`}>{opt}</button>
                    ))}
                  </div>
                  {(answers.q4 === 'Mild' || answers.q4 === 'Moderate' || answers.q4 === 'Severe') && (
                    <input
                      type="text"
                      placeholder="Specify (optional)"
                      value={answers.q4_specify}
                      onChange={e => setField('q4_specify', e.target.value)}
                      className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-[10px]">5</span>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Mental & Emotional Well-being</label>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">How would you rate your mood and stress levels today?</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {['Very low','Low','Neutral','Good','Very good'].map(opt => (
                      <button type="button" key={opt} onClick={() => setField('q5', opt)} className={`px-3 py-2 rounded-md border text-sm transition ${answers.q5 === opt ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'}`}>{opt}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-[10px]">6</span>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Physical Activity & Lifestyle</label>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">Did you maintain physical activity, hydration, and balanced meals today?</p>
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Activity</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['None','Light','Moderate','Intense'].map(opt => (
                          <button type="button" key={opt} onClick={() => setField('q6_activity', opt)} className={`px-3 py-2 rounded-md border text-sm transition ${answers.q6_activity === opt ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Hydration</p>
                      <div className="grid grid-cols-3 gap-2">
                        {['No','Mostly','Yes'].map(opt => (
                          <button type="button" key={opt} onClick={() => setField('q6_hydration', opt)} className={`px-3 py-2 rounded-md border text-sm transition ${answers.q6_hydration === opt ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Diet</p>
                      <div className="grid grid-cols-3 gap-2">
                        {['No','Mostly','Yes'].map(opt => (
                          <button type="button" key={opt} onClick={() => setField('q6_diet', opt)} className={`px-3 py-2 rounded-md border text-sm transition ${answers.q6_diet === opt ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">Complete all sections to enable saving.</div>
                  <Button type="submit" disabled={isSubmitting || !isValid || authLoading}>
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2"><Spinner size={16} /> Saving...</span>
                    ) : (
                      'Save today\'s check-in'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your recent check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            {points.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  Overall trend: <span className={`font-medium ${trendLabel === 'Worsening' ? 'text-red-600' : trendLabel === 'Improving' ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-200'}`}>{trendLabel || 'Not enough data'}</span>
                </div>
                <div className="bg-white dark:bg-slate-950 rounded-md p-3 border border-slate-200 dark:border-slate-800">
                  <RiskChart points={points} />
                </div>
                <ul className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  {history.slice(0, 10).map((h, i) => (
                    <li key={h.id || i} className="py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">{h?.date?.toDate ? h.date.toDate().toLocaleDateString() : ''}</span>
                      <span className="font-medium">{scoreFromAnswers(h.answers)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-300">No history yet. Your check-ins will appear here.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Why this matters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <p>Your daily responses help track trends in sleep, mood, pain, and lifestyle. If you report concerning symptoms, your clinician or AI assistant can prioritize guidance.</p>
              <p>We limit to one check-in per day to keep insights consistent. You can update tomorrow if anything changes.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


