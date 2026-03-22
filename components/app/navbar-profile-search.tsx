"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { UserAvatar } from "@/components/ui/user-avatar";

type SearchHit = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export function NavbarProfileSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SearchHit[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const t = window.setTimeout(() => {
      api
        .get<{ items: SearchHit[] }>(`/profiles/search?q=${encodeURIComponent(q)}`)
        .then((r) => setItems(Array.isArray(r.items) ? r.items : []))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 280);

    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const onPick = useCallback(() => {
    setOpen(false);
    setQuery("");
    setItems([]);
  }, []);

  const showPanel = open && query.trim().length >= 2;

  return (
    <div className="relative hidden lg:block" ref={wrapRef}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-fg-muted" />
      <input
        type="search"
        autoComplete="off"
        placeholder="Search people…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        className="neo-field h-9 w-[200px] rounded-full bg-app-input pl-9 pr-4 text-[13px] text-app-fg placeholder:text-app-fg-muted outline-none transition-all focus:w-[260px]"
        aria-expanded={showPanel}
        aria-controls="navbar-profile-search-results"
        aria-autocomplete="list"
      />

      {showPanel && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[60] w-[min(100vw-2rem,320px)]">
          <div
            id="navbar-profile-search-results"
            className="app-panel overflow-hidden rounded-app-md shadow-modal"
            role="listbox"
          >
          {loading ? (
            <p className="px-4 py-3 text-[13px] text-app-fg-muted">Searching…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-app-fg-muted">No members match that search.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {items.map((u) => (
                <li key={u.id} role="none">
                  <Link
                    href={`/u/${u.username}`}
                    prefetch
                    role="option"
                    onClick={onPick}
                    className="flex items-center gap-3 px-3 py-2.5 text-left text-[13px] text-app-fg-secondary transition-colors hover:bg-app-surface-2 hover:text-app-fg"
                  >
                    <UserAvatar
                      avatarUrl={u.avatarUrl}
                      displayName={u.displayName}
                      username={u.username}
                      size="sm"
                      className="h-8 w-8 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-app-fg">{u.displayName}</span>
                      <span className="block truncate text-app-fg-muted">@{u.username}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
