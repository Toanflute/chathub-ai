"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, CheckCheck, Trash2, Unlink, X } from "lucide-react";

export type NotificationItem = {
  id: string;
  channel: string;
  title?: string;
  message: string;
  time?: string;
  unread?: boolean;
  read?: boolean;
};
const initialNotifications: NotificationItem[] = [
  { id: "1", channel: "Website cmsnt.co", message: "Kênh Website cmsnt.co đang mất kết nối. Hệ thống vẫn tự thử lại, nhưng nếu lâu không lên thì cần được kiểm tra.", read: false },
  { id: "2", channel: "Fanpage CMSNT", message: "Kênh Fanpage CMSNT đang mất kết nối. Hệ thống vẫn tự thử lại, nhưng nếu lâu không lên thì cần được kiểm tra.", read: false },
  { id: "3", channel: "Telegram Bot bán hàng", message: "Kênh Telegram Bot bán hàng đang mất kết nối. Hệ thống vẫn tự thử lại, nhưng nếu lâu không lên thì cần được kiểm tra.", read: false },
];

type NotificationDrawerProps = {
  open?: boolean;
  notifications?: NotificationItem[];
  unreadCount?: number;
  onClose?: () => void;
  onReadAll?: () => void;
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export default function NotificationDrawer(props: NotificationDrawerProps = {}) {
  const [internalNotifications, setInternalNotifications] = useState(initialNotifications);
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"Tất cả" | "Chưa đọc">("Chưa đọc");
  const notifications = props.notifications ?? internalNotifications;
  const open = props.open ?? internalOpen;
  const setOpen = (value: boolean) => {
    if (props.open !== undefined) {
      if (!value) props.onClose?.();
      return;
    }
    setInternalOpen(value);
  };
  const unreadCount = props.unreadCount ?? notifications.filter((item) => item.unread ?? !item.read).length;
  const visible = useMemo(() => notifications.filter((item) => activeTab === "Tất cả" || (item.unread ?? !item.read)), [activeTab, notifications]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('button[aria-label^="Thông báo"]')) {
        event.preventDefault();
        event.stopPropagation();
        setInternalOpen((value) => !value);
      }
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick, true); window.removeEventListener("keydown", onKey); };
  }, []);

  useEffect(() => {
    document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Thông báo"]').forEach((button) => {
      button.setAttribute("aria-label", unreadCount ? `Thông báo: ${unreadCount} chưa đọc` : "Thông báo");
      button.setAttribute("aria-expanded", String(open));
      const badge = button.querySelector<HTMLElement>("span");
      if (badge) { badge.textContent = String(unreadCount); badge.hidden = unreadCount === 0; }
    });
  }, [open, unreadCount]);

  function close() { setOpen(false); }
  function markAllRead() {
    if (props.onReadAll) props.onReadAll();
    else setInternalNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }
  function markRead(id: string) {
    if (props.onRead) props.onRead(id);
    else setInternalNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
  }
  function remove(id: string) {
    if (props.onDelete) props.onDelete(id);
    else setInternalNotifications((current) => current.filter((item) => item.id !== id));
  }
  if (!open) return null;

  return <>
    <button type="button" aria-label="Đóng bảng thông báo" onClick={close} className="fixed inset-x-0 bottom-0 top-14 z-[60] cursor-default bg-slate-950/15" />
    <section role="dialog" aria-modal="true" aria-label="Thông báo" className="fixed right-0 top-14 z-[70] flex w-full max-w-[400px] flex-col overflow-hidden rounded-b-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.22)] sm:right-4 sm:top-[60px] sm:rounded-2xl" style={{ maxHeight: "calc(100dvh - 64px)" }}>
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2B54C3]"><Bell className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 className="text-base font-bold text-slate-900">Thông báo</h2><p className="mt-0.5 text-xs text-slate-500">Bạn có {unreadCount} thông báo chưa đọc</p></div><button onClick={close} aria-label="Đóng bảng thông báo" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></header>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4"><div className="flex items-center gap-4" role="tablist" aria-label="Lọc thông báo">{(["Tất cả", "Chưa đọc"] as const).map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`relative flex h-12 items-center gap-1.5 text-[13px] font-semibold ${activeTab === tab ? "text-[#2B54C3]" : "text-slate-500"}`}>{tab}{tab === "Chưa đọc" && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-[#2B54C3]">{unreadCount}</span>}{activeTab === tab && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#2B54C3]" />}</button>)}</div><button onClick={markAllRead} disabled={!unreadCount} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold text-[#2B54C3] hover:bg-blue-50 disabled:opacity-40"><CheckCheck className="h-4 w-4" />Đọc tất cả</button></div>
      <div className="inbox-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4"><h3 className="mb-3 text-[10px] font-bold tracking-[0.12em] text-slate-400">TRƯỚC ĐÓ</h3>{visible.length ? <div className="space-y-3">{visible.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200"><div className="flex gap-3 p-3.5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500"><Unlink className="h-[18px] w-[18px]" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium"><span className="text-rose-600">Kênh mất kết nối</span>{(item.unread ?? !item.read) && <span className="inline-flex items-center gap-1 text-slate-500"><i className="h-1.5 w-1.5 rounded-full bg-blue-500" />Chưa đọc</span>}</div><h4 className="mt-1 text-[13px] font-bold text-slate-800">Kênh mất kết nối</h4><p className="mt-1 text-[11px] leading-5 text-slate-500">{item.message}</p></div></div><footer className="flex items-center justify-between border-t border-slate-100 px-3.5 py-2"><span className="text-[10px] text-slate-400">69 ngày trước</span><div className="flex items-center gap-1">{!item.read && <button onClick={() => markRead(item.id)} aria-label="Đánh dấu đã đọc" className="rounded-md p-1.5 text-[#2B54C3] hover:bg-blue-50"><Check className="h-4 w-4" /></button>}<button onClick={() => remove(item.id)} aria-label="Xóa thông báo" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div></footer></article>)}</div> : <div className="px-4 py-10 text-center"><Bell className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">Không có thông báo</p><p className="mt-1 text-xs text-slate-400">Bạn đã xem hết thông báo chưa đọc.</p></div>}</div>
    </section>
  </>;
}
