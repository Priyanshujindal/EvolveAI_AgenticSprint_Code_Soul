import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { processReportWithProgress } from '../services/api';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ui/ToastProvider';

export default function UploadReport() {
  const { notify } = useToast();
  const [file, setFile] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [showOcr, setShowOcr] = useState(true);
  const [statusText, setStatusText] = useState('Idle');
  const abortRef = useRef(null);
  const [lastError, setLastError] = useState('');

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
      setOcr(res);
      setStatusText('Completed');
      notify('Report processed successfully.', 'success');
    } catch (err) {
      const message = err?.message || 'Failed to process the report.';
      setLastError(message);
      setStatusText(message.toLowerCase().includes('canceled') ? 'Canceled' : 'Failed');
      notify(message, 'error');
    } finally {
      abortRef.current = null;
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
                <div className="flex items-center gap-3">
                  {isLoading ? <Spinner size={20} /> : (
                    <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none">
                      <path d="M12 16V4m0 12l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="3" y="16" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  )}
                  <div className="text-slate-800">
                    <div className="font-medium">Drag and drop your report</div>
                    <div className="text-xs text-slate-600">PDF, JPG, or PNG up to 10MB</div>
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
                <Button type="button" variant="secondary" onClick={() => { setFile(null); setOcr(null); setStatusText('Idle'); if (inputRef.current) inputRef.current.value = ''; }} disabled={isLoading}>
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
            </div>
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
            ) : showOcr ? (
              <pre className="bg-slate-50 dark:bg-slate-950 border rounded p-3 overflow-auto max-h-[520px] border-fuchsia-200">{JSON.stringify(ocr, null, 2)}</pre>
            ) : (
              <div className="text-sm text-slate-600">Result hidden</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



