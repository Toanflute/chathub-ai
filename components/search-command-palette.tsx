"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ContactRound,
  CornerDownLeft,
  Inbox,
  MessageSquareText,
  Package,
  ReceiptText,
  Search,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

const categories = ["Tất cả", "Trang", "Hội thoại", "Liên hệ", "Tin nhắn", "Sản phẩm", "Đơn hàng"];

type SearchResult = {
  id: string;
  category: string;
  label: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  conversationId?: string;
};

type SearchContact = { id: string; name: string; email?: string | null; phone?: string | null };
type SearchConversation = {
  id: string;
  name: string;
  preview: string;
  messages?: { id: string; content: string }[];
};

const pageResults: SearchResult[] = [
  { id: "page-inbox", category: "Trang", label: "Tin nhắn", description: "Hộp thư hội thoại", icon: Inbox, href: "/inbox" },
  { id: "page-contacts", category: "Trang", label: "Liên hệ", description: "Danh sách khách hàng", icon: ContactRound, href: "/contacts" },
  { id: "page-products", category: "Trang", label: "Sản phẩm", description: "Danh mục sản phẩm", icon: Package, href: "/products" },
  { id: "page-orders", category: "Trang", label: "Đơn hàng", description: "Quản lý đơn hàng", icon: ReceiptText, href: "/orders" },
  { id: "page-appointments", category: "Trang", label: "Lịch hẹn", description: "Lịch hẹn và nhắc việc", icon: CalendarDays, href: "/appointments" },
  { id: "page-automation", category: "Trang", label: "Tự động hoá", description: "Cấu hình AI và kho kiến thức", icon: Zap, href: "/knowledge" },
  { id: "page-workflows", category: "Trang", label: "Workflow", description: "Trình tạo luồng tự động", icon: Workflow, href: "/workflows" },
  { id: "page-quick-replies", category: "Trang", label: "Trả lời nhanh", description: "Mẫu tin nhắn có sẵn", icon: MessageSquareText, href: "/quick-replies" },
];

const productResults: SearchResult[] = [
  { id: "product-shirt", category: "Sản phẩm", label: "Áo thun Cotton Premium", description: "SKU AT-042 · Còn hàng", icon: Package, href: "/products" },
  { id: "product-bag", category: "Sản phẩm", label: "Túi Canvas Everyday", description: "SKU TC-018 · Còn hàng", icon: Package, href: "/products" },
];

const orderResults: SearchResult[] = [
  { id: "order-240910", category: "Đơn hàng", label: "#DH-240910", description: "Bùi Gia Huy · Đang giao", icon: ReceiptText, href: "/orders" },
  { id: "order-240882", category: "Đơn hàng", label: "#DH-240882", description: "Hoàng Bảo Ngọc · Đang xử lý", icon: ReceiptText, href: "/orders" },
];

type SearchCommandPaletteProps = {
  open: boolean;
  conversations: SearchConversation[];
  contacts?: SearchContact[];
  onClose: () => void;
  onOpenConversation: (id: string) => void;
};

