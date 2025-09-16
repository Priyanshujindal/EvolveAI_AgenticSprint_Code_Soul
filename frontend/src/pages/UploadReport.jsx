import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { processReportWithProgress, pdfExtract } from '../services/api';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ui/ToastProvider';
import StatCard from '../components/StatCard';
import RiskChart from '../components/RiskChart';

export default function UploadReport() {
  const { notify } = useToast();
  const [file, setFile] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [showOcr, setShowOcr] = useState(true);
  const [statusText, setStatusText] = useState('Idle');
  const abortRef = useRef(null);
  const [lastError, setLastError] = useState('');
  const [lastErrorDetail, setLastErrorDetail] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [forceOcr, setForceOcr] = useState(false);
  const [ocrLang, setOcrLang] = useState('eng');
  const [isFullscreen, setIsFullscreen] = useState(false);
  function generateSimpleSummary(extractedData) {
    try {
      const labs = Array.isArray(extractedData?.labs) ? extractedData.labs : [];
      const meta = extractedData?.meta || {};
      const byName = (name) => labs.find(l => (l.name || '').toLowerCase() === name.toLowerCase());
      const hemo = byName('hemoglobin');
      const glucose = byName('glucose');
      const creat = byName('creatinine');
      const pieces = [];
      if (meta?.date) pieces.push(`Report date: ${meta.date}.`);
      if (hemo && typeof hemo.value === 'number') {
        const v = hemo.value; const u = hemo.unit || 'g/dL';
        pieces.push(`Hemoglobin is ${v} ${u}, which reflects your blood's oxygen-carrying protein.`);
      }
      if (glucose && typeof glucose.value === 'number') {
        const v = glucose.value; const u = glucose.unit || 'mg/dL';
        pieces.push(`Glucose is ${v} ${u}, a snapshot of blood sugar at the time of test.`);
      }
      if (creat && typeof creat.value === 'number') {
        const v = creat.value; const u = creat.unit || 'mg/dL';
        pieces.push(`Creatinine is ${v} ${u}, which helps indicate kidney function.`);
      }
      if (!pieces.length) return 'We parsed the report and extracted key details. Values will appear here once identified.';
      return pieces.join(' ');
    } catch (_) {
      return 'We parsed the report and extracted key details.';
    }
  }

  const acceptedTypes = useMemo(() => ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'], []);
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  const validateFile = useCallback((f) => {
    if (!f) return 'No file selected';
    if (!acceptedTypes.includes(f.type)) return 'Unsupported file type. Use PDF, JPG, or PNG.';
    if (f.size > maxSizeBytes) return 'File is too large. Max 10MB.';
    return null;
  }, [acceptedTypes]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    const err = validateFile(f);
    if (err) {
      notify(err, 'error');
      return;
    }
    setFile(f || null);
  }, [notify, validateFile]);

  const onBrowse = useCallback((e) => {
    const f = e.target.files?.[0];
    const err = validateFile(f);
    if (err) {
      notify(err, 'error');
      e.target.value = '';
      return;
    }
    setFile(f || null);
  }, [notify, validateFile]);

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl('');
  }, [file]);

  // Enable paste-from-clipboard for images
  useEffect(() => {
    const onPaste = async (e) => {
      try {
        const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'));
        if (!item) return;
        const blob = item.getAsFile();
        if (!blob) return;
        const err = validateFile(blob);
        if (err) {
          notify(err, 'error');
          return;
        }
        setFile(new File([blob], blob.name || 'pasted-image.png', { type: blob.type }));
        notify('Image pasted from clipboard', 'success');
      } catch (_) {}
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [notify, validateFile]);

  async function submit(e) {
    e.preventDefault();
    if (!file) {
      notify('Please select a file to process.', 'error');
      return;
    }
    setIsLoading(true);
    setProgress(0);
    setLastError('');
    setStatusText('Uploading…');
    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const res = await processReportWithProgress(file, {
        onProgress: (p) => setProgress(p),
        signal: controller.signal
      });
      setProgress(100);
      setOcr(res?.ocr || res);
      setExtracted(res?.extracted || null);
      setStatusText('Completed');
      notify('Report processed successfully.', 'success');
    } catch (err) {
      const message = err?.message || 'Failed to process the report.';
      setLastError(message);
      setLastErrorDetail(err && err.body ? err.body : null);
      setStatusText(message.toLowerCase().includes('canceled') ? 'Canceled' : 'Failed');
      notify(message, 'error');
    } finally {
      abortRef.current = null;
      setTimeout(() => setIsLoading(false), 200);
    }
  }

  async function submitUrl(e) {
    e.preventDefault();
    const url = (pdfUrl || '').trim();
    if (!url) {
      notify('Enter a PDF URL to process.', 'error');
      return;
    }
    setIsLoading(true);
    setProgress(0);
    setLastError('');
    setLastErrorDetail(null);
    setStatusText('Processing URL…');
    try {
      const res = await pdfExtract(url, { useOcr: forceOcr ? true : null, lang: ocrLang });
      setOcr(res?.ocr || res);
      setExtracted(res?.extracted || null);
      setStatusText('Completed');
      notify('PDF URL processed successfully.', 'success');
    } catch (err) {
      const message = err?.message || 'Failed to process the PDF URL.';
      setLastError(message);
      setLastErrorDetail(err && err.body ? err.body : null);
      setStatusText('Failed');
      notify(message, 'error');
    } finally {
      setTimeout(() => setIsLoading(false), 200);
    }
  }

  const cancelUpload = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const retry = useCallback(() => {
    if (!file) return;
    setOcr(null);
    setProgress(0);
    setStatusText('Retrying…');
    const fakeEvent = { preventDefault: () => {} };
    submit(fakeEvent);
  }, [file]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600">Upload Report</h1>
        <p className="text-sm text-slate-600">Upload a medical report to extract key details with OCR. We support PDF and image formats.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="bg-sky-50 border-b border-sky-200">
            <CardTitle className="text-sky-900">Select file</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div
                className={`relative flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-6 py-10 text-center transition-colors bg-gradient-to-r ${
                  isDragging
                    ? 'from-blue-50 via-sky-50 to-indigo-50 border-blue-600'
                    : 'from-sky-50 via-indigo-50 to-fuchsia-50 border-slate-300 hover:border-blue-400'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                role="button"
                tabIndex={0}
                aria-label="Drag and drop a report file here or choose a file"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (inputRef.current) inputRef.current.click();
                  }
                }}
              >
                {isDragging && (
                  <div className="absolute inset-0 bg-blue-600/10 border-2 border-blue-600 rounded pointer-events-none" />
                )}
                <div className="flex items-center gap-3">
                  {isLoading ? <Spinner size={20} /> : (
                    <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none">
                      <path d="M12 16V4m0 12l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="3" y="16" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  )}
                  <div className="text-slate-800">
                    <div className="font-medium">Drag and drop your report</div>
                    <div className="text-xs text-slate-600">PDF, JPG, or PNG up to 10MB. Paste an image with Ctrl/Cmd+V.</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">or</div>
                <input
                  ref={inputRef}
                  type="file"
                  accept={acceptedTypes.join(',')}
                  onChange={onBrowse}
                  className="hidden"
                />
                <Button type="button" variant="secondary" onClick={() => inputRef.current && inputRef.current.click()} disabled={isLoading} className="hover:bg-indigo-100">
                  Choose file
                </Button>
                {file && (
                  <div className="mt-3 w-full max-w-md">
                    {previewUrl ? (
                      <div className="flex items-center gap-3">
                        <img src={previewUrl} alt="preview" className="h-20 w-20 object-cover rounded border border-emerald-200" />
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-slate-800 truncate">{file.name}</div>
                            <span className="rounded-full bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 border border-emerald-200">IMAGE</span>
                          </div>
                          <div className="text-xs text-slate-600">{Math.ceil(file.size / 1024)} KB</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-rose-100 text-rose-700 flex items-center justify-center font-semibold border border-rose-200">PDF</div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-slate-800 truncate">{file.name}</div>
                            <span className="rounded-full bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 border border-rose-200">PDF</span>
                          </div>
                          <div className="text-xs text-slate-600">{Math.ceil(file.size / 1024)} KB</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {isLoading && (
                  <div className="absolute inset-x-0 bottom-0">
                    <div className="h-1 w-full bg-indigo-100">
                      <div className="h-1 bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="secondary" onClick={() => { setFile(null); setOcr(null); setExtracted(null); setStatusText('Idle'); if (inputRef.current) inputRef.current.value = ''; }} disabled={isLoading}>
                  Remove
                </Button>
                <Button type="button" variant="ghost" onClick={() => inputRef.current && inputRef.current.click()} disabled={isLoading}>
                  Replace
                </Button>
                <div className="ml-auto" />
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="danger" onClick={cancelUpload}>
                      Cancel
                    </Button>
                    <Button type="button" variant="primary" disabled className="bg-indigo-600">
                      <span className="inline-flex items-center gap-2"><Spinner size={16} /> Uploading…</span>
                    </Button>
                  </div>
                ) : (
                  <Button type="submit" disabled={!file} className="bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-600">
                    Process report
                  </Button>
                )}
              </div>
            </form>

            <div className="mt-4 space-y-2">
              <div className="text-xs text-slate-600">Or process a PDF by URL</div>
              <form onSubmit={submitUrl} className="flex items-stretch gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/report.pdf"
                  className="flex-1 rounded border px-3 py-2 text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  disabled={isLoading}
                />
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={forceOcr} onChange={(e) => setForceOcr(e.target.checked)} disabled={isLoading} />
                  Force OCR
                </label>
                <select
                  className="rounded border px-2 py-2 text-xs border-slate-300 bg-white"
                  value={ocrLang}
                  onChange={(e) => setOcrLang(e.target.value)}
                  disabled={isLoading}
                  title="OCR language"
                >
                  <option value="eng">English (eng)</option>
                  <option value="hin">Hindi (hin)</option>
                  <option value="eng+hin">English+Hindi (eng+hin)</option>
                </select>
                <Button type="submit" variant="secondary" disabled={isLoading || !pdfUrl.trim()} className="hover:bg-indigo-100">
                  Process URL
                </Button>
              </form>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border ${statusText === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (statusText === 'Failed' || statusText === 'Canceled') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
                  <span className={`h-2 w-2 rounded-full ${statusText === 'Completed' ? 'bg-emerald-600' : (statusText === 'Failed' || statusText === 'Canceled') ? 'bg-rose-600' : 'bg-sky-600'}`} />
                  {statusText}
                </span>
                {!!lastError && !isLoading && (
                  <button className="text-rose-700 underline" onClick={retry}>
                    Retry
                  </button>
                )}
              </div>
              {!!lastError && lastErrorDetail && (
                <div className="mt-2 text-xs text-rose-700">
                  {lastErrorDetail?.acceptedTypes && (
                    <div>Supported types: {(lastErrorDetail.acceptedTypes || []).join(', ')}</div>
                  )}
                  {lastErrorDetail?.maxSizeMb && (
                    <div>Max file size: {lastErrorDetail.maxSizeMb} MB</div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary panel */}
        <Card>
          <CardHeader className="bg-white border-b border-slate-200">
            <CardTitle className="text-slate-900">Summary</CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            {!extracted ? (
              <div className="text-sm text-slate-600">Upload or process a report to see a quick summary.</div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const labs = Array.isArray(extracted?.labs) ? extracted.labs : [];
                  const byName = (name) => labs.find(l => (l.name || '').toLowerCase() === name.toLowerCase());
                  const hemo = byName('hemoglobin');
                  const glucose = byName('glucose');
                  const creat = byName('creatinine');
                  const totalLabs = labs.length;

                  // Simple reference ranges (illustrative)
                  const ranges = {
                    hemoglobin: { min: 12, max: 16, unit: 'g/dL' },
                    glucose: { min: 70, max: 140, unit: 'mg/dL' },
                    creatinine: { min: 0.6, max: 1.3, unit: 'mg/dL' },
                  };

                  function badge(value, { min, max }) {
                    if (typeof value !== 'number') return { text: '—', cls: 'bg-slate-100 text-slate-700' };
                    if (value < min) return { text: 'Low', cls: 'bg-amber-100 text-amber-800' };
                    if (value > max) return { text: 'High', cls: 'bg-rose-100 text-rose-800' };
                    return { text: 'Normal', cls: 'bg-emerald-100 text-emerald-800' };
                  }

                  function meter(value, { min, max }) {
                    if (typeof value !== 'number') return 0.5;
                    const clamped = Math.max(min, Math.min(max, value));
                    return (clamped - min) / (max - min);
                  }
                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <StatCard label="Labs detected" value={String(totalLabs)} hint="Parsed from OCR" accent="blue" />
                        <StatCard label="Hemoglobin" value={hemo ? `${hemo.value ?? '—'} ${hemo.unit || ''}` : '—'} hint="g/dL" accent="emerald" />
                        <StatCard label="Glucose" value={glucose ? `${glucose.value ?? '—'} ${glucose.unit || ''}` : '—'} hint="mg/dL" accent="amber" />
                      </div>
                      <div className="text-[13px] leading-6 text-slate-800 bg-slate-50 border border-slate-200 rounded p-3">
                        {generateSimpleSummary(extracted)}
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {/* Color-coded badges + meters */}
                        <div className="rounded border border-slate-200 p-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="font-medium text-slate-900">Hemoglobin</div>
                            {(() => { const b = badge(hemo?.value, ranges.hemoglobin); return <span className={`px-2 py-0.5 rounded text-xs ${b.cls}`}>{b.text}</span>; })()}
                          </div>
                          <div className="mt-2 h-2 bg-slate-100 rounded">
                            <div className="h-2 bg-emerald-500 rounded" style={{ width: `${Math.round(meter(hemo?.value, ranges.hemoglobin) * 100)}%` }} />
                          </div>
                          <div className="mt-1 text-xs text-slate-500">Range {ranges.hemoglobin.min}-{ranges.hemoglobin.max} {ranges.hemoglobin.unit}</div>
                        </div>
                        <div className="rounded border border-slate-200 p-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="font-medium text-slate-900">Glucose</div>
                            {(() => { const b = badge(glucose?.value, ranges.glucose); return <span className={`px-2 py-0.5 rounded text-xs ${b.cls}`}>{b.text}</span>; })()}
                          </div>
                          <div className="mt-2 h-2 bg-slate-100 rounded">
                            <div className="h-2 bg-blue-500 rounded" style={{ width: `${Math.round(meter(glucose?.value, ranges.glucose) * 100)}%` }} />
                          </div>
                          <div className="mt-1 text-xs text-slate-500">Range {ranges.glucose.min}-{ranges.glucose.max} {ranges.glucose.unit}</div>
                        </div>
                        <div className="rounded border border-slate-200 p-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="font-medium text-slate-900">Creatinine</div>
                            {(() => { const b = badge(creat?.value, ranges.creatinine); return <span className={`px-2 py-0.5 rounded text-xs ${b.cls}`}>{b.text}</span>; })()}
                          </div>
                          <div className="mt-2 h-2 bg-slate-100 rounded">
                            <div className="h-2 bg-indigo-500 rounded" style={{ width: `${Math.round(meter(creat?.value, ranges.creatinine) * 100)}%` }} />
                          </div>
                          <div className="mt-1 text-xs text-slate-500">Range {ranges.creatinine.min}-{ranges.creatinine.max} {ranges.creatinine.unit}</div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-white border-b border-slate-200">
            <CardTitle className="text-slate-900">Extracted Fields</CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            {!extracted ? (
              <div className="text-base text-slate-700">No structured fields extracted yet.</div>
            ) : (
              <div className="space-y-4 text-base text-slate-900">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Meta</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div><span className="text-slate-600">Patient:</span> <span className="font-medium">{extracted?.meta?.patientName || '—'}</span></div>
                    <div><span className="text-slate-600">Patient ID:</span> <span className="font-medium">{extracted?.meta?.patientId || '—'}</span></div>
                    <div><span className="text-slate-600">Date:</span> <span className="font-medium">{extracted?.meta?.date || '—'}</span></div>
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Labs</div>
                  {!extracted?.labs?.length ? (
                    <div className="text-slate-700">No labs found</div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded">
                      <table className="min-w-full text-left">
                        <thead className="bg-slate-50 text-slate-700">
                          <tr>
                            <th className="px-3 py-2 border-b border-slate-200">Name</th>
                            <th className="px-3 py-2 border-b border-slate-200">Value</th>
                            <th className="px-3 py-2 border-b border-slate-200">Unit</th>
                            <th className="px-3 py-2 border-b border-slate-200">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {extracted.labs.map((lab, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="px-3 py-2 capitalize text-slate-900">{lab.name}</td>
                              <td className="px-3 py-2 text-slate-900">{lab.value ?? '—'}</td>
                              <td className="px-3 py-2 text-slate-900">{lab.unit || '—'}</td>
                              <td className="px-3 py-2 text-slate-900">{typeof lab.confidence === 'number' ? `${Math.round(lab.confidence * 100)}%` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {(extracted?.diagnoses?.length || extracted?.medications?.length) ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Diagnoses</div>
                      <ul className="list-disc pl-5">
                        {(extracted.diagnoses || []).map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Medications</div>
                      <ul className="list-disc pl-5">
                        {(extracted.medications || []).map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={!extracted}
                    onClick={() => {
                      try {
                        const payload = JSON.stringify(extracted, null, 2);
                        navigator.clipboard.writeText(payload);
                        notify('Extracted fields copied', 'success');
                      } catch (_) {
                        notify('Copy failed', 'error');
                      }
                    }}
                  >
                    Copy extracted JSON
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between bg-fuchsia-50 border-b border-fuchsia-200">
            <CardTitle className="text-fuchsia-900">OCR Result</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  if (!ocr) return;
                  try {
                    await navigator.clipboard.writeText(JSON.stringify(ocr, null, 2));
                    notify('Copied to clipboard', 'success');
                  } catch (_) {
                    notify('Copy failed', 'error');
                  }
                }}
                disabled={!ocr}
              >
                Copy
              </Button>
              <Button type="button" variant="ghost" className="hover:bg-fuchsia-100" onClick={() => setShowOcr(v => !v)}>
                {showOcr ? 'Collapse' : 'Expand'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!ocr ? (
              <div className="text-sm text-slate-600">No result yet. Upload a report to see extracted data.</div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-slate-700">Preview {ocr?.method ? `(method: ${ocr.method}${typeof ocr.pageCount === 'number' ? `, pages: ${ocr.pageCount}` : ''}${ocr?.lang ? `, lang: ${ocr.lang}` : ''})` : ''}</div>
                <div className="bg-white border rounded p-3 border-slate-300 text-base leading-6 text-slate-900 whitespace-pre-wrap max-h-96 overflow-auto select-text">
                  {(() => {
                    const text = (ocr && (ocr.text || (ocr.ocr && ocr.ocr.text))) || '';
                    const preview = text ? text.trim().slice(0, 600) : '';
                    return preview || 'No text extracted';
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={async () => {
                      if (!ocr) return;
                      try {
                        await navigator.clipboard.writeText(JSON.stringify(ocr, null, 2));
                        notify('Copied to clipboard', 'success');
                      } catch (_) {
                        notify('Copy failed', 'error');
                      }
                    }}
                    disabled={!ocr}
                  >
                    Copy JSON
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="hover:bg-fuchsia-100"
                    onClick={() => setIsFullscreen(true)}
                    disabled={!ocr}
                  >
                    Fullscreen
                  </Button>
                  <Button type="button" variant="ghost" className="hover:bg-fuchsia-100" onClick={() => setShowOcr(v => !v)}>
                    {showOcr ? 'Hide full JSON' : 'Show full JSON'}
                  </Button>
                </div>
                {showOcr && (
                  <pre className="bg-slate-50 dark:bg-slate-950 border rounded p-3 overflow-auto max-h-[520px] border-fuchsia-200">{JSON.stringify(ocr, null, 2)}</pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <OcrFullscreenModal open={isFullscreen} onClose={() => setIsFullscreen(false)} ocr={ocr} />
    </div>
  );
}

// Fullscreen modal for OCR text
function OcrFullscreenModal({ open, onClose, ocr }) {
  if (!open) return null;
  const text = (ocr && (ocr.text || (ocr.ocr && ocr.ocr.text))) || '';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded shadow-xl w-[90vw] h-[80vh] flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="text-sm text-slate-700">OCR Fullscreen Viewer</div>
          <button className="text-slate-700 text-sm hover:underline" onClick={onClose}>Close</button>
        </div>
        <div className="p-4 overflow-auto whitespace-pre-wrap text-slate-900 text-base leading-6 select-text">
          {text || 'No text extracted'}
        </div>
      </div>
    </div>
  );
}



