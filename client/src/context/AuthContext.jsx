import { useState, useEffect, useCallback, useMemo } from 'react';
import client, { setAccessToken, setUnauthorizedHandler } from '../api/client';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout');
    } catch {
      // Signing out locally is enough if the request fails.
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  // Merge fresh server data into the signed-in user (e.g. after saving the profile).
  const updateUser = useCallback((patch) => setUser((current) => (current ? { ...current, ...patch } : current)), []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));

    // Restore the session from the refresh cookie. client.js retries transient failures
    // (such as a sleeping server waking up), so only a real 401 logs the person out.
    (async () => {
      try {
        const { data } = await client.post('/auth/refresh');
        setAccessToken(data.accessToken);
        const me = await client.get('/users/me');
        setUser(me.data.user);
      } catch {
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await client.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await client.post('/auth/register', payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({ user, setUser, updateUser, loading, login, register, logout }),
    [user, updateUser, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
