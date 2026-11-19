"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, LoaderCircle, MessageCircle, Send, X } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; createdAt?: string };

const VISITOR_KEY = "chathub-ai-visitor";
const CONVERSATION_KEY = "chathub-ai-conversation";

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ChatWidget({ channelConnectionId }: { channelConnectionId?: string }) {
  const { settings } = useSettings();
  const systemName = typeof settings.general?.systemName === "string" && settings.general.systemName.trim()
    ? settings.general.systemName
    : "ChatHub";
  const [open, setOpen] = useState(false);
  const [visitorId, setVisitorId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const visitorKey = channelConnectionId ? `${VISITOR_KEY}:${channelConnectionId}` : VISITOR_KEY;
    const conversationKey = channelConnectionId ? `${CONVERSATION_KEY}:${channelConnectionId}` : CONVERSATION_KEY;
    let visitor = window.localStorage.getItem(visitorKey);
    if (!visitor) { visitor = makeId(); window.localStorage.setItem(visitorKey, visitor); }
    const storedConversation = window.localStorage.getItem(conversationKey) || "";
    setVisitorId(visitor);
    setConversationId(storedConversation);
    const query = new URLSearchParams({ visitorId: visitor });
    if (storedConversation) query.set("conversationId", storedConversation);
    if (channelConnectionId) query.set("channelConnectionId", channelConnectionId);
    fetch(`/api/chat?${query.toString()}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tải lịch sử chat.");
      setMessages((data.messages || []).map((message: ChatMessage) => ({ ...message, role: message.role === "user" ? "user" : "assistant" })));
      if (data.conversationId && data.conversationId !== storedConversation) { setConversationId(data.conversationId); window.localStorage.setItem(conversationKey, data.conversationId); }
      if (!data.conversationId && storedConversation) { setConversationId(""); window.localStorage.removeItem(conversationKey); }
    }).catch((e) => setError(e.message || "Không thể tải lịch sử."));
  }, [channelConnectionId]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages, open, loading]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading || !visitorId) return;
    setInput(""); setError(""); setLoading(true);
    setMessages((current) => [...current, { id: makeId(), role: "user", content: text }]);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, conversationId: conversationId || undefined, message: text, ...(channelConnectionId ? { channelConnectionId } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gửi tin nhắn thất bại.");
      if (data.conversationId) {
        setConversationId(data.conversationId);
        const conversationKey = channelConnectionId ? `${CONVERSATION_KEY}:${channelConnectionId}` : CONVERSATION_KEY;
        window.localStorage.setItem(conversationKey, data.conversationId);
      }
      setMessages((current) => [...current, data.message]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể gửi tin nhắn.");
      setMessages((current) => current.filter((message) => message.role !== "user" || message.content !== text || message.id !== current[current.length - 1]?.id));
      setInput(text);
    } finally { setLoading(false); }
  }

  return <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
    {open && <section aria-label="Chat hỗ trợ" className="flex h-[min(620px,calc(100dvh-110px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
      <header className="flex items-center gap-3 bg-cyan-600 px-4 py-4 text-white"><span className="rounded-full bg-white/15 p-2"><Bot className="h-5 w-5"/></span><div className="min-w-0 flex-1"><h2 className="font-semibold">{systemName}</h2><p className="mt-0.5 flex items-center gap-1.5 text-xs text-cyan-50"><span className="h-2 w-2 rounded-full bg-emerald-300"/>Trợ lý trực tuyến</p></div><button onClick={() => setOpen(false)} aria-label="Đóng chat" className="rounded-lg p-2 hover:bg-white/10"><X className="h-4 w-4"/></button></header>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-950/70 p-4" aria-live="polite">
        {!messages.length && <div className="mr-8 rounded-2xl rounded-tl-sm bg-slate-800 px-3 py-2.5 text-sm text-slate-200">Xin chào! Tôi có thể giúp gì cho bạn?</div>}
        {messages.map((message) => <div key={message.id} className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-6 ${message.role === "user" ? "ml-auto rounded-tr-sm bg-cyan-600 text-white" : "mr-auto rounded-tl-sm bg-slate-800 text-slate-100"}`}>
          {message.role === "assistant" ? <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-a:text-cyan-300"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div> : <p className="whitespace-pre-wrap">{message.content}</p>}
        </div>)}
        {loading && <div className="mr-auto flex items-center gap-2 rounded-2xl bg-slate-800 px-3 py-2.5 text-xs text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin"/>Đang soạn câu trả lời...</div>}
      </div>
      {error && <p role="alert" className="border-t border-rose-900 bg-rose-950/50 px-4 py-2 text-xs text-rose-200">{error}</p>}
      <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-800 bg-slate-900 p-3"><textarea aria-label="Tin nhắn" rows={1} maxLength={4000} placeholder="Nhập tin nhắn..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(e as unknown as FormEvent); } }} className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"/><button type="submit" disabled={loading || !input.trim()} aria-label="Gửi tin nhắn" className="rounded-xl bg-cyan-500 p-3 text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4"/></button></form>
      <footer className="bg-slate-900 pb-2 text-center text-[10px] text-slate-600">Powered by {systemName}</footer>
    </section>}
    <button onClick={() => setOpen((value) => !value)} aria-label={open ? "Đóng cửa sổ chat" : "Mở chat hỗ trợ"} className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/50 transition hover:scale-105 hover:bg-cyan-400">{open ? <X className="h-6 w-6"/> : <MessageCircle className="h-6 w-6"/>}</button>
  </div>;
}
