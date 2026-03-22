"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import { api, type User, type AuthResponse } from "./api";
import type { Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  loading: boolean;
  logout: () => void;
  setAuth: (data: AuthResponse) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function setLoggedInCookie() {
  document.cookie = "lockedin_logged_in=1; path=/; max-age=604800; SameSite=Lax";
}

function clearLoggedInCookie() {
  document.cookie = "lockedin_logged_in=; path=/; max-age=0; SameSite=Lax";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const restoreProfile = useCallback(async (session: Session) => {
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
      /* keep cached user if fetch fails */
    }

    if (!hadCached) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function applySession(session: Session | null) {
      if (cancelled) return;
      if (session) {
        setLoggedInCookie();
        await restoreProfile(session);
      } else {
        clearLoggedInCookie();
        api.clearTokens();
        localStorage.removeItem("lockedin_user");
        setUser(null);
        setLoading(false);
      }
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void applySession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;

      if (!session) {
        void applySession(null);
        return;
      }

      setLoggedInCookie();
      api.setAccessToken(session.access_token);
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        void restoreProfile(session);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [restoreProfile]);

  const setAuth = useCallback((data: AuthResponse) => {
    api.setAccessToken(data.accessToken);
    setLoggedInCookie();
    localStorage.setItem("lockedin_user", JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    clearLoggedInCookie();
    await supabase.auth.signOut();
    api.clearTokens();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await api.get<User>("/profiles/me");
      localStorage.setItem("lockedin_user", JSON.stringify(profile));
      setUser(profile);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, setAuth, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
