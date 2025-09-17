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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Hero
        title="AI Diagnostic & Triage Dashboard"
        subtitle="Track your health, upload reports, and monitor trends with our AI-powered health monitoring system."
        cta={
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => navigate('/daily-checkin')}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Daily Check-in
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => navigate('/upload-report')}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Report
            </Button>
            <Button 
              variant="secondary" 
              onClick={locateAmbulance}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Find Ambulance
            </Button>
          </div>
        }
      />

      {/* Risk Alert based on last 7-30 days check-ins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className={`transition-all duration-300 transform hover:scale-[1.02] ${
          riskSummary.level === 'High' 
            ? 'bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-900/10 border-rose-200 dark:border-rose-800/50' 
            : riskSummary.level === 'Mid' 
              ? 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-900/10 border-amber-200 dark:border-amber-800/50' 
              : 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-800/50'
        }`}>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Health Risk</div>
                <div className={`text-2xl font-bold ${
                  riskSummary.level === 'High' 
                    ? 'text-rose-700 dark:text-rose-300' 
                    : riskSummary.level === 'Mid' 
                      ? 'text-amber-700 dark:text-amber-300' 
                      : 'text-emerald-700 dark:text-emerald-300'
                }`}>
                  {riskSummary.level}
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                riskSummary.level === 'High' 
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' 
                  : riskSummary.level === 'Mid' 
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' 
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              }`}>
                Last 30 days
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {riskSummary.reason}
            </p>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2 transition-all duration-300 transform hover:scale-[1.01]">
          <CardHeader>
            <CardTitle className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Risk Trend (last {riskLabels.length} check-ins)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskSeries.length > 0 ? (
              <div className="h-[220px] -mx-2 -mb-2">
                <RiskChart points={riskSeries} labels={riskLabels} yRange={{ min: 0, max: 1 }} title="Rule-based risk" />
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-slate-400 dark:text-slate-500 mb-2">
                  <svg className="w-12 h-12 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-slate-500 dark:text-slate-400">No check-ins yet. Your risk trend will appear here.</p>
                <button 
                  onClick={() => navigate('/daily-checkin')}
                  className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors inline-flex items-center"
                >
                  Record your first check-in
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          label="Check-ins today" 
          value={checkins.filter(c => {
            const today = new Date();
            const checkinDate = c?.date?.toDate ? c.date.toDate() : new Date(c?.date);
            return checkinDate.toDateString() === today.toDateString();
          }).length} 
          hint="Daily check-ins" 
          icon="calendar"
          accent="blue" 
        />
        <StatCard 
          label="Risk level" 
          value={riskSummary.level} 
          hint="Based on recent data" 
          icon="shield"
          accent={riskSummary.level === 'High' ? 'red' : riskSummary.level === 'Mid' ? 'amber' : 'green'} 
        />
        <StatCard 
          label="Total check-ins" 
          value={checkins.length} 
          hint="Last 30 days" 
          icon="chart"
          accent="purple" 
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <QuickActions onLocate={locateAmbulance} />
        </div>
        <ActivityFeed />
      </div>
      
      {(nearbyLoading || nearbyError || (nearby && Array.isArray(nearby.data))) && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Nearby Ambulance Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nearbyLoading && (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="w-6 h-6 text-blue-500" />
                  <span className="ml-3 text-slate-600 dark:text-slate-300">Locating nearby services...</span>
                </div>
              )}
              {nearbyError && (
                <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300">
                  <div className="flex">
                    <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium">Unable to locate services</h4>
                      <p className="text-sm mt-1">{nearbyError}</p>
                    </div>
                  </div>
                </div>
              )}
              {!nearbyLoading && !nearbyError && (
                <div className="space-y-4">
                  {(nearby?.data || []).slice(0, 3).map((n, i) => (
                    <div key={i} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-slate-100">{n.name}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {n.address || 'Address not available'}
                          </p>
                        </div>
                        {typeof n.distance_meters === 'number' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {n.distance_meters.toLocaleString()} m
                          </span>
                        )}
                      </div>
                      {n.rating && (
                        <div className="mt-2 flex items-center text-sm text-amber-600 dark:text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <svg 
                              key={i} 
                              className={`w-4 h-4 ${i < Math.floor(n.rating) ? 'fill-current' : 'fill-none'}`} 
                              viewBox="0 0 20 20" 
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                          <span className="ml-1 text-slate-600 dark:text-slate-400">
                            {n.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {(nearby?.data || []).length === 0 && (
                    <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                      <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>No ambulance services found nearby.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
