import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { processReportWithProgress, pdfExtract, generateReportSummary } from '../services/api';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ui/ToastProvider';
import StatCard from '../components/StatCard';
import RiskChart from '../components/RiskChart';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function UploadReport() {
  const { notify } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [statusText, setStatusText] = useState('Idle');
  const abortRef = useRef(null);
  const [lastError, setLastError] = useState('');
  const [lastErrorDetail, setLastErrorDetail] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [forceOcr, setForceOcr] = useState(false);
  const [ocrLang, setOcrLang] = useState('eng');
  const [aiSummary, setAiSummary] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [extractionQuality, setExtractionQuality] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries] = useState(3);

  const calculateExtractionQuality = useCallback((extractedData) => {
    if (!extractedData) return { score: 0, issues: ['No data extracted'] };
    
    const labs = Array.isArray(extractedData?.labs) ? extractedData.labs : [];
    const meta = extractedData?.meta || {};
    const issues = [];
    let score = 1.0;
    
    // Check lab extraction quality
    if (labs.length === 0) {
      issues.push('No lab values extracted');
      score -= 0.4;
    } else {
      const highConfidenceLabs = labs.filter(lab => lab.confidence >= 0.7);
      const confidenceRatio = highConfidenceLabs.length / labs.length;
      
      if (confidenceRatio < 0.5) {
        issues.push('Low confidence in extracted lab values');
        score -= 0.2;
      }
      
      const validValues = labs.filter(lab => lab.value !== null && lab.value !== undefined);
      if (validValues.length < labs.length * 0.7) {
        issues.push('Many lab values missing or invalid');
        score -= 0.2;
      }
    }
    
    // Check metadata quality
    if (!meta.patientName && !meta.patientId) {
      issues.push('No patient identification found');
      score -= 0.1;
    }
    
    if (!meta.date) {
      issues.push('No report date found');
      score -= 0.1;
    }
    
    // Check for critical lab values
    const criticalLabs = ['hemoglobin', 'glucose', 'creatinine', 'sodium', 'potassium'];
    const foundCritical = criticalLabs.some(labName => 
      labs.some(lab => lab.name === labName && lab.value !== null)
    );
    
    if (!foundCritical) {
      issues.push('No critical lab values found');
      score -= 0.1;
    }
    
    return {
      score: Math.max(0, Math.min(1, score)),
      issues: issues.length > 0 ? issues : ['Good extraction quality'],
      labCount: labs.length,
      highConfidenceCount: labs.filter(lab => lab.confidence >= 0.7).length
    };
  }, []);

  const generateAISummary = useCallback(async () => {
    if (!extracted || isGeneratingSummary) return;
    
    setIsGeneratingSummary(true);
    setAiSummary(null);
    
    try {
      const ocrText = ocr?.text || '';
      const result = await generateReportSummary(extracted, ocrText);
      
      if (result.ok && result.summary) {
        setAiSummary(result.summary);
        notify('AI summary generated successfully', 'success');

        // Persist to Firestore under the current user
        try {
          if (db && user && user.uid) {
            const col = collection(db, 'users', user.uid, 'reportSummaries');
            const safeMeta = extracted?.meta || {};
            await addDoc(col, {
              createdAt: serverTimestamp(),
              summary: result.summary,
              simpleSummary: generateSimpleSummary(extracted),
              meta: {
                patientName: safeMeta.patientName || null,
                patientId: safeMeta.patientId || null,
                date: safeMeta.date || null,
              },
              stats: {
                labCount: Array.isArray(extracted?.labs) ? extracted.labs.length : 0,
              },
              // keep small preview of OCR to avoid large writes
              ocrPreview: (ocrText || '').slice(0, 2000) || null,
            });
            notify('Summary saved to your records', 'success');
          } else {
            notify('Login required to save summary', 'info');
          }
        } catch (saveErr) {
          console.error('Failed to save summary:', saveErr);
          notify('Summary generated but saving to cloud failed.', 'warning');
        }
      } else {
        throw new Error(result.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      notify('Failed to generate AI summary: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [extracted, ocr, isGeneratingSummary, notify]);

  function generateSimpleSummary(extractedData) {
    try {
      const labs = Array.isArray(extractedData?.labs) ? extractedData.labs : [];
      const meta = extractedData?.meta || {};
      const diagnoses = Array.isArray(extractedData?.diagnoses) ? extractedData.diagnoses : [];
      const medications = Array.isArray(extractedData?.medications) ? extractedData.medications : [];
      
      const byName = (name) => labs.find(l => (l.name || '').toLowerCase() === name.toLowerCase());
      const hemo = byName('hemoglobin');
      const glucose = byName('glucose');
      const creat = byName('creatinine');
      const wbc = byName('wbc');
      const platelets = byName('platelets');
      const sodium = byName('sodium');
      const potassium = byName('potassium');
      const hba1c = byName('hbA1c');
      
      const pieces = [];
      
      // Patient information
      if (meta?.patientName) pieces.push(`Patient: ${meta.patientName}`);
      if (meta?.patientId) pieces.push(`ID: ${meta.patientId}`);
      if (meta?.date) pieces.push(`Report Date: ${meta.date}`);
      
      if (pieces.length > 0) pieces.push(''); // Add spacing
      
      // Lab values with normal ranges
      const labValues = [];
      if (hemo && typeof hemo.value === 'number') {
        const v = hemo.value; const u = hemo.unit || 'g/dL';
        const status = v < 12 ? 'LOW' : v > 16 ? 'HIGH' : 'NORMAL';
        labValues.push(`• Hemoglobin: ${v} ${u} (${status}) - Blood oxygen-carrying protein`);
      }
      if (glucose && typeof glucose.value === 'number') {
        const v = glucose.value; const u = glucose.unit || 'mg/dL';
        const status = v < 70 ? 'LOW' : v > 140 ? 'HIGH' : 'NORMAL';
        labValues.push(`• Glucose: ${v} ${u} (${status}) - Blood sugar level`);
      }
      if (creat && typeof creat.value === 'number') {
        const v = creat.value; const u = creat.unit || 'mg/dL';
        const status = v < 0.6 ? 'LOW' : v > 1.3 ? 'HIGH' : 'NORMAL';
        labValues.push(`• Creatinine: ${v} ${u} (${status}) - Kidney function indicator`);
      }
      if (wbc && typeof wbc.value === 'number') {
        const v = wbc.value; const u = wbc.unit || '10^3/µL';
        const status = v < 4 ? 'LOW' : v > 11 ? 'HIGH' : 'NORMAL';
        labValues.push(`• White Blood Cells: ${v} ${u} (${status}) - Immune system cells`);
      }
      if (platelets && typeof platelets.value === 'number') {
        const v = platelets.value; const u = platelets.unit || '10^3/µL';
        const status = v < 150 ? 'LOW' : v > 450 ? 'HIGH' : 'NORMAL';
        labValues.push(`• Platelets: ${v} ${u} (${status}) - Blood clotting cells`);
      }
      if (sodium && typeof sodium.value === 'number') {
        const v = sodium.value; const u = sodium.unit || 'mmol/L';
        const status = v < 136 ? 'LOW' : v > 145 ? 'HIGH' : 'NORMAL';
        labValues.push(`• Sodium: ${v} ${u} (${status}) - Electrolyte balance`);
      }
      if (potassium && typeof potassium.value === 'number') {
        const v = potassium.value; const u = potassium.unit || 'mmol/L';
        const status = v < 3.5 ? 'LOW' : v > 5.0 ? 'HIGH' : 'NORMAL';
        labValues.push(`• Potassium: ${v} ${u} (${status}) - Heart and muscle function`);
      }
      if (hba1c && typeof hba1c.value === 'number') {
        const v = hba1c.value; const u = hba1c.unit || '%';
        const status = v < 5.7 ? 'NORMAL' : v < 6.5 ? 'PREDIABETES' : 'DIABETES';
        labValues.push(`• HbA1c: ${v} ${u} (${status}) - 3-month average blood sugar`);
      }
      
      if (labValues.length > 0) {
        pieces.push('LABORATORY RESULTS:');
        pieces.push(...labValues);
        pieces.push(''); // Add spacing
      }
      
      // Diagnoses
      if (diagnoses.length > 0) {
        pieces.push('DIAGNOSES:');
        diagnoses.forEach(d => pieces.push(`• ${d}`));
        pieces.push(''); // Add spacing
      }
      
      // Medications
      if (medications.length > 0) {
        pieces.push('MEDICATIONS:');
        medications.forEach(m => pieces.push(`• ${m}`));
        pieces.push(''); // Add spacing
      }
      
      // Summary assessment
      const abnormalLabs = labValues.filter(lab => lab.includes('HIGH') || lab.includes('LOW')).length;
      if (abnormalLabs > 0) {
        pieces.push(`SUMMARY: ${abnormalLabs} lab value(s) outside normal range. Please consult with your healthcare provider for interpretation and follow-up.`);
      } else if (labValues.length > 0) {
        pieces.push('SUMMARY: All lab values appear to be within normal ranges. Continue regular monitoring as recommended by your healthcare provider.');
      }
      
      if (pieces.length === 0) {
        return 'We parsed the report and extracted key details. Values will appear here once identified.';
      }
      
      return pieces.join('\n');
    } catch (error) {
      console.error('Error generating summary:', error);
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

  const validateMultipleFiles = useCallback((files) => {
    if (!files || files.length === 0) return null;
    if (files.length > 1) {
      const pdfCount = Array.from(files).filter(f => f.type === 'application/pdf').length;
      if (pdfCount > 1) {
        return 'Multiple PDF files detected. Please upload only one PDF at a time.';
      }
      return 'Multiple files detected. Please upload only one file at a time.';
    }
    return null;
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    // Check if a file is already uploaded
    if (file) {
      notify('A file is already uploaded. Please remove it first before uploading a new one.', 'error');
      return;
    }
    
    const files = e.dataTransfer.files;
    
    // Check if multiple files were dropped
    const multipleFilesError = validateMultipleFiles(files);
    if (multipleFilesError) {
      notify(multipleFilesError, 'error');
      return;
    }
    
    const f = files?.[0];
    const err = validateFile(f);
    if (err) {
      notify(err, 'error');
      return;
    }
    setFile(f || null);
  }, [notify, validateFile, validateMultipleFiles, file]);

  const onBrowse = useCallback((e) => {
    const files = e.target.files;
    
    // Check if a file is already uploaded
    if (file) {
      notify('A file is already uploaded. Please remove it first before uploading a new one.', 'error');
      e.target.value = '';
      return;
    }
    
    // Check if multiple files were selected
    const multipleFilesError = validateMultipleFiles(files);
    if (multipleFilesError) {
      notify(multipleFilesError, 'error');
      e.target.value = '';
      return;
    }
    
    const f = files?.[0];
    const err = validateFile(f);
    if (err) {
      notify(err, 'error');
      e.target.value = '';
      return;
    }
    setFile(f || null);
  }, [notify, validateFile, validateMultipleFiles, file]);

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl('');
  }, [file]);

  // Ensure file input is properly configured for single file upload
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.multiple = false;
    }
  }, []);

  // Enable paste-from-clipboard for images
  useEffect(() => {
    const onPaste = async (e) => {
      try {
        // Check if a file is already uploaded
        if (file) {
          notify('A file is already uploaded. Please remove it first before uploading a new one.', 'error');
          return;
        }
        
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
  }, [notify, validateFile, file]);

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
    setRetryCount(0);
    setExtractionQuality(null);
    
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
      setAiSummary(null); // Clear previous AI summary
      
      // Calculate extraction quality
      const quality = calculateExtractionQuality(res?.extracted);
      setExtractionQuality(quality);
      
      setStatusText('Completed');
      
      // Show quality-based notification
      if (quality.score >= 0.8) {
        notify('Report processed successfully with high quality extraction.', 'success');
      } else if (quality.score >= 0.6) {
        notify('Report processed with moderate quality extraction. Please review results.', 'warning');
      } else {
        notify('Report processed with low quality extraction. Consider retrying with a clearer image.', 'warning');
      }
    } catch (err) {
      const message = err?.message || 'Failed to process the report.';
      setLastError(message);
      setLastErrorDetail(err && err.body ? err.body : null);
      setStatusText(message.toLowerCase().includes('canceled') ? 'Canceled' : 'Failed');
      
      // Offer retry for certain errors
      if (retryCount < maxRetries && !message.toLowerCase().includes('canceled')) {
        notify(`${message} Retrying... (${retryCount + 1}/${maxRetries})`, 'warning');
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          submit(e);
        }, 2000);
      } else {
        notify(message, 'error');
      }
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
      setAiSummary(null); // Clear previous AI summary
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
        <h1 className="text-2xl font-semibold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-blue-600 to-blue-500">Upload Report</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Upload a single medical report to extract key details with OCR. We support PDF and image formats (one file at a time - remove current file to upload a new one).</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="bg-blue-50 dark:bg-slate-800/50 border-b border-blue-100 dark:border-slate-700">
            <CardTitle className="text-blue-900 dark:text-slate-100">Select file</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div
                className={`relative flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-6 py-10 text-center transition-colors bg-gradient-to-r ${
                  file
                    ? 'from-slate-50 via-slate-50 to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 border-slate-200 dark:border-slate-600 cursor-not-allowed opacity-60'
                    : isDragging
                    ? 'from-blue-50 via-sky-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 border-blue-600 dark:border-blue-500'
                    : 'from-brand-50 via-blue-50 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-400'
                }`}
                onDragOver={(e) => { 
                  if (!file) {
                    e.preventDefault(); 
                    setIsDragging(true); 
                  }
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                role="button"
                tabIndex={file ? -1 : 0}
                aria-label={file ? "File already uploaded. Remove current file to upload a new one." : "Drag and drop a report file here or choose a file"}
                onKeyDown={(e) => {
                  if (file) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (inputRef.current) {
                      inputRef.current.multiple = false;
                      inputRef.current.click();
                    }
                  }
                }}
              >
                {isDragging && (
                  <div className="absolute inset-0 bg-blue-600/10 dark:bg-blue-500/10 border-2 border-blue-600 dark:border-blue-500 rounded pointer-events-none" />
                )}
                <div className="flex items-center gap-3">
                  {isLoading ? <Spinner size={20} /> : (
                    <svg className="h-5 w-5 text-blue-600 dark:text-blue-300" viewBox="0 0 24 24" fill="none">
                      <path d="M12 16V4m0 12l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="3" y="16" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  )}
                  <div className="text-slate-800 dark:text-slate-100">
                    <div className="font-medium">{file ? 'File already uploaded' : 'Drag and drop your report'}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {file 
                        ? 'Remove current file to upload a new one' 
                        : 'PDF, JPG, or PNG up to 10MB (one file at a time). Paste an image with Ctrl/Cmd+V.'
                      }
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">or</div>
                <input
                  ref={inputRef}
                  type="file"
                  accept={acceptedTypes.join(',')}
                  onChange={onBrowse}
                  multiple={false}
                  className="hidden"
                  data-testid="file-input"
                />
                <Button type="button" variant="secondary" onClick={() => {
                  if (inputRef.current) {
                    // Ensure single file selection
                    inputRef.current.multiple = false;
                    inputRef.current.click();
                  }
                }} disabled={isLoading || !!file} className="hover:bg-indigo-100">
                  {file ? 'File uploaded' : 'Choose file'}
                </Button>
                {file && (
                  <div className="mt-3 w-full max-w-md">
                    {previewUrl ? (
                      <div className="flex items-center gap-3">
                        <img src={previewUrl} alt="preview" className="h-20 w-20 object-cover rounded border border-emerald-200 dark:border-emerald-700" />
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{file.name}</div>
                            <span className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 text-[10px] px-2 py-0.5 border border-emerald-200 dark:border-emerald-800">IMAGE</span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">{Math.ceil(file.size / 1024)} KB</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 flex items-center justify-center font-semibold border border-rose-200 dark:border-rose-800">PDF</div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{file.name}</div>
                            <span className="rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 text-[10px] px-2 py-0.5 border border-rose-200 dark:border-rose-800">PDF</span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">{Math.ceil(file.size / 1024)} KB</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {isLoading && (
                  <div className="absolute inset-x-0 bottom-0">
                    <div className="h-1 w-full bg-blue-100 dark:bg-slate-800">
                      <div className="h-1 bg-brand-600 dark:bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="secondary" onClick={() => { setFile(null); setOcr(null); setExtracted(null); setAiSummary(null); setStatusText('Idle'); if (inputRef.current) inputRef.current.value = ''; }} disabled={isLoading}>
                  Remove
                </Button>
                <Button type="button" variant="ghost" onClick={() => inputRef.current && inputRef.current.click()} disabled={isLoading || !file}>
                  Replace
                </Button>
                <div className="ml-auto" />
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="danger" onClick={cancelUpload}>
                      Cancel
                    </Button>
                    <Button type="button" variant="primary" disabled className="bg-brand-600 dark:bg-brand-600">
                      <span className="inline-flex items-center gap-2"><Spinner size={16} /> Uploading…</span>
                    </Button>
                  </div>
                ) : (
                  <Button type="submit" disabled={!file} className="bg-brand-600 hover:bg-brand-700 focus:ring-brand-600">
                    Process report
                  </Button>
                )}
              </div>
            </form>

            <div className="mt-4 space-y-2">
              <div className="text-xs text-slate-600 dark:text-slate-400">Or process a PDF by URL</div>
              <form onSubmit={submitUrl} className="flex items-stretch gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/report.pdf"
                  className="flex-1 rounded border px-3 py-2 text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-blue-300"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  disabled={isLoading}
                />
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={forceOcr} onChange={(e) => setForceOcr(e.target.checked)} disabled={isLoading} />
                  Force OCR
                </label>
                <select
                  className="rounded border px-2 py-2 text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
        <Card className="md:col-span-2">
          <CardHeader className="bg-white dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-900 dark:text-slate-100">Summary</CardTitle>
              {extracted && (
                 <div className="flex items-center gap-3">
                   <Button
                     type="button"
                     variant="secondary"
                     onClick={generateAISummary}
                     disabled={isGeneratingSummary}
                     className="text-sm px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                   >
                     {isGeneratingSummary ? (
                       <span className="flex items-center gap-2">
                         <Spinner size={14} />
                         <span>Generating AI Analysis...</span>
                       </span>
                     ) : (
                       <span className="flex items-center gap-2">
                         <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                           <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                         </svg>
                         <span>🤖 Generate AI Health Analysis</span>
                       </span>
                     )}
                   </Button>
                   <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                     Powered by Gemini AI
                   </div>
                 </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="bg-white dark:bg-slate-900/40">
            {!extracted ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">Upload or process a report to see a quick summary.</div>
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
                      {/* Quality Indicator */}
                      {extractionQuality && (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Extraction Quality</div>
                          <div className="flex items-center space-x-3">
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                                <span>Quality Score</span>
                                <span>{Math.round(extractionQuality.score * 100)}%</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    extractionQuality.score >= 0.8 ? 'bg-green-500' :
                                    extractionQuality.score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${extractionQuality.score * 100}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              {extractionQuality.labCount} labs, {extractionQuality.highConfidenceCount} high confidence
                            </div>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {extractionQuality.issues.map((issue, idx) => (
                              <div key={idx} className="flex items-center space-x-1">
                                <span className={`w-1 h-1 rounded-full ${
                                  issue.includes('Good') ? 'bg-green-500' : 'bg-amber-500'
                                }`}></span>
                                <span>{issue}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Report Summary</div>
                        <div className="text-[13px] leading-6 text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-3 whitespace-pre-line">
                          {generateSimpleSummary(extracted)}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {/* Color-coded badges + meters */}
                        <div className="rounded border border-slate-200 dark:border-slate-700 p-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="font-medium text-slate-900 dark:text-slate-100">Hemoglobin</div>
                            {(() => { const b = badge(hemo?.value, ranges.hemoglobin); return <span className={`px-2 py-0.5 rounded text-xs ${b.cls}`}>{b.text}</span>; })()}
                          </div>
                          <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-800 rounded">
                            <div className="h-2 bg-emerald-500 dark:bg-emerald-400 rounded" style={{ width: `${Math.round(meter(hemo?.value, ranges.hemoglobin) * 100)}%` }} />
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Range {ranges.hemoglobin.min}-{ranges.hemoglobin.max} {ranges.hemoglobin.unit}</div>
                        </div>
                        <div className="rounded border border-slate-200 dark:border-slate-700 p-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="font-medium text-slate-900 dark:text-slate-100">Glucose</div>
                            {(() => { const b = badge(glucose?.value, ranges.glucose); return <span className={`px-2 py-0.5 rounded text-xs ${b.cls}`}>{b.text}</span>; })()}
                          </div>
                          <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-800 rounded">
                            <div className="h-2 bg-blue-500 dark:bg-blue-400 rounded" style={{ width: `${Math.round(meter(glucose?.value, ranges.glucose) * 100)}%` }} />
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Range {ranges.glucose.min}-{ranges.glucose.max} {ranges.glucose.unit}</div>
                        </div>
                        <div className="rounded border border-slate-200 dark:border-slate-700 p-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="font-medium text-slate-900 dark:text-slate-100">Creatinine</div>
                            {(() => { const b = badge(creat?.value, ranges.creatinine); return <span className={`px-2 py-0.5 rounded text-xs ${b.cls}`}>{b.text}</span>; })()}
                          </div>
                          <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-800 rounded">
                            <div className="h-2 bg-indigo-500 dark:bg-indigo-400 rounded" style={{ width: `${Math.round(meter(creat?.value, ranges.creatinine) * 100)}%` }} />
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Range {ranges.creatinine.min}-{ranges.creatinine.max} {ranges.creatinine.unit}</div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* AI Generated Summary Section */}
                {aiSummary && (
                  <div className="mt-6 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">AI Health Analysis</h3>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full">
                          Powered by Gemini AI
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setAiSummary(null)}
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 p-1"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                    <div className="whitespace-pre-wrap w-full font-sans antialiased text-slate-900 dark:text-slate-100 text-[17px] md:text-[18px] leading-8 tracking-[0.008em] selection:bg-blue-100 selection:text-blue-900">
                      {aiSummary}
                    </div>
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                      <div className="flex items-start gap-2">
                        <div className="text-yellow-600 dark:text-yellow-400 mt-0.5">⚠️</div>
                        <div className="text-xs text-yellow-800 dark:text-yellow-200">
                          <strong>Medical Disclaimer:</strong> This AI analysis is for informational purposes only and should not replace professional medical advice. Please consult with your healthcare provider for proper diagnosis and treatment.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-white dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="text-slate-900 dark:text-slate-100">Extracted Fields</CardTitle>
          </CardHeader>
          <CardContent className="bg-white dark:bg-slate-900/40">
            {!extracted ? (
              <div className="text-base text-slate-700 dark:text-slate-300">No structured fields extracted yet.</div>
            ) : (
              <div className="space-y-4 text-base text-slate-900 dark:text-slate-100">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Meta</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div><span className="text-slate-600 dark:text-slate-400">Patient:</span> <span className="font-medium">{extracted?.meta?.patientName || '—'}</span></div>
                    <div><span className="text-slate-600 dark:text-slate-400">Patient ID:</span> <span className="font-medium">{extracted?.meta?.patientId || '—'}</span></div>
                    <div><span className="text-slate-600 dark:text-slate-400">Date:</span> <span className="font-medium">{extracted?.meta?.date || '—'}</span></div>
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Labs</div>
                  {!extracted?.labs?.length ? (
                    <div className="text-slate-700 dark:text-slate-300">No labs found</div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded">
                      <table className="min-w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <tr>
                            <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">Name</th>
                            <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">Value</th>
                            <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">Unit</th>
                            <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {extracted.labs.map((lab, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/60'}>
                              <td className="px-3 py-2 capitalize text-slate-900 dark:text-slate-100">{lab.name}</td>
                              <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{lab.value ?? '—'}</td>
                              <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{lab.unit || '—'}</td>
                              <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{typeof lab.confidence === 'number' ? `${Math.round(lab.confidence * 100)}%` : '—'}</td>
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
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Diagnoses</div>
                      <ul className="list-disc pl-5">
                        {(extracted.diagnoses || []).map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Medications</div>
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
        {/* OCR panel removed by request */}
      </div>
  {/* OCR fullscreen modal removed */}
    </div>
  );
}

// OCR modal component removed



