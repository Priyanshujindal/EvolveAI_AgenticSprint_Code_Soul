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
import Skeleton from '../components/ui/Skeleton';
import Hero from '../components/Hero';
import StatCard from '../components/StatCard';
import QuickActions from '../components/QuickActions';
import ActivityFeed from '../components/ActivityFeed';

export default function Dashboard() {
  const { notify } = useToast();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function analyzeMock() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('http://localhost:8080/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'fever and headache', vitals: { temperature: 38.5 } })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  const [nearby, setNearby] = useState(null);
  async function locateAmbulance() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude, longitude } = pos.coords;
      const r = await findNearbyAmbulance(latitude, longitude);
      setNearby(r);
    });
  }

  return (
    <div>
      <Hero
        title="AI Diagnostic & Triage Dashboard"
        subtitle="Run a quick analysis, review trends, and act on red flags."
        cta={<div className="flex gap-3 items-center"><Button onClick={analyzeMock}>Run Analysis</Button><Button variant="secondary" onClick={locateAmbulance}>Find Ambulance</Button></div>}
      />
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
    </div>
  );
}


