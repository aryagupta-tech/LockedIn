import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["500", "600", "700"]
});

export const metadata: Metadata = {
  metadataBase: new URL("https://joinlockedin.social"),
  title: "LockedIn | Only the locked-in get in.",
  description:
    "LockedIn is the exclusive social network for elite coders, designers, creators, and builders.",
  keywords: [
    "LockedIn",
    "exclusive social network",
    "elite builders",
    "developer community",
    "design community"
  ],
  openGraph: {
    title: "LockedIn",
    description:
      "The private social network where only the highest-signal builders are allowed in.",
    url: "https://joinlockedin.social",
    siteName: "LockedIn",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "LockedIn",
    description: "Only the locked-in get in."
  },
  icons: {
    icon: "/favicon.ico"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { margin: 0; padding: 0; background: #0b0907; color: #f6f1e8; }
              body { font-family: Manrope, "Segoe UI", sans-serif; }
              a { color: inherit; text-decoration: none; }
              .section-shell { max-width: 80rem; margin-inline: auto; padding-inline: 1rem; }
              .glass { background: rgba(20, 15, 12, 0.65); border: 1px solid rgba(214, 179, 106, 0.22); backdrop-filter: blur(12px); }
              .neon-text { color: #e3c98e; text-shadow: 0 0 22px rgba(214, 179, 106, 0.25); }
            `
          }}
        />
      </head>
      <body className={`${manrope.variable} ${cormorant.variable} bg-bg font-[var(--font-inter)]`}>
        {children}
      </body>
    </html>
  );
}
