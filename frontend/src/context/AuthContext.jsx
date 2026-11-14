import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../lib/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  const logout = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me().then((r) => setUser(r.user)).catch(logout).finally(() => setLoading(false));
  }, [logout]);

  useEffect(() => {
    window.addEventListener('queuepilot:unauthorized', logout);
    return () => window.removeEventListener('queuepilot:unauthorized', logout);
  }, [logout]);

  const authenticate = async (fn, body) => {
    const r = await fn(body);
    tokenStore.set(r.token);
    setUser(r.user);
  };

  const value = useMemo(() => ({
    user, loading, logout,
    login: (b) => authenticate(api.login, b),
    register: (b) => authenticate(api.register, b),
  }), [user, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
