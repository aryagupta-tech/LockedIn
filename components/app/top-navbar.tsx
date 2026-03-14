"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Bell, Settings, User, Shield, FileCheck, Menu, X, Search } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export function TopNavbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications(user?.id);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === "ADMIN";
  const isPending = user?.status === "PENDING";

  const handleLogout = () => {
    document.cookie = "lockedin_logged_in=; path=/; max-age=0";
    logout();
    window.location.href = "/";
  };

  const navItems = [
    { href: "/feed", icon: Home, label: "Home" },
    { href: "/communities", icon: Compass, label: "Explore" },
    { href: "/notifications", icon: Bell, label: "Notifications", badge: unreadCount },
    { href: "/settings", icon: Settings, label: "Settings" },
    ...(user ? [{ href: `/u/${user.username}`, icon: User, label: "Profile" }] : []),
    ...(isPending ? [{ href: "/apply", icon: FileCheck, label: "Apply" }] : []),
    ...(isAdmin ? [{ href: "/admin", icon: Shield, label: "Admin" }] : []),
  ];

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#222] bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-5">
          {/* Logo */}
          <Link href="/feed" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-[var(--font-geist)] text-[19px] font-bold tracking-tight text-neon-light">
              LockedIn
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const badge = "badge" in item ? (item as { badge?: number }).badge : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-1 px-4 py-2 text-[14px] font-medium transition-colors",
                    active
                      ? "text-white"
                      : "text-[#888] hover:text-white",
                  )}
                >
                  {item.label}
                  {!!badge && badge > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-neon px-1 text-[10px] font-bold text-black">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-[13px] h-[2px] rounded-full bg-neon" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
              <input
                type="text"
                placeholder="Search LockedIn..."
                className="h-9 w-[200px] rounded-full border border-[#222] bg-[#111] pl-9 pr-4 text-[13px] text-white placeholder-[#555] outline-none transition-all focus:w-[260px] focus:border-[#333] focus:bg-[#1a1a1a]"
              />
            </div>

            {/* User avatar / logout */}
            {user && (
              <button
                onClick={handleLogout}
                className="group flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-neon/40 to-amber-600/40 text-xs font-bold text-white ring-1 ring-[#333] transition-all hover:ring-neon/50"
                title="Sign out"
              >
                {user.displayName.charAt(0).toUpperCase()}
              </button>
            )}

            {/* Mobile menu */}
            <button
              className="rounded-lg p-1.5 text-[#888] md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-x-0 top-[60px] z-50 border-b border-[#222] bg-[#0a0a0a] p-4">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const badge = "badge" in item ? (item as { badge?: number }).badge : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium",
                    active ? "bg-[#1a1a1a] text-white" : "text-[#888] hover:text-white",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                  {!!badge && badge > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-neon px-1 text-[10px] font-bold text-black">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-[#888] hover:text-red-400"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </>
  );
}

function BrandMark() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center">
      <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-neon/80 via-[#c49450] to-amber-700 opacity-90" />
      <span className="absolute inset-[1.5px] rounded-[6px] bg-black" />
      <span className="absolute h-2 w-2 rounded-full bg-gradient-to-br from-neon-light to-neon" />
    </span>
  );
}
