import React, { createContext, useContext } from 'react';
import useUserAuth from '../hooks/useUserAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useUserAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}


