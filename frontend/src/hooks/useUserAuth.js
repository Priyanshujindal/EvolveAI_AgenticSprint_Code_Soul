import { useEffect, useState, useCallback } from 'react';
import { auth, observeAuthState } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

export default function useUserAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = observeAuthState(async (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoading(false);
    });
    return () => unsub && unsub();
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setUser(cred.user);
    return cred.user;
  }, []);

  const signup = useCallback(async ({ email, password }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    setUser(cred.user);
    return cred.user;
  }, []);

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


