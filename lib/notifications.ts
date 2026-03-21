import { useEffect, useState, useCallback } from "react";
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

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("notifications-realtime")
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
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const oldRow = payload.old as Partial<Notification>;
          if (!oldRow?.id) {
            void fetchNotifications();
            return;
          }
          setNotifications((prev) => prev.filter((n) => n.id !== oldRow.id));
          setUnreadCount((c) => {
            if (oldRow.read === false) return Math.max(0, c - 1);
            return c;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [userId]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
