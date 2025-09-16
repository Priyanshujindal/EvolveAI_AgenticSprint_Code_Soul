import { useEffect, useState, useCallback } from 'react';
import { auth, db, observeAuthState } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function useUserAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneConfirmation, setPhoneConfirmation] = useState(null);

  useEffect(() => {
    const unsub = observeAuthState(async (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoading(false);
    });
    // Handle pending redirect result (Google sign-in fallback)
    getRedirectResult(auth)
      .then((res) => {
        if (res && res.user) {
          setUser(res.user);
        }
      })
      .catch(() => {})
      .finally(() => {});
    return () => unsub && unsub();
  }, []);

  const upsertUserProfile = useCallback(async (firebaseUser) => {
    try {
      if (!firebaseUser || !db) return;
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);
      const base = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null,
        displayName: firebaseUser.displayName || null,
        photoURL: firebaseUser.photoURL || null,
        phoneNumber: firebaseUser.phoneNumber || null,
        providerIds: (firebaseUser.providerData || []).map(p => p.providerId),
        updatedAt: serverTimestamp(),
      };
      if (snap.exists()) {
        await setDoc(userRef, base, { merge: true });
      } else {
        await setDoc(userRef, { ...base, createdAt: serverTimestamp(), role: 'user' }, { merge: true });
      }
    } catch (_) {}
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setUser(cred.user);
    return cred.user;
  }, []);

  const signup = useCallback(async ({ email, password, name }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      try { await updateProfile(cred.user, { displayName: name }); } catch (_) {}
    }
    await upsertUserProfile(cred.user);
    setUser({ ...cred.user });
    return cred.user;
  }, [upsertUserProfile]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isStandalone = typeof window !== 'undefined' && (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    const isInAppBrowser = /FBAN|FBAV|Instagram|Line|MicroMessenger|Twitter|FB_IAB|VKClient|Snapchat/.test(ua);
    try {
      if (isIOS || isAndroid || isStandalone || isInAppBrowser) {
        await signInWithRedirect(auth, provider);
        return null;
      }
      const cred = await signInWithPopup(auth, provider);
      await upsertUserProfile(cred.user);
      setUser(cred.user);
      return cred.user;
    } catch (e) {
      const code = e && e.code ? String(e.code) : '';
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/popup-blocked' ||
        code === 'auth/cancelled-popup-request'
      ) {
        await signInWithRedirect(auth, provider);
        return null; // flow will continue after redirect
      }
      // Surface full error for UI
      console.error('[Auth] Google sign-in failed:', e);
      throw e;
    }
  }, [upsertUserProfile]);

  const ensureRecaptcha = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!window.recaptchaVerifier) {
      // Ensure a container exists in DOM
      const containerId = 'recaptcha-container';
      let containerEl = document.getElementById(containerId);
      if (!containerEl) {
        containerEl = document.createElement('div');
        containerEl.id = containerId;
        containerEl.style.display = 'inline-block';
        document.body.appendChild(containerEl);
      }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
    }
    return window.recaptchaVerifier;
  }, []);

  function normalizeIndianPhoneNumber(raw) {
    if (!raw) return '';
    const digitsOnly = String(raw).replace(/[^0-9]/g, '');
    // Remove leading country code 91 if present twice etc.
    let normalized = digitsOnly;
    if (normalized.startsWith('91') && normalized.length > 10) {
      normalized = normalized.slice(normalized.length - 10);
    }
    if (normalized.length === 11 && normalized.startsWith('0')) {
      normalized = normalized.slice(1);
    }
    return normalized;
  }

  function validateIndianMobileTenDigits(tenDigits) {
    // Indian mobile numbers: 10 digits, starting with 6-9
    return /^[6-9][0-9]{9}$/.test(tenDigits);
  }

  const sendPhoneCode = useCallback(async (rawPhone) => {
    const verifier = ensureRecaptcha();
    try { if (verifier && typeof verifier.render === 'function') { await verifier.render(); } } catch (_) {}
    const tenDigits = normalizeIndianPhoneNumber(rawPhone);
    if (!validateIndianMobileTenDigits(tenDigits)) {
      const error = new Error('Please enter a valid Indian mobile number (10 digits starting with 6-9).');
      error.code = 'auth/invalid-india-number';
      throw error;
    }
    const e164 = `+91${tenDigits}`;
    const confirmation = await signInWithPhoneNumber(auth, e164, verifier);
    setPhoneConfirmation(confirmation);
    return confirmation;
  }, [ensureRecaptcha]);

  const confirmPhoneCode = useCallback(async (code) => {
    const confirmation = phoneConfirmation;
    if (!confirmation) throw new Error('No phone confirmation in progress');
    const cred = await confirmation.confirm(code);
    await upsertUserProfile(cred.user);
    setUser(cred.user);
    setPhoneConfirmation(null);
    return cred.user;
  }, [phoneConfirmation, upsertUserProfile]);

  return { user, loading, login, signup, logout, getIdToken, loginWithGoogle, sendPhoneCode, confirmPhoneCode, phoneConfirmation };
}


