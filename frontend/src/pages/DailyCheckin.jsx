import React, { useEffect, useMemo, useState } from 'react';
import { analyze } from '../services/api';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ui/ToastProvider';

export default function DailyCheckin() {
  const { notify } = useToast();
  const [symptoms, setSymptoms] = useState('');
  const [severity, setSeverity] = useState('');
  const [onsetDate, setOnsetDate] = useState('');
  const [temperatureC, setTemperatureC] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const maxLength = 500;

  const isValid = useMemo(() => {
    if (symptoms.trim().length < 5) return false;
    if (!severity) return false;
    if (temperatureC !== '') {
      const t = Number(temperatureC);
      if (Number.isNaN(t) || t < 34 || t > 43) return false;
    }
    return true;
  }, [symptoms, severity, temperatureC]);

  // Autosave to localStorage and restore on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('daily_checkin_draft') || 'null');
      if (saved && typeof saved === 'object') {
        setSymptoms(saved.symptoms || '');
        setSeverity(saved.severity || '');
        setOnsetDate(saved.onsetDate || '');
        setTemperatureC(saved.temperatureC ?? '');
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const payload = { symptoms, severity, onsetDate, temperatureC };
    try {
      localStorage.setItem('daily_checkin_draft', JSON.stringify(payload));
    } catch (_) {}
  }, [symptoms, severity, onsetDate, temperatureC]);

  async function submit(e) {
    e.preventDefault();
    if (!symptoms.trim() || symptoms.trim().length < 5) {
      notify('Please describe your symptoms (at least 5 characters).', 'error');
      return;
    }
    if (!severity) {
      notify('Please select a severity.', 'error');
      return;
    }
    if (temperatureC !== '') {
      const t = Number(temperatureC);
      if (Number.isNaN(t) || t < 34 || t > 43) {
        notify('Temperature must be between 34°C and 43°C.', 'error');
        return;
      }
    }

    const payload = {
      notes: [
        `Symptoms: ${symptoms.trim()}`,
        `Severity: ${severity}`,
        onsetDate ? `Onset: ${onsetDate}` : null,
      ].filter(Boolean).join(' | '),
      patient: {
        reportedSeverity: severity,
        onsetDate: onsetDate || null,
      },
      vitals: {
        temperatureC: temperatureC === '' ? null : Number(temperatureC)
      }
    };

    setIsSubmitting(true);
    try {
      const response = await analyze(payload);
      setResult(response);
      notify('Check-in analyzed successfully.', 'success');
      try { localStorage.removeItem('daily_checkin_draft'); } catch (_) {}
    } catch (err) {
      notify('Failed to analyze check-in. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const presets = [
    'Fever',
    'Headache',
    'Cough',
    'Sore throat',
    'Fatigue',
    'Shortness of breath',
    'Nausea',
    'Body aches'
  ];

  function appendPreset(preset) {
    const curr = symptoms.trim();
    const next = curr ? `${curr}, ${preset}` : preset;
    setSymptoms(next);
  }

  function onKeyDown(e) {
    const isMetaEnter = (e.metaKey || e.ctrlKey) && e.key === 'Enter';
    if (isMetaEnter) {
      e.preventDefault();
      if (!isSubmitting) {
        const fakeEvent = { preventDefault: () => {} };
        submit(fakeEvent);
      }
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Daily Check-in</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Describe your symptoms</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label htmlFor="symptoms" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Symptoms</label>
                <Textarea
                  id="symptoms"
                  placeholder="e.g. Mild fever since morning, headache, slight cough"
                  value={symptoms}
                  onChange={e => setSymptoms(e.target.value.slice(0, maxLength))}
                  rows={5}
                  onKeyDown={onKeyDown}
                />
                {symptoms.length > 0 && symptoms.trim().length < 5 && (
                  <p className="mt-1 text-xs text-red-600">Please enter at least 5 characters.</p>
                )}
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <p>Tip: Press Ctrl/⌘+Enter to submit</p>
                  <p>{symptoms.length}/{maxLength}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="severity" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Severity</label>
                  <select
                    id="severity"
                    value={severity}
                    onChange={e => setSeverity(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                  >
                    <option value="">Select...</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="onsetDate" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Onset date</label>
                  <input
                    id="onsetDate"
                    type="date"
                    value={onsetDate}
                    onChange={e => setOnsetDate(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label htmlFor="temperatureC" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Temperature (°C)</label>
                  <input
                    id="temperatureC"
                    type="number"
                    step="0.1"
                    min="34"
                    max="43"
                    inputMode="decimal"
                    placeholder="e.g. 38.2"
                    value={temperatureC}
                    onChange={e => setTemperatureC(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                  />
                  {temperatureC !== '' && (Number(temperatureC) < 34 || Number(temperatureC) > 43) && (
                    <p className="mt-1 text-xs text-red-600">Enter a value between 34 and 43.</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {presets.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => appendPreset(p)}
                    className="px-2 py-1 rounded-full text-xs border border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={!isValid || isSubmitting}>
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2"><Spinner size={16} /> Analyzing...</span>
                  ) : (
                    'Analyze'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting}
                  onClick={() => { setSymptoms(''); setSeverity(''); setOnsetDate(''); setTemperatureC(''); }}
                >
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-3 text-sm">
                {result.ok === false && result.error && (
                  <p className="text-red-600">{String(result.error)}</p>
                )}
                {result.data && (
                  <>
                    {Array.isArray(result.data.rankedDiagnoses) && result.data.rankedDiagnoses.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-1">Top diagnoses</h3>
                        <ul className="list-disc ml-5 space-y-1">
                          {result.data.rankedDiagnoses.map((d, idx) => (
                            <li key={`${d.label}-${idx}`}>
                              <span className="font-medium">{d.label}</span>
                              {typeof d.confidence === 'number' && (
                                <span className="ml-2 text-slate-500">{Math.round(d.confidence * 100)}%</span>
                              )}
                              {Array.isArray(d.evidence) && d.evidence.length > 0 && (
                                <span className="ml-2 text-slate-500">evidence: {d.evidence.join(', ')}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(result.data.urgentAlerts) && result.data.urgentAlerts.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-1 text-red-700">Urgent alerts</h3>
                        <ul className="list-disc ml-5 space-y-1">
                          {result.data.urgentAlerts.map((a, idx) => (
                            <li key={`alert-${idx}`}>{a.condition || 'Alert'}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.data.guidance && (
                      <div>
                        <h3 className="font-medium mb-1">Guidance</h3>
                        <p className="text-slate-700 dark:text-slate-300">{result.data.guidance}</p>
                      </div>
                    )}
                    {result.data.xai && (
                      <div>
                        <h3 className="font-medium mb-1">Explainability</h3>
                        <pre className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-3 overflow-auto">{JSON.stringify(result.data.xai, null, 2)}</pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                <p>Your analysis will appear here after submission.</p>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Include onset time and severity (e.g., mild, moderate).</li>
                  <li>Mention relevant context (e.g., recent travel, exposure).</li>
                  <li>List medications taken or known conditions if relevant.</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


