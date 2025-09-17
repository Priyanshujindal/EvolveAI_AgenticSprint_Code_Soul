import { useEffect, useState, useCallback } from 'react';
import { auth, db, observeAuthState } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  getRedirectResult,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function useUserAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  

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

  useEffect(() => {
    const unsub = observeAuthState(async (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoading(false);
    });
    // Remove Google redirect handling
    return () => unsub && unsub();
  }, [upsertUserProfile]);

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

  

  

  

  

  

  

  return { user, loading, login, signup, logout, getIdToken };
}


