"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import { api, type User, type AuthResponse } from "./api";
import type { Session } from "@supabase/supabase-js";

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

  // Hydrate from localStorage before paint so the app shell renders immediately on navigation.
  useLayoutEffect(() => {
    const stored = localStorage.getItem("lockedin_user");
    if (!stored) return;
    try {
      setUser(JSON.parse(stored) as User);
      setLoading(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    // Only restore session if the user explicitly logged in/registered
    // (indicated by the lockedin_logged_in cookie), unless they are currently in the middle of an OAuth callback
    const hasLoginCookie = document.cookie.split(";").some((c) => c.trim().startsWith("lockedin_logged_in="));
    const isAuthCallback = typeof window !== "undefined" && window.location.pathname.startsWith("/auth/");

    if (!hasLoginCookie && !isAuthCallback) {
      // No login cookie — clear any stale Supabase session
      supabase.auth.signOut().catch(() => {});
      localStorage.removeItem("lockedin_user");
      setUser(null);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        restoreProfile(session);
      } else {
        // Cookie exists but session expired — clear cookie
        document.cookie = "lockedin_logged_in=; path=/; max-age=0";
        localStorage.removeItem("lockedin_user");
        setUser(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        localStorage.removeItem("lockedin_user");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function restoreProfile(session: Session) {
    api.setAccessToken(session.access_token);
    const stored = localStorage.getItem("lockedin_user");
    let hadCached = false;
    if (stored) {
      try {
        setUser(JSON.parse(stored) as User);
        hadCached = true;
        setLoading(false);
      } catch {
        /* ignore */
      }
    }

    try {
      const profile = await api.get<User>("/profiles/me");
      localStorage.setItem("lockedin_user", JSON.stringify(profile));
      setUser(profile);
    } catch {
      /* ignore */
    }

    if (!hadCached) {
      setLoading(false);
    }
  }

  const setAuth = useCallback((data: AuthResponse) => {
    api.setAccessToken(data.accessToken);
    localStorage.setItem("lockedin_user", JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>("/auth/login", { email, password }, { skipAuth: true });
    supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });
    setAuth(data);
  }, [setAuth]);

  const register = useCallback(async (body: { email: string; username: string; password: string; displayName: string }) => {
    const data = await api.post<AuthResponse>("/auth/register", body, { skipAuth: true });
    supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });
    setAuth(data);
  }, [setAuth]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
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
