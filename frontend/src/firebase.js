import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getAnalytics, isSupported as analyticsIsSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Expect environment variables to be provided via Vite
// VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
// VITE_FIREBASE_APP_ID, VITE_FIREBASE_MESSAGING_SENDER_ID (optional), VITE_FIREBASE_STORAGE_BUCKET (optional)

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

function isConfigValid(cfg) {
  return !!(cfg && cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
}

let app;
let auth;
let analytics;
let db;
let storage;

try {
  if (!isConfigValid(firebaseConfig)) {
    throw new Error('Missing Firebase env configuration');
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  // Initialize Analytics only when measurementId is provided and environment supports it
  if (firebaseConfig.measurementId) {
    try {
      // Avoid top-level await: check support asynchronously without blocking
      analyticsIsSupported()
        .then((supported) => {
          if (supported) {
            analytics = getAnalytics(app);
          }
        })
        .catch(() => {});
    } catch (_) {}
  }
} catch (e) {
  // Soft-fail: log and provide no-op auth so the app can still render
  // Common causes: missing VITE_FIREBASE_* envs, invalid API key, referrer restrictions
  console.error('[Firebase] Initialization failed:', e?.message || e);
  app = null;
  auth = {
    currentUser: null,
  };
  db = null;
  storage = null;
}

export { auth, db, storage };

export function observeAuthState(callback) {
  if (app && auth) {
    return onAuthStateChanged(auth, callback);
  }
  // No-op observer if Firebase is not initialized
  callback(null);
  return () => {};
}


