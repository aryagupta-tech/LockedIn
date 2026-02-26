import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["500", "600", "700"]
});

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
    "design community"
  ],
  openGraph: {
    title: "LockedIn",
    description:
      "The private social network where only the highest-signal builders are allowed in.",
    url: "http://localhost:3000",
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
      <body className={`${manrope.variable} ${cormorant.variable} bg-bg font-[var(--font-inter)] antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
