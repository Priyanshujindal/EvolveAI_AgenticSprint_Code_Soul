const BASE = 'http://localhost:8080';
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

export async function analyzeCheckinApi(payload) {
  const res = await fetch(`${BASE}/functions/analyzeCheckin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...DEV_HEADERS },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function findNearbyAmbulance(lat, lng) {
  const url = new URL(`${BASE}/functions/findNearbyAmbulance`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lng));
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


