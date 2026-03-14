"use client";

import { useAuth } from "@/lib/auth-context";
import { useNotifications, type Notification } from "@/lib/notifications";
import { Heart, MessageCircle, UserPlus, CheckCircle, XCircle, Bell, Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, { icon: typeof Heart; color: string; bg: string }> = {
  like:         { icon: Heart,         color: "text-red-400",  bg: "bg-red-500/10" },
  comment:      { icon: MessageCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
  follow:       { icon: UserPlus,      color: "text-neon",     bg: "bg-neon/10" },
  app_approved: { icon: CheckCircle,   color: "text-green-400", bg: "bg-green-500/10" },
  app_rejected: { icon: XCircle,       color: "text-red-400",  bg: "bg-red-500/10" },
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

function NotifItem({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const config = ICON_MAP[n.type] || ICON_MAP.like;
  const Icon = config.icon;
  const href = getNotifHref(n);

  const inner = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl px-4 py-3.5 transition-colors",
        !n.read ? "bg-[#111]" : "bg-transparent hover:bg-[#0a0a0a]",
      )}
      onClick={() => !n.read && onRead(n.id)}
    >
      <div className={cn("mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full", config.bg)}>
        <Icon className={cn("h-[18px] w-[18px]", config.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-snug text-[#e4e4e4]">
          {n.title}
        </p>
        {n.body && (
          <p className="mt-1 truncate text-[13px] text-[#666]">{n.body}</p>
        )}
        <p className="mt-1 text-[12px] text-[#555]">{timeAgo(n.created_at)}</p>
      </div>
      {!n.read && (
        <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neon" />
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{inner}</Link>;
  }
  return inner;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications(user?.id);

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <p className="mt-0.5 text-[13px] text-[#777]">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 rounded-full border border-[#333] px-3.5 py-1.5 text-[13px] font-medium text-[#aaa] transition-colors hover:border-neon/30 hover:text-neon"
          >
            <Check className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="post-card divide-y divide-[#1a1a1a]">
        {loading ? (
          <div className="px-4 py-12 text-center text-[14px] text-[#555]">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#111]">
              <Bell className="h-7 w-7 text-[#555]" />
            </div>
            <h2 className="mb-2 text-[17px] font-bold text-white">No notifications yet</h2>
            <p className="mx-auto max-w-[280px] text-[14px] leading-relaxed text-[#777]">
              When someone likes, comments, or follows you, it will appear here.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotifItem key={n.id} n={n} onRead={markAsRead} />
          ))
        )}
      </div>
    </div>
  );
}
