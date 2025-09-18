import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getAnalytics, isSupported as analyticsIsSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// App Check helps prevent abuse; if enforced on Storage, missing tokens can look like CORS failures
let initializeAppCheckFn = null;
let ReCaptchaV3ProviderCtor = null;
try {
  // Lazy import shape to avoid bundler issues if app-check is unused
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ({ initializeAppCheck: initializeAppCheckFn, ReCaptchaV3Provider: ReCaptchaV3ProviderCtor } = require('firebase/app-check'));
} catch (_) {}

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

// Normalize common misconfigurations for storageBucket to avoid SDK hitting wrong CORS endpoints
function normalizeStorageBucket(bucket) {
  try {
    if (!bucket) return bucket;
    let value = String(bucket).trim();
    // If a full URL was pasted, extract the hostname
    if (/^https?:\/\//i.test(value)) {
      try { value = new URL(value).hostname; } catch (_) {}
    }
    // Replace new domain copy-paste with the expected bucket host
    if (/\.firebasestorage\.app$/i.test(value)) {
      value = value.replace(/\.firebasestorage\.app$/i, '.appspot.com');
    }
    // Remove path parts if any slipped in
    value = value.split('/')[0];
    return value;
  } catch (_) {
    return bucket;
  }
}

function isConfigValid(cfg) {
  return !!(cfg && cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
}

function getMissingConfigKeys(cfg) {
  const missing = [];
  if (!cfg?.apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!cfg?.authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!cfg?.projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!cfg?.appId) missing.push('VITE_FIREBASE_APP_ID');
  return missing;
}

let app;
let auth;
let analytics;
let db;
let storage;

try {
  if (!isConfigValid(firebaseConfig)) {
    const missing = getMissingConfigKeys(firebaseConfig);
    const msg = missing.length
      ? `Missing Firebase env configuration: ${missing.join(', ')}`
      : 'Missing Firebase env configuration';
    throw new Error(msg);
  }
  // Apply normalization safely before init
  const normalizedBucketHost = normalizeStorageBucket(firebaseConfig.storageBucket) || (firebaseConfig.projectId ? `${firebaseConfig.projectId}.appspot.com` : undefined);
  const cfg = { ...firebaseConfig, storageBucket: normalizedBucketHost };
  app = initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);
  // Force the SDK to use the exact bucket via gs:// URL (avoids .firebasestorage.app confusion)
  storage = normalizedBucketHost ? getStorage(app, `gs://${normalizedBucketHost}`) : getStorage(app);

  // Initialize App Check if configured, useful when enforcement is ON for Storage
  try {
    const siteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;
    if (initializeAppCheckFn && ReCaptchaV3ProviderCtor && siteKey) {
      if (import.meta.env.DEV) {
        // Enable debug token on localhost automatically
        // eslint-disable-next-line no-undef
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      initializeAppCheckFn(app, {
        provider: new ReCaptchaV3ProviderCtor(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch (_) {}
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


