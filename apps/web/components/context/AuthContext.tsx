// src/components/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type User = { id: string; email: string } | null;

interface AuthContextValue {
  user: User;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]   = useState<User>(null);
  const [loading, setLoading] = useState(true);

  /** helper so we can call it on mount *and* after login */
  const fetchMe = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/auth/me', {
        credentials: 'include',
      });
      if (res.ok) {
        const { user } = await res.json();
        setUser(user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /* run once on first mount */
  useEffect(() => { fetchMe(); }, []);

  /** ---------- exposed helpers ---------- */
  const login = async (email: string, password: string) => {
    const res = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Invalid credentials');
    await fetchMe();                 // refresh context immediately
  };

  const logout = async () => {
    await fetch('http://localhost:3001/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
