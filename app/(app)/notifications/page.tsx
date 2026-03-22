"use client";

import { useNotifications, type Notification } from "@/lib/notifications";
import { Heart, MessageCircle, UserPlus, CheckCircle, XCircle, Bell } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, { icon: typeof Heart; color: string; bg: string }> = {
  like: { icon: Heart, color: "text-red-400", bg: "bg-red-500/10" },
  comment: { icon: MessageCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
  follow: { icon: UserPlus, color: "text-neon", bg: "bg-neon/10" },
  app_approved: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10" },
  app_rejected: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

function getNotifHref(n: Notification): string | null {
  if (n.type === "like" || n.type === "comment") return n.resource_id ? `/post/${n.resource_id}` : null;
  if (n.type === "follow") return n.actor_username ? `/u/${n.actor_username}` : null;
  return null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

function NotifItem({
  n,
  onInteract,
}: {
  n: Notification;
  /** Mark every notification read when the user engages with one (open target or tap). */
  onInteract: () => void;
}) {
  const config = ICON_MAP[n.type] || ICON_MAP.like;
  const Icon = config.icon;
  const href = getNotifHref(n);

  const inner = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-app-md px-4 py-3.5 transition-colors",
        !n.read ? "bg-app-surface-2/50" : "bg-transparent hover:bg-app-surface-2/40",
      )}
    >
      <div className={cn("mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full", config.bg)}>
        <Icon className={cn("h-[18px] w-[18px]", config.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-snug text-app-fg-secondary">{n.title}</p>
        {n.body && <p className="mt-1 truncate text-[13px] text-app-fg-muted">{n.body}</p>}
        <p className="mt-1 text-[12px] text-app-fg-muted/80">{timeAgo(n.created_at)}</p>
      </div>
      {!n.read && <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--app-accent)]" />}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block" onClick={() => onInteract()}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className="block w-full cursor-pointer text-left"
      onClick={() => onInteract()}
    >
      {inner}
    </button>
  );
}

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markAllAsRead } = useNotifications();

  const handleInteract = () => {
    if (unreadCount > 0) void markAllAsRead();
  };

  return (
    <div className="pb-10">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-app-fg">Notifications</h1>
          {unreadCount > 0 && (
            <p className="mt-0.5 text-[13px] text-app-fg-muted">{unreadCount} unread</p>
          )}
        </div>
      </div>

      <div className="post-card divide-y divide-app-border/40">
        {loading ? (
          <div className="px-4 py-12 text-center text-[14px] text-app-fg-muted">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-app-surface-2 shadow-app">
              <Bell className="h-7 w-7 text-app-fg-muted" />
            </div>
            <h2 className="mb-2 text-[17px] font-bold text-app-fg">No notifications yet</h2>
            <p className="mx-auto max-w-[280px] text-[14px] leading-relaxed text-app-fg-muted">
              When someone likes, comments, or follows you, it will appear here.
            </p>
          </div>
        ) : (
          notifications.map((n) => <NotifItem key={n.id} n={n} onInteract={handleInteract} />)
        )}
      </div>
    </div>
  );
}
