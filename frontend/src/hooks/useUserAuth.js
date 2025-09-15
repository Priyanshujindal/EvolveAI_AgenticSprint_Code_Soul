import { useState } from 'react';

export default function useUserAuth() {
  const [user, setUser] = useState(null);
  return { user, login: setUser, logout: () => setUser(null) };
}


