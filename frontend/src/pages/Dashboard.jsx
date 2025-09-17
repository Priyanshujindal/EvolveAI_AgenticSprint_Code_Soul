import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RiskChart from '../components/RiskChart';
import { findNearbyAmbulance, fetchRiskSeries } from '../services/api';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ui/ToastProvider';
import Hero from '../components/Hero';
import StatCard from '../components/StatCard';
import QuickActions from '../components/QuickActions';
import ActivityFeed from '../components/ActivityFeed';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, getDocs, orderBy, limit, query } from 'firebase/firestore';
import { riskFromAnswersV2 } from '../utils/scoreHelpers';

export default function Dashboard() {
  const { notify } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nearby, setNearby] = useState(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState(null);

  // Daily check-in derived analytics
  const [checkins, setCheckins] = useState([]);
  const [riskSeries, setRiskSeries] = useState([]);
  const [riskLabels, setRiskLabels] = useState([]);
  const [riskSummary, setRiskSummary] = useState({ level: 'Low', reason: 'No data yet.', score: 0 });

  // Rule-based scoring from daily check-ins (maps our ns_q* answers to simple booleans/levels)
  function scoreFromAnswers(a) {
    if (!a) return 0.5;
    const map4 = (v) => ({
      'None': 1.0,
      'Normal': 1.0,
      'None – no unusual warmth': 1.0,
      'Slept well – no trouble falling or staying asleep': 1.0,
      'Mild': 0.7,
      'Mild – occasional discomfort': 0.7,
      'Mild – didn’t interfere with work': 0.7,
      'Mild – occasional queasiness': 0.7,
      'Mild – slightly tired': 0.7,
      'Mild – slight temperature fluctuation': 0.7,
      'Mild – occasional cough or shortness of breath': 0.7,
      'Slight irregularity – mild constipation/diarrhea': 0.7,
      'Slight – minor discomfort or frequency change': 0.7,
      'Minor – small rashes, bruises, or pimples': 0.7,
      'Mild – occasional lightheadedness': 0.7,
      'Mild difficulty – took longer than usual to fall asleep': 0.7,
      'Mild – occasional warmth or flushing': 0.7,
      'Moderate': 0.4,
      'Moderate – noticeable, affects tasks': 0.4,
      'Moderate – interfered with tasks': 0.4,
      'Moderate – affected meals': 0.4,
      'Moderate – noticeable fatigue': 0.4,
      'Moderate – measurable fever (100–102°F / 37.7–38.8°C)': 0.4,
      'Moderate – daily cough or breathing difficulty': 0.4,
      'Moderate – frequent or loose stools': 0.4,
      'Moderate – frequent or painful urination': 0.4,
      'Noticeable – persistent rash, sores, or swelling': 0.4,
      'Moderate – dizziness affecting tasks': 0.4,
      'Moderate difficulty – frequent waking or poor sleep quality': 0.4,
      'Moderate – noticeable episodes affecting comfort': 0.4,
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
      'Severe – frequent or intense hot flashes': 0.2,
    })[v] ?? 0.5;
    const parts = [
      map4(a.ns_q1), map4(a.ns_q2), map4(a.ns_q3), map4(a.ns_q4), map4(a.ns_q5),
      map4(a.ns_q6), map4(a.ns_q7), map4(a.ns_q8), map4(a.ns_q9), map4(a.ns_q10),
      map4(a.ns_q11), map4(a.ns_q12)
    ];
    const avg = parts.reduce((s, v) => s + (typeof v === 'number' ? v : 0.5), 0) / parts.length;
    return Math.max(0, Math.min(1, Number(avg.toFixed(3))));
  }

  function calculateRuleRisk(items) {
    // Convert items to simple features: headache, sleepLow, stressHigh, fever/nausea/weakness clusters
    let score = 0;
    let headacheDays = 0;
    let lowSleepDays = 0;
    let highStressStreak = 0;
    let currentStressStreak = 0;
    let clusterHighDays = 0;

    for (const it of items) {
      const a = it?.answers || {};
      const headache = a.ns_q2 && a.ns_q2.toLowerCase().startsWith('mild') || a.ns_q2?.toLowerCase().startsWith('moderate') || a.ns_q2?.toLowerCase().startsWith('severe');
      const sleepLow = a.ns_q11 && (a.ns_q11.toLowerCase().includes('hardly') || a.ns_q11.toLowerCase().includes('moderate difficulty'));
      const stressHigh = a.ns_q5 && (a.ns_q5.toLowerCase().includes('very low') || a.ns_q5.toLowerCase() === 'low'); // treat very low mood/low as stress
      const fever = a.ns_q5 && a.ns_q5.toLowerCase().includes('fever'); // ns_q5 is mood; fever is ns_q5 in original daily page different. We'll check ns_q5 only for mood; fever tracked in ns_q5? Not exact; use ns_q5 mapping above for risk via score.
      const nausea = a.ns_q3 && !a.ns_q3.toLowerCase().startsWith('none');
      const weakness = a.ns_q4 && !a.ns_q4.toLowerCase().startsWith('none');

      if (headache) { score += 2; headacheDays += 1; }
      if (sleepLow) { score += 3; lowSleepDays += 1; }
      if (stressHigh) { score += 4; currentStressStreak += 1; } else { currentStressStreak = 0; }
      if (currentStressStreak >= 5) highStressStreak = Math.max(highStressStreak, currentStressStreak);
      if ((fever ? 1 : 0) + (nausea ? 1 : 0) + (weakness ? 1 : 0) >= 2) { score += 6; clusterHighDays += 1; }
    }

    let level = 'Low';
    let reason = 'No major recurring symptoms.';
    if (headacheDays >= 3 && lowSleepDays >= 3) {
      level = 'Mid';
      reason = 'Frequent headaches with low sleep across several days.';
    }
    if (highStressStreak >= 5) {
      level = 'Mid';
      reason = 'Sustained low mood/stress for 5+ days.';
    }
    if (clusterHighDays >= 2) {
      level = 'High';
      reason = 'Multiple symptoms clustered (e.g., nausea + weakness) on several days.';
    }
    if (score >= 20) {
      level = 'High';
      if (!reason || reason === 'No major recurring symptoms.') reason = 'Multiple risk factors accumulated in recent logs.';
    } else if (score >= 10) {
      if (level !== 'High') {
        level = 'Mid';
        if (!reason || reason === 'No major recurring symptoms.') reason = 'Some recurring issues detected (sleep/mood/symptoms).';
      }
    }
    return { level, reason, score };
  }

  // Load last 30 check-ins and compute series + risk
  useEffect(() => {
    async function loadCheckins() {
      if (!db || !user) return;
      try {
        const ref = collection(db, 'users', user.uid, 'dailyCheckins');
        const qy = query(ref, orderBy('date', 'desc'), limit(30));
        const snap = await getDocs(qy);
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const reversed = items.slice().reverse();
        let series = reversed.map(it => riskFromAnswersV2(it.answers));
        const labels = reversed.map(it => (it?.date?.toDate ? it.date.toDate().toLocaleDateString() : ''));
        setCheckins(items);
        setRiskSeries(series);
        setRiskLabels(labels);

        // Try Python risk series to stay in sync with Daily Check-in (prefer if available)
        try {
          const r = await fetchRiskSeries(user.uid);
          if (r && r.ok && Array.isArray(r.points) && r.points.length > 0) {
            setRiskSeries(r.points);
            if (Array.isArray(r.labels) && r.labels.length === r.points.length) {
              setRiskLabels(r.labels.map(s => {
                try { return new Date(s).toLocaleDateString(); } catch (_) { return s; }
              }));
            }
          }
        } catch (_) {}

        // Compute rule-based risk on last 7 and 30
        const last7 = items.slice(-7);
        const last30 = items;
        const rb = calculateRuleRisk(last30);
        setRiskSummary(rb);
      } catch (err) {
        console.error('[Dashboard] loadCheckins error:', err);
      }
    }
    loadCheckins();
  }, [user]);



  async function locateAmbulance() {
    try {
      setNearbyError(null);
      setNearbyLoading(true);
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser.');
      }
      notify('Finding nearby ambulance services...', 'info');
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async pos => {
            try {
              const { latitude, longitude } = pos.coords;
              const r = await findNearbyAmbulance(latitude, longitude);
              if (!r || r.ok === false) {
                const msg = (r && r.error) ? r.error : 'Failed to fetch nearby services';
                throw new Error(msg);
              }
              setNearby(r);
              const count = Array.isArray(r.data) ? r.data.length : 0;
              notify(`Found ${count} ambulance service${count === 1 ? '' : 's'}`, 'success');
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          err => {
            const msg = err && err.message ? err.message : 'Unable to retrieve location.';
            reject(new Error(msg));
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
    } catch (e) {
      const message = e?.message || 'Failed to find nearby ambulances';
      setNearbyError(message);
      notify(message, 'error');
    } finally {
      setNearbyLoading(false);
    }
  }

  return (
    <div>
      <Hero
        title="AI Diagnostic & Triage Dashboard"
        subtitle="Track your health, upload reports, and monitor trends."
        cta={
          <div className="flex gap-3 items-center">
            <Button onClick={() => navigate('/daily-checkin')}>
              Daily Check-in
            </Button>
            <Button variant="secondary" onClick={() => navigate('/upload-report')}>
              Upload Report
            </Button>
            <Button variant="secondary" onClick={locateAmbulance}>
              Find Ambulance
            </Button>
          </div>
        }
      />

      {/* Risk Alert based on last 7-30 days check-ins */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className={`${riskSummary.level === 'High' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' : riskSummary.level === 'Mid' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'}`}>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-300">Health Risk</div>
                <div className={`text-xl font-semibold ${riskSummary.level === 'High' ? 'text-rose-700 dark:text-rose-300' : riskSummary.level === 'Mid' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{riskSummary.level}</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs border ${riskSummary.level === 'High' ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800' : riskSummary.level === 'Mid' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'}`}>Last 30 days</div>
            </div>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{riskSummary.reason}</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Risk Trend (last {riskLabels.length} check-ins)</CardTitle>
          </CardHeader>
          <CardContent>
            {riskSeries.length > 0 ? (
              <div className="max-h-[220px]">
                <RiskChart points={riskSeries} labels={riskLabels} yRange={{ min: 0, max: 1 }} title="Rule-based risk" />
              </div>
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-300">No check-ins yet. Your risk trend will appear here.</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Check-ins today" value={checkins.filter(c => {
          const today = new Date();
          const checkinDate = c?.date?.toDate ? c.date.toDate() : new Date(c?.date);
          return checkinDate.toDateString() === today.toDateString();
        }).length} hint="Daily check-ins" accent="blue" />
        <StatCard label="Risk level" value={riskSummary.level} hint="Based on recent data" accent={riskSummary.level === 'High' ? 'red' : riskSummary.level === 'Mid' ? 'amber' : 'green'} />
        <StatCard label="Total check-ins" value={checkins.length} hint="Last 30 days" accent="purple" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <QuickActions onLocate={locateAmbulance} />
          <ActivityFeed />
        </div>
      </div>
      {(nearbyLoading || nearbyError || (nearby && Array.isArray(nearby.data))) && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Nearby Ambulance Services</CardTitle>
            </CardHeader>
            <CardContent>
              {nearbyLoading && (
                <div className="text-slate-600 inline-flex items-center gap-2"><Spinner /> Locating services...</div>
              )}
              {nearbyError && (
                <div className="text-red-600">{nearbyError}</div>
              )}
              {!nearbyLoading && !nearbyError && (
                <ul className="list-disc pl-6">
                  {(nearby?.data || []).map((n, i) => (
                    <li key={i}>
                      <span className="font-medium">{n.name}</span> — {n.address || 'Address N/A'}{typeof n.distance_meters === 'number' ? ` • ${n.distance_meters} m` : ''}{n.rating ? ` • rating: ${n.rating}` : ''}
                    </li>
                  ))}
                  {(nearby?.data || []).length === 0 && (
                    <li>No ambulance services found nearby.</li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


