import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('hembit_token') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('hembit_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('hembit_token', token);
    } else {
      localStorage.removeItem('hembit_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('hembit_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('hembit_user');
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const data = await api.get('/auth/me', token);
      setUser(data.user);
    } catch {
      setToken('');
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signin = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/signin', { email, password });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const signout = useCallback(() => {
    setToken('');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      isAdmin: user?.role === 'admin',
      signin,
      signout,
      setSession: (nextToken, nextUser) => {
        setToken(nextToken);
        setUser(nextUser);
      },
      refreshUser,
    }),
    [loading, refreshUser, signin, signout, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
