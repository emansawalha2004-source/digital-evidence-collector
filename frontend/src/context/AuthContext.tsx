import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type LoginPayload, type RegisterPayload } from '../api/authApi';
import { clearStoredToken, getStoredToken, setStoredToken } from '../api/client';
import type { User } from '../types/api';

interface LoginResult { mfaRequired: boolean; mfaToken?: string; challengeType?: 'otp' | 'totp'; devOtp?: string; }
interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login(payload: LoginPayload): Promise<LoginResult>;
  verifyLoginMfa(payload: { mfaToken: string; code: string }): Promise<void>;
  register(payload: RegisterPayload): Promise<LoginResult>;
  logout(): Promise<void>;
  refreshUser(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const stored = getStoredToken();
    if (!stored) { setUser(null); setToken(null); setLoading(false); return; }
    try { const current = await authApi.me(); setUser(current); setToken(stored); }
    catch { clearStoredToken(); setUser(null); setToken(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refreshUser(); }, [refreshUser]);
  useEffect(() => {
    const handler = () => { setUser(null); setToken(null); };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<LoginResult> => {
    const result = await authApi.login(payload);
    if ('mfaRequired' in result) return { mfaRequired: true, mfaToken: result.mfaToken, challengeType: result.challengeType, devOtp: result.devOtp };
    setStoredToken(result.token); setToken(result.token); setUser(result.user);
    return { mfaRequired: false };
  }, []);

  const verifyLoginMfa = useCallback(async (payload: { mfaToken: string; code: string }) => {
    const result = await authApi.verifyLoginMfa(payload);
    setStoredToken(result.token); setToken(result.token); setUser(result.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<LoginResult> => {
    const result = await authApi.register(payload);
    if ('mfaRequired' in result) return { mfaRequired: true, mfaToken: result.mfaToken, challengeType: result.challengeType, devOtp: result.devOtp };
    setStoredToken(result.token); setToken(result.token); setUser(result.user);
    return { mfaRequired: false };
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* local logout still happens */ }
    clearStoredToken(); sessionStorage.removeItem('mfaToken'); setUser(null); setToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, token, loading, isAuthenticated: Boolean(user && token), login, verifyLoginMfa, register, logout, refreshUser,
  }), [user, token, loading, login, verifyLoginMfa, register, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
