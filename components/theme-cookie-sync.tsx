"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

/** Must match `THEME_STORAGE_KEY` / cookie name in `app/layout.tsx` */
export const THEME_PREF_COOKIE = "lockedin-theme";

/**
 * Mirrors next-themes preference (light | dark | system) into a cookie so the
 * server can render `<html class="dark">` on full page loads (OAuth, hard refresh, Vercel).
 */
export function ThemeCookieSync() {
  const { theme } = useTheme();
  const prev = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (theme === undefined) return;
    if (prev.current === theme) return;
    prev.current = theme;

    const maxAge = 60 * 60 * 24 * 365;
    const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
    try {
      document.cookie = `${THEME_PREF_COOKIE}=${encodeURIComponent(theme)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
    } catch {
      /* ignore */
    }
  }, [theme]);

  return null;
}
