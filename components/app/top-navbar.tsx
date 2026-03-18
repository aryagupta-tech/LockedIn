"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Bell, Shield, FileCheck, Menu, X, Search, Settings, LogOut, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "from-violet-500 to-fuchsia-500",
  "from-blue-500 to-cyan-400",
  "from-orange-500 to-rose-500",
  "from-emerald-500 to-teal-400",
  "from-pink-500 to-rose-400",
  "from-amber-500 to-orange-400",
  "from-indigo-500 to-blue-400",
  "from-teal-500 to-emerald-400",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function TopNavbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications(user?.id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "ADMIN";
  const isPending = user?.status === "PENDING";
  const avatarColor = user?.username ? getAvatarColor(user.username) : AVATAR_COLORS[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    document.cookie = "lockedin_logged_in=; path=/; max-age=0";
    logout();
    window.location.href = "/";
  };

  const navItems = [
    { href: "/feed", icon: Home, label: "Home" },
    { href: "/communities", icon: Compass, label: "Explore" },
    { href: "/notifications", icon: Bell, label: "Notifications", badge: unreadCount },
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

            {/* User avatar with dropdown */}
            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={cn(
                    "group flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-xs font-bold text-white ring-2 transition-all",
                    avatarColor,
                    dropdownOpen
                      ? "ring-neon/60 shadow-[0_0_12px_rgba(126,211,33,0.25)]"
                      : "ring-[#333] hover:ring-neon/40",
                  )}
                  title="Profile menu"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    user.displayName.charAt(0).toUpperCase()
                  )}
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[220px] overflow-hidden rounded-xl border border-[#222] bg-[#111] shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                    {/* User info header */}
                    <div className="border-b border-[#222] px-4 py-3">
                      <p className="truncate text-[14px] font-semibold text-white">{user.displayName}</p>
                      <p className="truncate text-[12px] text-[#666]">@{user.username}</p>
                    </div>

                    {/* Menu items */}
                    <div className="py-1.5">
                      <Link
                        href={`/u/${user.username}`}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#ccc] transition-colors hover:bg-[#1a1a1a] hover:text-white"
                      >
                        <User className="h-4 w-4 text-[#888]" />
                        My Profile
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#ccc] transition-colors hover:bg-[#1a1a1a] hover:text-white"
                      >
                        <Settings className="h-4 w-4 text-[#888]" />
                        Settings
                      </Link>
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-[#222] py-1.5">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-[14px] text-[#ccc] transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <LogOut className="h-4 w-4 text-[#888]" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
            {user && (
              <>
                <Link
                  href={`/u/${user.username}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-[#888] hover:text-white"
                >
                  <User className="h-5 w-5" />
                  My Profile
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-[#888] hover:text-white"
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
              </>
            )}
            <button
              onClick={handleLogout}
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-[#888] hover:text-red-400"
            >
              <LogOut className="h-5 w-5" />
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