export default function SearchCommandPalette({
  open,
  conversations,
  contacts = [],
  onClose,
  onOpenConversation,
}: SearchCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    const conversationResults: SearchResult[] = conversations.map((conversation) => ({
      id: `conversation-${conversation.id}`,
      category: "Hội thoại",
      label: conversation.name,
      description: conversation.preview,
      icon: MessageSquareText,
      conversationId: conversation.id,
    }));
    const contactResults: SearchResult[] = contacts.map((contact) => ({
      id: `contact-${contact.id}`,
      category: "Liên hệ",
      label: contact.name,
      description: [contact.email, contact.phone].filter(Boolean).join(" · ") || "Liên hệ khách hàng",
      icon: ContactRound,
      href: "/contacts",
    }));
    const messageResults: SearchResult[] = conversations.flatMap((conversation) =>
      (conversation.messages ?? []).map((message) => ({
        id: `message-${message.id}`,
        category: "Tin nhắn",
        label: message.content,
        description: `${conversation.name} · Hội thoại`,
        icon: MessageSquareText,
        conversationId: conversation.id,
      })),
    );
    const allResults = [
      ...pageResults,
      ...conversationResults,
      ...contactResults,
      ...messageResults,
      ...productResults,
      ...orderResults,
    ];
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");

    return allResults.filter((result) => {
      const matchesCategory = activeCategory === "Tất cả" || result.category === activeCategory;
      const matchesQuery =
        !normalizedQuery ||
        `${result.label} ${result.description} ${result.category}`
          .toLocaleLowerCase("vi")
          .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, contacts, conversations, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveCategory("Tất cả");
      setActiveIndex(0);
    }
  }, [open]);

  if (!open) return null;

  const openResult = (result: SearchResult) => {
    onClose();
    if (result.conversationId !== undefined) {
      onOpenConversation(result.conversationId);
      return;
    }
    if (result.href) window.location.assign(result.href);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      openResult(results[activeIndex]);
    } else if (event.key === "Tab") {
      event.preventDefault();
      const currentIndex = categories.indexOf(activeCategory);
      const direction = event.shiftKey ? -1 : 1;
      const nextIndex = (currentIndex + direction + categories.length) % categories.length;
      setActiveCategory(categories[nextIndex]);
      setActiveIndex(0);
    }
  };

  const groupedResults = results.reduce<Record<string, SearchResult[]>>((groups, result) => {
    (groups[result.category] ??= []).push(result);
    return groups;
  }, {});
  let resultIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-3 py-5 backdrop-blur-[3px] sm:px-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Tìm kiếm nhanh"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex max-h-[86dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
      >
        <div className="flex h-[58px] shrink-0 items-center gap-3 border-b border-slate-100 px-4 sm:px-5">
          <Search className="h-[19px] w-[19px] shrink-0 text-slate-400" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Tìm hội thoại, liên hệ, tin nhắn, đơn hàng..."
            className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400 sm:text-sm"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng tìm kiếm"
            className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-slate-200 px-1.5 text-[10px] font-medium text-slate-500 transition hover:bg-slate-50"
          >
            ESC <X className="h-3 w-3" />
          </button>
        </div>

        <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              onClick={() => {
                setActiveCategory(category);
                setActiveIndex(0);
              }}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                activeCategory === category
                  ? "bg-[#EAF0FF] text-[#2B54C3]"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div
          id="command-palette-results"
          role="listbox"
          aria-label="Kết quả tìm kiếm"
          aria-activedescendant={results[activeIndex]?.id}
          className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3"
        >
          {results.length ? (
            Object.entries(groupedResults).map(([group, groupResults]) => (
              <section key={group} aria-label={group}>
                <h2 className="px-2 pb-1 pt-2 text-[9px] font-bold tracking-[0.12em] text-slate-400">{group.toLocaleUpperCase("vi")}</h2>
                {groupResults.map((result) => {
                  const index = resultIndex++;
                  const Icon = result.icon;
                  return (
                    <button
                      type="button"
                      role="option"
                      id={result.id}
                      aria-selected={activeIndex === index}
                      key={result.id}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => openResult(result)}
                      className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition sm:px-3 ${
                        activeIndex === index ? "bg-[#F1F4FC]" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        group === "Trang" ? "bg-[#EEF2FC] text-[#2B54C3]" : "bg-slate-100 text-slate-500"
                      }`}>
                        <Icon className="h-[17px] w-[17px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-slate-800">{result.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">{result.description}</span>
                      </span>
                      {activeIndex === index && <CornerDownLeft className="h-4 w-4 shrink-0 text-[#8692B0]" />}
                    </button>
                  );
                })}
              </section>
            ))
          ) : (
            <div className="px-5 py-12 text-center">
              <Search className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-600">Không tìm thấy kết quả</p>
              <p className="mt-1 text-xs text-slate-400">Thử từ khóa hoặc nhóm tìm kiếm khác.</p>
            </div>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-[10px] text-slate-500 sm:px-5">
          <span className="inline-flex items-center gap-1.5"><KeyHint><ArrowUp className="h-3 w-3" /></KeyHint><KeyHint><ArrowDown className="h-3 w-3" /></KeyHint>Di chuyển</span>
          <span className="inline-flex items-center gap-1.5"><KeyHint><CornerDownLeft className="h-3 w-3" /></KeyHint>Mở</span>
          <span className="inline-flex items-center gap-1.5"><KeyHint>Tab</KeyHint>Đổi nhóm</span>
        </footer>
      </section>
    </div>
  );
}

function KeyHint({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-[19px] min-w-[19px] items-center justify-center rounded border border-slate-200 bg-white px-1 text-[9px] font-semibold text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.08)]">
      {children}
    </kbd>
  );
}
