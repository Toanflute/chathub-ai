"use client";

import {
  Activity,
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  ContactRound,
  FileClock,
  Inbox,
  LogOut,
  MessageSquareText,
  Moon,
  Package,
  ReceiptText,
  Send,
  Settings,
  Shield,
  Sun,
  UserRound,
  UsersRound,
  Workflow,
  Zap,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

export const primaryLinks = [
  { label: "Tin nhắn", href: "/inbox", icon: Inbox, badge: "7" },
  { label: "Liên hệ", href: "/contacts", icon: ContactRound },
  { label: "Sản phẩm", href: "/products", icon: Package },
  { label: "Đơn hàng", href: "/orders", icon: ReceiptText, badge: "5" },
  { label: "Lịch hẹn", href: "/appointments", icon: CalendarDays },
];

export const automationLinks = [
  { label: "Tự động hoá", href: "/knowledge", icon: Zap },
  { label: "Workflow", href: "/workflows", icon: Workflow },
  { label: "Trả lời nhanh", href: "/quick-replies", icon: MessageSquareText },
  { label: "Chiến dịch", href: "/campaigns", icon: Send },
];

export const adminLinks = [
  { label: "Kênh", href: "/channels", icon: Bot, badge: "3", alert: true },
  { label: "Đội ngũ", href: "/team", icon: UsersRound },
  { label: "Báo cáo", href: "/reports", icon: ChartNoAxesCombined },
  { label: "Nhật ký hoạt động", href: "/activity", icon: FileClock },
  { label: "Cài đặt", href: "/settings", icon: Settings },
];

type MainNavigationProps = {
  mobile?: boolean;
  open?: boolean;
  onClose?: () => void;
  darkMode: boolean;
  receivingEnabled: boolean;
  activePath?: string;
  onToggleDarkMode: () => void;
  onToggleReceiving: () => void;
};

export default function MainNavigation({
  mobile = false,
  open = false,
  onClose,
  darkMode,
  receivingEnabled,
  activePath = "/inbox",
  onToggleDarkMode,
  onToggleReceiving,
}: MainNavigationProps) {
  const { settings } = useSettings();
  const showDesktopSidebar = settings.appearance?.menuLayout === "sidebar";
  const nav = (
    <aside
      onClick={(event) => event.stopPropagation()}
      className={`flex h-full shrink-0 flex-col overflow-y-auto border-r transition-transform duration-300 ease-out ${
        darkMode ? "border-slate-700 bg-[#1F2937]" : "border-[#E9EBF1] bg-white"
      } ${
        mobile
          ? `w-[min(330px,88vw)] shadow-2xl ${open ? "translate-x-0" : "-translate-x-full"}`
          : showDesktopSidebar ? "hidden w-[260px] lg:flex" : "hidden"
      }`}
    >
      <div className={`border-b px-4 pb-4 pt-5 ${darkMode ? "border-slate-700" : "border-[#EDF0F4]"}`}>
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#F3A33B] text-[13px] font-extrabold text-white">
            AD
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#20B47A]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[13px] font-bold ${darkMode ? "text-slate-100" : "text-[#252C3B]"}`}>Admin</p>
            <p className={`mt-0.5 text-[11px] ${darkMode ? "text-slate-400" : "text-[#858B99]"}`}>Chủ sở hữu</p>
          </div>
          <button type="button" aria-label="Thông tin tài khoản" className={`flex h-9 w-9 items-center justify-center rounded-lg ${darkMode ? "text-slate-400 hover:bg-slate-700" : "text-[#7D8492] hover:bg-slate-50"}`}>
            <UserRound className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`flex h-10 items-center gap-2 rounded-xl border px-2.5 text-[10px] font-semibold ${darkMode ? "border-slate-600 text-slate-200 hover:bg-slate-700" : "border-[#E8EAF0] text-[#565E6D] hover:bg-slate-50"}`}
          >
            {darkMode ? <Moon className="h-4 w-4 text-[#6675A7]" /> : <Sun className="h-4 w-4 text-[#E8A431]" />}
            {darkMode ? "Tối" : "Sáng"}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={receivingEnabled}
            onClick={onToggleReceiving}
            className={`flex h-10 items-center justify-between gap-1 rounded-xl border px-2 text-left text-[9px] font-semibold leading-3 ${darkMode ? "border-slate-600 text-slate-200" : "border-[#E8EAF0] text-[#565E6D]"}`}
          >
            <span>Đang nhận hội thoại mới</span>
            <span className={`relative h-[17px] w-[30px] shrink-0 rounded-full transition ${receivingEnabled ? "bg-[#22B573]" : "bg-slate-300"}`}>
              <span className={`absolute top-[2px] h-[13px] w-[13px] rounded-full bg-white transition ${receivingEnabled ? "left-[15px]" : "left-[2px]"}`} />
            </span>
          </button>
          <a href="/settings/security" onClick={onClose} className={`flex h-10 items-center gap-2 rounded-xl border px-2.5 text-[10px] font-semibold ${darkMode ? "border-slate-600 text-slate-200 hover:bg-slate-700" : "border-[#E8EAF0] text-[#565E6D] hover:bg-slate-50"}`}>
            <Shield className="h-4 w-4 text-[#61739F]" />Bảo mật
          </a>
          <button
            type="button"
            onClick={() => {
              document.cookie = "chathub-auth=; path=/; max-age=0; SameSite=Lax";
              window.localStorage.removeItem("chathub-auth");
              window.location.replace("/login");
            }}
            className="flex h-10 items-center gap-2 rounded-xl border border-[#F4D6D8] bg-[#FFF5F5] px-2.5 text-[10px] font-semibold text-[#D34D57] hover:bg-[#FDEBED]"
          >
            <LogOut className="h-4 w-4" />Đăng xuất
          </button>
        </div>
      </div>

      <nav aria-label="Điều hướng chính" className="flex-1 px-3 py-3">
        <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
          {primaryLinks.map(({ label, href, icon: Icon, badge }) => {
            const active = href === activePath;
            return (
              <a
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 items-center gap-2 rounded-xl border px-2.5 py-2 text-[11px] font-semibold transition lg:gap-3 lg:px-3 lg:text-[12px] ${
                  active
                    ? "border-[#2B54C3] bg-[#EEF2FC] text-[#2B54C3]"
                    : darkMode ? "border-transparent text-slate-300 hover:bg-slate-700" : "border-transparent text-[#596171] hover:bg-[#F6F7FA]"
                }`}
              >
                <Icon className="h-[17px] w-[17px] shrink-0" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {badge && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#2B54C3] px-1 text-[9px] font-bold text-white">{badge}</span>}
              </a>
            );
          })}
        </div>

        <MenuGroup title="TỰ ĐỘNG HOÁ" icon={Zap} links={automationLinks} onNavigate={onClose} darkMode={darkMode} activePath={activePath} />
        <MenuGroup title="QUẢN TRỊ" icon={Settings} links={adminLinks} onNavigate={onClose} darkMode={darkMode} activePath={activePath} />
      </nav>
    </aside>
  );

  if (!mobile) return nav;

  return (
    <div
      aria-hidden={!open}
      className={`fixed bottom-0 left-0 right-0 top-[60px] z-40 bg-[#101522]/50 transition-opacity duration-300 lg:hidden ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      role="presentation"
      onClick={onClose}
    >
      {nav}
    </div>
  );
}

function MenuGroup({
  title,
  icon: GroupIcon,
  links,
  onNavigate,
  darkMode,
  activePath,
}: {
  title: string;
  icon: typeof Zap;
  links: { label: string; href: string; icon: typeof Zap; badge?: string; alert?: boolean }[];
  onNavigate?: () => void;
  darkMode: boolean;
  activePath: string;
}) {
  return (
    <section className="mt-5">
      <h2 className="mb-1.5 flex items-center gap-2 px-2 text-[9px] font-extrabold tracking-[0.12em] text-[#9A9FAC]">
        <GroupIcon className="h-3.5 w-3.5" />{title}
      </h2>
      <div className="space-y-0.5">
        {links.map(({ label, href, icon: Icon, badge, alert }) => (
          <a
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={href === activePath ? "page" : undefined}
            className={`flex min-h-9 items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-medium transition ${
              href === activePath
                ? darkMode ? "bg-slate-700 text-blue-300" : "bg-[#EEF2FC] text-[#2B54C3]"
                : darkMode ? "text-slate-300 hover:bg-slate-700 hover:text-blue-300" : "text-[#606777] hover:bg-[#F6F7FA] hover:text-[#2B54C3]"
            }`}
          >
            <Icon className="h-[16px] w-[16px] shrink-0 text-[#818898]" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {badge && <span className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ${alert ? "bg-[#F04452]" : "bg-[#2B54C3]"}`}>{badge}</span>}
          </a>
        ))}
      </div>
    </section>
  );
}
