"use client";

import { useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Unlink,
  X,
} from "lucide-react";

export type NotificationItem = {
  id: string;
  title?: string;
  channel: string;
  message: string;
  time: string;
  unread: boolean;
};

type NotificationDrawerProps = {
  open: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  onClose: () => void;
  onReadAll: () => void;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function NotificationDrawer({
  open,
  notifications,
  unreadCount,
  onClose,
  onReadAll,
  onRead,
  onDelete,
}: NotificationDrawerProps) {
  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-[60] transition-opacity duration-200 ${
        open ? "opacity-100" : "pointer-events-none invisible opacity-0"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-slate-950/25 md:bg-transparent" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Thông báo"
        className={`absolute inset-x-0 top-[60px] flex max-h-[calc(100dvh-60px)] flex-col overflow-hidden rounded-b-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.2)] transition-transform duration-200 ease-out md:left-auto md:right-5 md:top-[68px] md:max-h-[min(680px,calc(100dvh-88px))] md:w-[400px] md:rounded-2xl ${
          open ? "translate-y-0" : "-translate-y-2"
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <NotificationContent
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={onClose}
          onReadAll={onReadAll}
          onRead={onRead}
          onDelete={onDelete}
        />
      </section>
    </div>
  );
}

function NotificationContent({
  notifications,
  unreadCount,
  onClose,
  onReadAll,
  onRead,
  onDelete,
}: Omit<NotificationDrawerProps, "open">) {
  const [activeTab, setActiveTab] = useState<"all" | "unread">("unread");
  const visibleNotifications = activeTab === "unread"
    ? notifications.filter((notification) => notification.unread)
    : notifications;

  return (
    <>
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF0FF] text-[#2B54C3]">
          <Bell className="h-[19px] w-[19px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-slate-800">Thông báo</h2>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            Bạn có {unreadCount} thông báo chưa đọc
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng thông báo"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </header>

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 sm:px-5">
        <div className="flex h-11 items-stretch gap-5">
          <NotificationTab
            active={activeTab === "all"}
            label="Tất cả"
            onClick={() => setActiveTab("all")}
          />
          <NotificationTab
            active={activeTab === "unread"}
            label="Chưa đọc"
            count={unreadCount}
            onClick={() => setActiveTab("unread")}
          />
        </div>
        <button
          type="button"
          onClick={onReadAll}
          disabled={unreadCount === 0}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-[#2B54C3] transition hover:bg-[#F3F6FF] disabled:cursor-default disabled:opacity-40"
        >
          <CheckCheck className="h-4 w-4" />
          <span>Đọc tất cả</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        {visibleNotifications.length ? (
          <>
            <p className="mb-2 px-1 text-[9px] font-bold tracking-[0.12em] text-slate-400">TRƯỚC ĐÓ</p>
            <div className="space-y-2.5">
              {visibleNotifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`rounded-xl border p-3 transition ${
                    notification.unread ? "border-[#E6EAF3] bg-white" : "border-slate-100 bg-slate-50/60"
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F1] text-[#E0525D]">
                      <Unlink className="h-[17px] w-[17px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[9px] font-semibold">
                        <span className="text-[#D94F58]">Kênh mất kết nối</span>
                        {notification.unread && (
                          <span className="inline-flex items-center gap-1 text-[#3972D6]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#3972D6]" />
                            Chưa đọc
                          </span>
                        )}
                      </p>
                      <h3 className="mt-1 text-[12px] font-bold leading-4 text-slate-800">{notification.title ?? "Kênh mất kết nối"}</h3>
                      <p className="mt-1 text-[10px] leading-[17px] text-slate-500">{notification.message}</p>
                    </div>
                  </div>
                  <footer className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="text-[9px] text-slate-400">{notification.time}</span>
                    <div className="flex items-center gap-1">
                      {notification.unread && (
                        <button
                          type="button"
                          aria-label="Đánh dấu đã đọc"
                          onClick={() => onRead(notification.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#3972D6] transition hover:bg-[#EDF3FF]"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Xoá thông báo"
                        onClick={() => onDelete(notification.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-[15px] w-[15px]" />
                      </button>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="flex min-h-44 flex-col items-center justify-center px-6 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Bell className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[12px] font-semibold text-slate-600">Không có thông báo chưa đọc</p>
            <p className="mt-1 text-[10px] text-slate-400">Bạn đã cập nhật mọi thông báo.</p>
          </div>
        )}
      </div>
    </>
  );
}

function NotificationTab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative inline-flex items-center gap-1.5 text-[11px] font-semibold transition ${
        active ? "text-[#2B54C3]" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${
          active ? "bg-[#EAF0FF] text-[#2B54C3]" : "bg-slate-100 text-slate-500"
        }`}>
          {count}
        </span>
      )}
      {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#2B54C3]" />}
    </button>
  );
}
