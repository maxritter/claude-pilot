/**
 * useNotifications - manages notification state for the dashboard.
 *
 * Fetches notifications on mount, provides mark-as-read functions,
 * and re-syncs state on SSE reconnection to prevent stale read status.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { Notification } from "../types";

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  refresh: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/notifications?limit=50&include_read=true",
      );
      if (!response.ok) return;
      const data = await response.json();
      if (mountedRef.current) {
        setNotifications(data);
        setUnreadCount(
          data.filter((n: Notification) => n.is_read === 0).length,
        );
      }
    } catch (e) {}
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (!res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: 0 } : n)),
        );
        setUnreadCount((prev) => prev + 1);
      }
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 0 } : n)),
      );
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const prevNotifications = notifications;
    const prevCount = unreadCount;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnreadCount(0);

    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!res.ok) {
        setNotifications(prevNotifications);
        setUnreadCount(prevCount);
      }
    } catch {
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
    }
  }, [notifications, unreadCount]);

  useEffect(() => {
    mountedRef.current = true;
    fetchNotifications();

    const eventSource = new EventSource("/stream");

    eventSource.addEventListener("open", () => {
      fetchNotifications();
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === "new_notification" &&
          data.notification &&
          mountedRef.current
        ) {
          const incoming = data.notification as Notification;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
          setUnreadCount((prev) => prev + 1);
        }
      } catch (e) {}
    };

    return () => {
      mountedRef.current = false;
      eventSource.close();
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
