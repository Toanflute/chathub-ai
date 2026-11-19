"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminLinks, automationLinks, primaryLinks } from "@/components/main-navigation";
import { useSettings } from "@/context/SettingsContext";

const topbarLinks = [...primaryLinks, ...automationLinks, ...adminLinks];

export default function TopbarNavigation() {
  const { settings } = useSettings();
  const pathname = usePathname();
  if (settings.appearance?.menuLayout === "sidebar" || pathname === "/login" || pathname === "/privacy") return null;

  return (
    <nav aria-label="Điều hướng quản trị" className="hidden h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 lg:flex">
      {topbarLinks.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
