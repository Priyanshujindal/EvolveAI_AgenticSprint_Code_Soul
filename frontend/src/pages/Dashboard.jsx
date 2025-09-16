import React, { useState } from 'react';
import DiagnosisList from '../components/DiagnosisList';
import RiskChart from '../components/RiskChart';
import RedFlagAlert from '../components/RedFlagAlert';
import { findNearbyAmbulance } from '../services/api';
import HitlFeedbackForm from '../components/HitlFeedbackForm';
import { submitFeedback } from '../services/api';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ui/ToastProvider';
import { analyze } from '../services/api';
import Skeleton from '../components/ui/Skeleton';
import Hero from '../components/Hero';
import StatCard from '../components/StatCard';
import QuickActions from '../components/QuickActions';
import ActivityFeed from '../components/ActivityFeed';
import { aiHealth } from '../services/api';

export default function Dashboard() {
  const { notify } = useToast();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nearby, setNearby] = useState(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState(null);
  // Analysis controls
  const [topK, setTopK] = useState(3);
  const [explainMethod, setExplainMethod] = useState('auto');
  const [useScipyWinsorize, setUseScipyWinsorize] = useState(true);
  const [forceLocal, setForceLocal] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Persist/load preferences
  React.useEffect(() => {
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
  async function refreshAiHealth() {
    try {
      setAiLoading(true);
      const r = await aiHealth();
      setAiStatus(r);
    } catch (_) {
      setAiStatus({ ok: true, python: { available: false } });
    } finally {
      setAiLoading(false);
    }
  }

  React.useEffect(() => {
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
  React.useEffect(() => {
    try {
      localStorage.setItem('analysisPrefs', JSON.stringify({ topK, explainMethod, useScipyWinsorize, forceLocal }));
    } catch (_) {}
  }, [topK, explainMethod, useScipyWinsorize, forceLocal]);

  async function analyzeMock() {
    try {
      setLoading(true);
      setError(null);
      const data = await analyze({
        notes: 'fever and headache',
        vitals: { temperature: 38.5 },
        topK: Number(topK),
        explainMethod,
        useScipyWinsorize,
        forceLocal
      });
      setResult(data);
      if (forceLocal && aiStatus && aiStatus.python && aiStatus.python.available === false) {
        notify('Python AI unavailable. Used local analysis.', 'info');
      }
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

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
        subtitle="Run a quick analysis, review trends, and act on red flags."
        cta={<div className="flex gap-3 items-center"><Button onClick={analyzeMock}>Run Analysis</Button><Button variant="secondary" onClick={locateAmbulance}>Find Ambulance</Button></div>}
      />
      <div className="mb-3">
        <div className="text-sm text-slate-700 dark:text-slate-300 inline-flex items-center gap-3">
          {aiLoading ? (
            <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" /> Checking AI service…</span>
          ) : (
            <>
              <span className="inline-flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${aiStatus?.python?.available ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                Python AI: {aiStatus?.python?.available ? 'Available' : 'Unavailable'}
              </span>
              {aiStatus?.python?.available && (
                <>
                  <span className="text-xs">Torch: {String(!!aiStatus?.python?.torchAvailable)}</span>
                  <span className="text-xs">CUDA: {String(!!aiStatus?.python?.cudaAvailable)}</span>
                </>
              )}
              <Button size="sm" variant="secondary" onClick={refreshAiHealth}>Retry</Button>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Analysis Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Top K</label>
                <input
                  type="number"
                  min={1}
                  max={3}
                  value={topK}
                  onChange={e => setTopK(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Explainability</label>
                <select
                  value={explainMethod}
                  onChange={e => setExplainMethod(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                >
                  <option value="auto">Auto</option>
                  <option value="captum" disabled={!aiStatus?.python?.captumAvailable}>Captum</option>
                  <option value="shap" disabled={!aiStatus?.python?.shapAvailable}>SHAP</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="flex items-center gap-2 mt-6 md:mt-0">
                <input
                  id="winsorize"
                  type="checkbox"
                  checked={useScipyWinsorize}
                  onChange={e => setUseScipyWinsorize(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="winsorize" className="text-sm text-slate-700">Use SciPy winsorization</label>
              </div>
              <div className="flex items-center gap-2 mt-6 md:mt-0">
                <input
                  id="forceLocal"
                  type="checkbox"
                  checked={forceLocal}
                  onChange={e => setForceLocal(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="forceLocal" className="text-sm text-slate-700">Force local analysis</label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Patients analyzed" value={result?.data ? (result.data.diagnoses?.length || 1) : 0} hint="From last session" accent="blue" />
        <StatCard label="Active alerts" value={result?.data?.redFlags?.length || 0} hint="Requires attention" accent="red" />
        <StatCard label="Avg. risk" value={result?.data ? `${Math.round(52)}%` : '—'} hint="Across current sample" accent="amber" />
      </div>
      {loading && (
        <div className="mb-4 text-slate-600 inline-flex items-center gap-2"><Spinner /> Analyzing...</div>
      )}
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {!result?.data && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Diagnoses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-500">No analysis yet. Click "Run Analysis" to get started.</div>
              <div className="mt-3"><Skeleton className="h-24" /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Risk Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-500">Risk visualization will appear after your first analysis.</div>
              <div className="mt-3"><Skeleton className="h-40" /></div>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <QuickActions onAnalyze={analyzeMock} onLocate={locateAmbulance} />
            <ActivityFeed />
          </div>
        </div>
      )}
      {result?.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Diagnoses</CardTitle>
            </CardHeader>
            <CardContent>
              <DiagnosisList items={result.data.diagnoses} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Risk Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <RiskChart points={[0.2, 0.35, 0.5, 0.42, 0.6]} />
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardContent>
              <RedFlagAlert alerts={result.data.redFlags} />
            </CardContent>
          </Card>
          {result?.data?.explainability?.available && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Explainability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-600 mb-3">Method: {result.data.explainability.method}
                  {result?.data?.explainability?.method === 'captum' && (
                    <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Captum</span>
                  )}
                  {result?.data?.explainability?.method === 'shap' && (
                    <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">SHAP</span>
                  )}
                  {result?.data?.explainability?.method === 'auto' && (
                    <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">Auto</span>
                  )}
                </div>
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-1 pr-4">Feature</th>
                        <th className="py-1">Attribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(result.data.explainability.features || []).map((f, i) => {
                        const val = Array.isArray(result.data.explainability.attributions) ? Number(result.data.explainability.attributions[i] || 0) : 0;
                        const abs = Math.min(1, Math.abs(val));
                        const width = `${Math.round(abs * 100)}%`;
                        const color = val >= 0 ? 'bg-emerald-500' : 'bg-rose-500';
                        return (
                          <tr key={i} className="border-t">
                            <td className="py-1 pr-4">{f}</td>
                            <td className="py-1">
                              <div className="flex items-center gap-3">
                                <div className="w-40 h-2 bg-slate-200 rounded">
                                  <div className={`${color} h-2 rounded`} style={{ width }} />
                                </div>
                                <span className="tabular-nums">{val.toFixed(4)}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {Number.isFinite(result?.data?.latencyMs) && (
                  <div className="mt-3 text-xs text-slate-500">Python analysis latency: {result.data.latencyMs} ms</div>
                )}
              </CardContent>
            </Card>
          )}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Clinician Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <HitlFeedbackForm onSubmit={async text => {
                const r = await submitFeedback({ text, advisory: result.data });
                notify(`Feedback submitted: ${r?.data?.id || 'ok'}`, 'success');
              }} />
            </CardContent>
          </Card>
          {nearby && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Nearby Ambulance Services</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6">
                  {(nearby.data || []).map((n, i) => (
                    <li key={i}>
                      <span className="font-medium">{n.name}</span> — {n.address} (rating: {n.rating || 'N/A'})
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
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


