"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { supabase } from "./supabase";

export interface Notification {
  id: string;
  user_id: string;
  type: "like" | "comment" | "follow" | "app_approved" | "app_rejected";
  title: string;
  body: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_username: string | null;
  resource_id: string | null;
  read: boolean;
  created_at: string;
}

type NotificationsContextValue = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({
  userId,
  children,
}: {
  userId: string | undefined;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const notificationsRef = useRef<Notification[]>([]);
  notificationsRef.current = notifications;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: Notification) => !n.read).length);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchNotifications();
  }, [userId, fetchNotifications]);

  /** Leaving the notifications page — refresh badge from server (keeps nav in sync). */
  useEffect(() => {
    if (!userId) return;
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    if (prev === "/notifications" && pathname !== "/notifications") {
      void fetchNotifications();
    }
  }, [pathname, userId, fetchNotifications]);

  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchNotifications();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId, fetchNotifications]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-realtime-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((c) => c + (newNotif.read ? 0 : 1));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void fetchNotifications();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const oldRow = payload.old as Partial<Notification>;
          if (!oldRow?.id) {
            void fetchNotifications();
            return;
          }
          if (notificationsRef.current.some((n) => n.id === oldRow.id)) {
            void fetchNotifications();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
  }, [userId]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      refetch: fetchNotifications,
    }),
    [notifications, unreadCount, loading, markAsRead, markAllAsRead, fetchNotifications],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
