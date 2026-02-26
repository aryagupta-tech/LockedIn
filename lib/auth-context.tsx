"use client";

import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react";
import { api, type User, type AuthResponse } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string; displayName: string }) => Promise<void>;
  logout: () => void;
  setAuth: (data: AuthResponse) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("lockedin_user");
    const token = localStorage.getItem("lockedin_access_token");
    if (stored && token) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const setAuth = useCallback((data: AuthResponse) => {
    localStorage.setItem("lockedin_access_token", data.accessToken);
    localStorage.setItem("lockedin_refresh_token", data.refreshToken);
    localStorage.setItem("lockedin_user", JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>("/auth/login", { email, password }, { skipAuth: true });
    setAuth(data);
  }, [setAuth]);

  const register = useCallback(async (body: { email: string; username: string; password: string; displayName: string }) => {
    const data = await api.post<AuthResponse>("/auth/register", body, { skipAuth: true });
    setAuth(data);
  }, [setAuth]);

  const logout = useCallback(() => {
    api.clearTokens();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await api.get<User>("/profiles/me");
      localStorage.setItem("lockedin_user", JSON.stringify(profile));
      setUser(profile);
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setAuth, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
