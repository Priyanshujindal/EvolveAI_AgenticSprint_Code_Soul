export const BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE)
  ? import.meta.env.VITE_API_BASE.replace(/\/$/, '')
  : 'http://localhost:8080';
const DEV_HEADERS = { 'x-user-id': 'demo' }; // used when firebase-admin is not configured

export async function analyze(body) {
  const res = await fetch(`${BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...DEV_HEADERS },
    body: JSON.stringify(body)
  });
  return res.json();
}

export async function analyzePython(body, url = 'http://localhost:8090') {
  const res = await fetch(`${url.replace(/\/$/, '')}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

export async function processReport(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/functions/processReport`, {
    method: 'POST',
    headers: { ...DEV_HEADERS },
    body: form
  });
  return res.json();
}

// Progress-capable upload with cancel support using XMLHttpRequest
// Usage:
// const controller = new AbortController();
// processReportWithProgress(file, { onProgress: (p) => {}, signal: controller.signal })
//   .then(...)
//   .catch(...);
export function processReportWithProgress(file, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append('file', file);

      xhr.open('POST', `${BASE}/functions/processReport`, true);
      xhr.setRequestHeader('x-user-id', DEV_HEADERS['x-user-id']);

      if (xhr.upload && typeof onProgress === 'function') {
        xhr.upload.onprogress = (evt) => {
          if (!evt.lengthComputable) return;
          const percent = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
          onProgress(percent);
        };
      }

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          // DONE
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText || '{}');
              resolve(json);
            } catch (e) {
              resolve({ ok: true });
            }
          } else {
            let message = 'Upload failed';
            try {
              const err = JSON.parse(xhr.responseText || '{}');
              message = err?.message || message;
            } catch (_) {}
            const error = new Error(message);
            error.status = xhr.status;
            reject(error);
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.onabort = () => reject(new Error('Upload canceled'));

      if (signal) {
        if (signal.aborted) {
          xhr.abort();
        } else {
          const onAbort = () => xhr.abort();
          signal.addEventListener('abort', onAbort, { once: true });
        }
      }

      xhr.send(form);
    } catch (err) {
      reject(err);
    }
  });
}

export async function analyzeCheckinApi(payload) {
  const res = await fetch(`${BASE}/functions/analyzeCheckin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...DEV_HEADERS },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function findNearbyAmbulance(lat, lng, radiusMeters) {
  const url = new URL(`${BASE}/functions/findNearbyAmbulance`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lng));
  if (Number.isFinite(radiusMeters)) {
    url.searchParams.set('radiusMeters', String(radiusMeters));
  }
  const res = await fetch(url.toString());
  return res.json();
}

export async function submitFeedback(feedback, userId = 'demo') {
  const res = await fetch(`${BASE}/functions/submitFeedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...DEV_HEADERS },
    body: JSON.stringify({ userId, feedback })
  });
  return res.json();
}

export async function chatWithGeminiApi(payload, { signal } = {}) {
  const res = await fetch(`${BASE}/functions/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': 'demo' },
    body: JSON.stringify(payload),
    signal
  });
  return res.json();
}


