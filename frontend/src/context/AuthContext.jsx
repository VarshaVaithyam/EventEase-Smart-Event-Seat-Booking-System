import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { safeStorage } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = safeStorage.getItem('eventease_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => safeStorage.getItem('eventease_token'));
  const [loading, setLoading] = useState(() => Boolean(safeStorage.getItem('eventease_token')));

  // Skip redundant /auth/me check when login() or register() just verified credentials
  const skipNextVerifyRef = useRef(false);

  useEffect(() => {
    let active = true;
    async function verifySession() {
      if (!token) {
        if (active) setLoading(false);
        return;
      }
      if (skipNextVerifyRef.current) {
        skipNextVerifyRef.current = false;
        if (active) setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        if (active) {
          setUser(data);
          safeStorage.setItem('eventease_user', JSON.stringify(data));
        }
      } catch {
        if (active) {
          safeStorage.removeItem('eventease_token');
          safeStorage.removeItem('eventease_user');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    verifySession();
    return () => {
      active = false;
    };
  }, [token]);

  // If any protected API returns 401 (e.g., expired token or proxy reset), sync React auth state immediately
  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('eventease:unauthorized', onUnauthorized);
    return () => window.removeEventListener('eventease:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const { data } = await api.post('/auth/login', {
      email: cleanEmail,
      password
    });
    safeStorage.setItem('eventease_token', data.token);
    safeStorage.setItem('eventease_user', JSON.stringify(data.user));
    skipNextVerifyRef.current = true;
    setToken(data.token);
    setUser(data.user);
    setLoading(false);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const normalized = {
      ...payload,
      name: String(payload.name || '').trim(),
      email: String(payload.email || '').trim().toLowerCase()
    };
    const { data } = await api.post('/auth/register', normalized);
    safeStorage.setItem('eventease_token', data.token);
    safeStorage.setItem('eventease_user', JSON.stringify(data.user));
    skipNextVerifyRef.current = true;
    setToken(data.token);
    setUser(data.user);
    setLoading(false);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    safeStorage.removeItem('eventease_token');
    safeStorage.removeItem('eventease_user');
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        isOrganizer: user?.role === 'ORGANIZER',
        isAttendee: user?.role === 'ATTENDEE',
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
