import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, tokenStore, UNAUTHORIZED_EVENT } from './api';
import type { AuthUser, Role } from './types';

interface LoginResponse { access_token: string; user: AuthUser & { role: Role } }

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const result = await api.get<{ user: AuthUser }>('/auth/me');
    setUser(result.user);
  }, []);

  // Restore the session on first load.
  useEffect(() => {
    if (!tokenStore.get()) return;
    refresh()
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, [refresh]);

  // Any 401 from a protected call ends the session.
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.publicPost<LoginResponse>('/auth/login', { email, password });
    tokenStore.set(result.access_token);
    const me: AuthUser = {
      id: result.user.id,
      first_name: result.user.first_name,
      last_name: result.user.last_name,
      email: result.user.email,
      phone_number: result.user.phone_number,
      role: result.user.role,
    };
    setUser(me);
    return me;
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout, refresh }), [user, loading, login, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}

export const homeFor = (role: Role) =>
  role === 'ADMIN' ? '/admin/companies' : role === 'EMPLOYER' ? '/my-jobs' : '/jobs';
