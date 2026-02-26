"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users2,
  User,
  Settings,
  Shield,
  LogOut,
  FileCheck,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/feed", icon: Home, label: "Feed" },
  { href: "/communities", icon: Users2, label: "Communities" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === "ADMIN";
  const isPending = user?.status === "PENDING";

  const handleLogout = () => {
    document.cookie = "lockedin_logged_in=; path=/; max-age=0";
    logout();
    window.location.href = "/";
  };

  const items = [
    ...navItems,
    ...(user ? [{ href: `/u/${user.username}`, icon: User, label: "Profile" }] : []),
    ...(isPending ? [{ href: "/apply", icon: FileCheck, label: "Apply" }] : []),
    ...(isAdmin ? [{ href: "/admin", icon: Shield, label: "Admin" }] : []),
  ];

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed left-4 top-4 z-[60] rounded-xl border border-white/[0.06] bg-surface/90 p-2 text-zinc-400 backdrop-blur-lg lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[0.06] bg-surface/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 px-6">
          <BrandMark />
          <span className="font-[var(--font-geist)] text-lg font-semibold text-white">LockedIn</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-neon/10 text-neon"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          {user && (
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-neon/20 to-blue-500/20 text-sm font-bold text-white">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{user.displayName}</p>
                <p className="truncate text-xs text-zinc-500">@{user.username}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function BrandMark() {
  return (
    <span className="relative inline-flex h-6 w-6 items-center justify-center">
      <span className="absolute inset-0 rounded-[9px] bg-gradient-to-br from-[#7b9dff] via-[#6e78ff] to-[#f3c680] opacity-90" />
      <span className="absolute inset-[1.5px] rounded-[8px] bg-[#080d1e]" />
      <span className="absolute h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#a5d4ff] to-[#f0c670]" />
      <span className="absolute h-3.5 w-3.5 rounded-full border border-white/20" />
    </span>
  );
}
