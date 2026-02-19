/**
 * NotificationBell — bell icon with unread badge and dropdown in the Topbar.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Icon, Button, Tooltip } from "./ui";
import type { Notification } from "../types";

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const utcStr = dateStr.endsWith("Z") ? dateStr : dateStr + "Z";
  const diff = Date.now() - new Date(utcStr).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const TYPE_ICONS: Record<string, string> = {
  plan_approval: "lucide:file-check",
  verification_complete: "lucide:check-circle",
  attention_needed: "lucide:alert-circle",
};

export function NotificationBell({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Tooltip text="Notifications" position="bottom">
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
          <div className="relative">
            <Icon icon="lucide:bell" size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-error text-error-content text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </Button>
      </Tooltip>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-base-300 bg-base-100 shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => {
                  onMarkAllAsRead();
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-base-content/50">
              No notifications
            </div>
          ) : (
            <div className="divide-y divide-base-300">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  className={`w-full text-left px-4 py-3 hover:bg-base-200/50 transition-colors ${
                    n.is_read === 0 ? "bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    if (n.is_read === 0) onMarkAsRead(n.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      icon={TYPE_ICONS[n.type] || "lucide:info"}
                      size={16}
                      className={`mt-0.5 flex-shrink-0 ${n.is_read === 0 ? "text-primary" : "text-base-content/40"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm truncate ${n.is_read === 0 ? "font-medium" : ""}`}
                        >
                          {n.title}
                        </span>
                        {n.is_read === 0 && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-base-content/60 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-base-content/40 mt-1 block">
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
