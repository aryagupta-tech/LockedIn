import type { Metadata } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["500", "600", "700"],
});

/** Persisted theme key (must match ThemeProvider). Migrate legacy `theme` from older next-themes default. */
const THEME_STORAGE_KEY = "lockedin-theme";

const themeBlockingScript = `
(function(){
  try {
    var k = "${THEME_STORAGE_KEY}";
    var t = localStorage.getItem(k) || localStorage.getItem("theme");
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${cormorant.variable} min-h-screen bg-app-bg font-[var(--font-inter)] text-app-fg antialiased`}
      >
        <Script
          id="lockedin-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBlockingScript }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey={THEME_STORAGE_KEY}
        >
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
