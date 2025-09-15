import React, { useMemo, useState } from 'react';
import { analyzeCheckinApi } from '../services/api';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ui/ToastProvider';

export default function DailyCheckin() {
  const { notify } = useToast();
  const [symptoms, setSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const maxLength = 500;

  const isValid = useMemo(() => symptoms.trim().length >= 5, [symptoms]);

  async function submit(e) {
    e.preventDefault();
    if (!isValid) {
      notify('Please describe your symptoms (at least 5 characters).', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await analyzeCheckinApi({ symptoms: symptoms.trim() });
      setResult(response);
      notify('Check-in analyzed successfully.', 'success');
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
                {!isValid && symptoms.length > 0 && (
                  <p className="mt-1 text-xs text-red-600">Please enter at least 5 characters.</p>
                )}
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <p>Tip: Press Ctrl/⌘+Enter to submit</p>
                  <p>{symptoms.length}/{maxLength}</p>
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
                <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => setSymptoms('')}>Clear</Button>
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
              <pre className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-3 overflow-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
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


