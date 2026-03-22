"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Bell, Shield, FileCheck, Menu, X, Search, Settings, LogOut, User, Bookmark } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { LockedInMark } from "@/components/brand/locked-in-mark";
import { UserAvatar } from "@/components/ui/user-avatar";

export function TopNavbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "ADMIN";
  const isPending = user?.status === "PENDING";
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
      <header className="app-top-nav fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-5">
          {/* Logo */}
          <Link href="/feed" prefetch className="group flex items-center gap-2.5">
            <LockedInMark size={28} className="transition-transform duration-200 group-hover:scale-105" />
            <span className="text-brand-logo font-[var(--font-geist)] text-[19px] font-bold tracking-tight">
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
                  prefetch
                  className={cn(
                    "relative flex items-center gap-1 px-4 py-2 text-[14px] font-medium transition-colors",
                    active ? "text-app-fg" : "text-app-fg-muted hover:text-app-fg",
                  )}
                >
                  {item.label}
                  {!!badge && badge > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--app-accent)] px-1 text-[10px] font-bold text-[#1a0c06] shadow-[0_2px_8px_var(--app-accent-soft)]">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                  {active && (
                    <span className="absolute inset-x-2 bottom-1 h-0.5 rounded-full bg-[var(--app-accent)] shadow-[0_0_12px_var(--app-accent-soft)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search */}
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-fg-muted" />
              <input
                type="text"
                placeholder="Search LockedIn..."
                className="neo-field h-9 w-[200px] rounded-full bg-app-input pl-9 pr-4 text-[13px] text-app-fg placeholder:text-app-fg-muted outline-none transition-all focus:w-[260px]"
              />
            </div>

            {/* User avatar with dropdown */}
            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={cn(
                    "group h-9 w-9 overflow-hidden rounded-full p-0 ring-2 transition-all",
                    dropdownOpen
                      ? "ring-neon/60 shadow-[0_0_12px_rgba(214,179,106,0.25)]"
                      : "ring-app-border-strong hover:ring-neon/40",
                  )}
                  title="Profile menu"
                >
                  <UserAvatar
                    avatarUrl={user.avatarUrl}
                    displayName={user.displayName}
                    username={user.username}
                    size="sm"
                    className="h-full w-full"
                  />
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div className="app-panel absolute right-0 top-[calc(100%+8px)] z-50 w-[220px] overflow-hidden rounded-app-md">
                    {/* User info header */}
                    <div className="border-b border-app-border px-4 py-3">
                      <p className="truncate text-[14px] font-semibold text-app-fg">{user.displayName}</p>
                      <p className="truncate text-[12px] text-app-fg-muted">@{user.username}</p>
                    </div>

                    {/* Menu items */}
                    <div className="py-1.5">
                      <Link
                        href={`/u/${user.username}`}
                        prefetch
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-app-fg-secondary transition-colors hover:bg-app-surface-2 hover:text-app-fg"
                      >
                        <User className="h-4 w-4 text-app-fg-muted" />
                        My Profile
                      </Link>
                      {!isPending && (
                        <Link
                          href="/bookmarks"
                          prefetch
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-app-fg-secondary transition-colors hover:bg-app-surface-2 hover:text-app-fg"
                        >
                          <Bookmark className="h-4 w-4 text-app-fg-muted" />
                          Saved posts
                        </Link>
                      )}
                      <Link
                        href="/settings"
                        prefetch
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-app-fg-secondary transition-colors hover:bg-app-surface-2 hover:text-app-fg"
                      >
                        <Settings className="h-4 w-4 text-app-fg-muted" />
                        Settings
                      </Link>
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-app-border py-1.5">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-[14px] text-app-fg-secondary transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <LogOut className="h-4 w-4 text-app-fg-muted" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile menu */}
            <button
              className="rounded-lg p-1.5 text-app-fg-muted md:hidden"
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
          <div className="fixed inset-0 z-40 bg-app-overlay" onClick={() => setMobileOpen(false)} />
          <div className="app-panel fixed inset-x-0 top-[var(--app-nav-h)] z-50 mx-3 rounded-b-app border-b-0 p-4 shadow-modal">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const badge = "badge" in item ? (item as { badge?: number }).badge : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium",
                    active ? "bg-app-surface-2 text-app-fg" : "text-app-fg-muted hover:text-app-fg",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                  {!!badge && badge > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--app-accent)] px-1 text-[10px] font-bold text-[#1a0c06] shadow-[0_2px_8px_var(--app-accent-soft)]">
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
                  prefetch
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-app-fg-muted hover:text-app-fg"
                >
                  <User className="h-5 w-5" />
                  My Profile
                </Link>
                {!isPending && (
                  <Link
                    href="/bookmarks"
                    prefetch
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-app-fg-muted hover:text-app-fg"
                  >
                    <Bookmark className="h-5 w-5" />
                    Saved posts
                  </Link>
                )}
                <Link
                  href="/settings"
                  prefetch
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-app-fg-muted hover:text-app-fg"
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
              </>
            )}
            <button
              onClick={handleLogout}
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-app-fg-muted hover:text-red-400"
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

