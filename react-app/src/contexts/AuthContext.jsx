import { createContext, useCallback, useEffect, useState } from 'react';
import { apiFetch, clearSession, refreshAccessToken, setStoredToken } from '../lib/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      if (!localStorage.getItem('token')) {
        const refreshed = await refreshAccessToken();
        if (active && refreshed) setToken(refreshed);
      }
      if (active) setReady(true);
    };

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    let active = true;

    if (!token) {
      setUser(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    apiFetch('/api/profile')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (res.ok) {
          setUser(data);
          const refreshedToken = localStorage.getItem('token');
          if (refreshedToken && refreshedToken !== token) setToken(refreshedToken);
        } else {
          clearSession();
          setToken('');
          setUser(null);
        }
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, ready]);

  useEffect(() => {
    const handleExpired = () => {
      setToken('');
      setUser(null);
      setLoading(false);
    };
    const handleRefreshed = (event) => {
      const nextToken = event.detail?.token;
      if (nextToken) setToken(nextToken);
    };

    window.addEventListener('seatudy:session-expired', handleExpired);
    window.addEventListener('seatudy:token-refreshed', handleRefreshed);
    return () => {
      window.removeEventListener('seatudy:session-expired', handleExpired);
      window.removeEventListener('seatudy:token-refreshed', handleRefreshed);
    };
  }, []);

  const login = useCallback((newToken) => {
    setStoredToken(newToken);
    setToken(newToken);
    setLoading(true);
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    clearSession();
    setStoredToken('');
    localStorage.removeItem('role');
    setToken('');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
