"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  User as UserIcon,
  Home,
  Compass,
  Bell,
  Settings,
  FileCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

/**
 * Same routes real members use — handy for admins to reproduce UX issues.
 * (You stay signed in as yourself; use another browser/incognito to test a pending account.)
 */
export default function AdminMemberPagesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="py-20 text-center text-app-fg-muted">
        Admin access required.
      </div>
    );
  }

  const profileHref = user?.username ? `/u/${user.username}` : "/settings";

  const links: { href: string; label: string; note: string; icon: typeof Home }[] = [
    {
      href: "/apply",
      label: "Apply to join",
      note: "Shown to accounts with status Pending. Gate + proof submission.",
      icon: FileCheck,
    },
    {
      href: "/feed",
      label: "Home feed",
      note: "Usually only after application approved — pending users may be redirected.",
      icon: Home,
    },
    {
      href: "/communities",
      label: "Communities",
      icon: Compass,
      note: "Browse and join communities (when approved).",
    },
    {
      href: "/notifications",
      label: "Notifications",
      icon: Bell,
      note: "Likes, comments, follows, application updates.",
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      note: "Profile, account.",
    },
    {
      href: profileHref,
      label: "My public profile",
      icon: UserIcon,
      note: `Opens /@${user?.username ?? "username"}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Admin panel
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="font-[var(--font-geist)] text-2xl font-semibold text-app-fg">
          Member pages (normal user routes)
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-app-fg-muted">
          These are the same URLs members use. Open each to verify layout, copy, and errors.
          To test a <strong className="text-app-fg-secondary">pending</strong> account, sign out and
          register a test user (or use an incognito window).
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {links.map(({ href, label, note, icon: Icon }) => (
          <li key={href} className="app-panel p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-app-surface-2 p-2 text-neon">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={href}
                  className="inline-flex items-center gap-1 font-medium text-app-fg hover:text-neon"
                >
                  {label}
                  <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                </Link>
                <p className="mt-1 text-xs text-app-fg-muted">{note}</p>
                <p className="mt-2 font-mono text-[11px] text-app-fg-muted">{href}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
