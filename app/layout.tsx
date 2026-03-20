import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeCookieSync, THEME_PREF_COOKIE } from "@/components/theme-cookie-sync";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["500", "600", "700"],
});

/** Persisted theme preference — localStorage key (next-themes) + cookie for SSR (Vercel full loads) */
const THEME_STORAGE_KEY = THEME_PREF_COOKIE;

const themeHeadScript = `
(function(){
  try {
    var k = "${THEME_STORAGE_KEY}";
    function getCookie(name) {
      var p = ("; " + document.cookie).split("; " + name + "=");
      if (p.length !== 2) return null;
      return decodeURIComponent(p.pop().split(";").shift() || "");
    }
    var t = localStorage.getItem(k) || localStorage.getItem("theme") || getCookie(k);
    if (t && !localStorage.getItem(k)) {
      try { localStorage.setItem(k, t); } catch (e) {}
    }
    if (!t) t = "system";
    var d = document.documentElement;
    var resolved = t === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : t;
    if (resolved === "dark") {
      d.classList.add("dark");
      d.style.colorScheme = "dark";
    } else {
      d.classList.remove("dark");
      d.style.colorScheme = "light";
    }
    try {
      var sec = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = k + "=" + encodeURIComponent(t) + "; Path=/; Max-Age=31536000; SameSite=Lax" + sec;
    } catch (e) {}
  } catch (e) {}
})();`;

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "LockedIn | Only the locked-in get in.",
  description:
    "LockedIn is the exclusive social network for elite coders, designers, creators, and builders.",
  keywords: [
    "LockedIn",
    "exclusive social network",
    "elite builders",
    "developer community",
    "design community",
  ],
  openGraph: {
    title: "LockedIn",
    description:
      "The private social network where only the highest-signal builders are allowed in.",
    url: "http://localhost:3000",
    siteName: "LockedIn",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LockedIn",
    description: "Only the locked-in get in.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const pref = jar.get(THEME_PREF_COOKIE)?.value;
  const htmlDark = pref === "dark";
  const htmlLight = pref === "light";

  return (
    <html
      lang="en"
      className={htmlDark ? "dark" : undefined}
      style={htmlDark ? { colorScheme: "dark" } : htmlLight ? { colorScheme: "light" } : undefined}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeHeadScript }} />
      </head>
      <body
        className={`${manrope.variable} ${cormorant.variable} min-h-screen bg-app-bg font-[var(--font-inter)] text-app-fg antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey={THEME_STORAGE_KEY}
        >
          <ThemeCookieSync />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
