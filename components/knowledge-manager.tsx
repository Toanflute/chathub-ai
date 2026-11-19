"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronUp, Globe, KeyRound, LoaderCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import TopbarNavigation from "@/components/topbar-navigation";
import { useSettings } from "@/context/SettingsContext";

type Group = { id: string; name: string; description: string | null; _count?: { documents: number } };
type PreviewPage = { url: string; title: string; text: string; chunks: string[] };
type Preview = { pages: PreviewPage[]; errors: { url: string; error: string }[]; stats: { pagesFound: number; failedPages: number; chunks: number; truncated: boolean } };
type Settings = { provider: string; baseUrl?: string | null; modelName: string; embeddingModel: string; isEnabled: boolean; hasApiKey: boolean };

async function responseJson(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Yêu cầu thất bại.");
  return data;
}

export default function KnowledgeManager() {
  const { settings: globalSettings, updateSettings } = useSettings();
  const systemName = String(globalSettings.general?.systemName ?? "ChatHub");
  const [groups, setGroups] = useState<Group[]>([]);
  const [settings, setSettings] = useState<Settings>({ provider: "openai", modelName: "gpt-4o-mini", embeddingModel: "text-embedding-3-small", isEnabled: false, hasApiKey: false });
  const [apiKey, setApiKey] = useState("");
  const [newName, setNewName] = useState("");
  const [url, setUrl] = useState("");
  const [groupId, setGroupId] = useState("");
  const [scope, setScope] = useState<"single" | "domain">("single");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function load() {
    const [groupData, settingsData] = await Promise.all([fetch("/api/knowledge/groups").then(responseJson), fetch("/api/settings").then(responseJson)]);
    setGroups(groupData.groups);
    if (settingsData.aiSettings) setSettings(settingsData.aiSettings);
    setGroupId((current) => current || groupData.groups[0]?.id || "");
  }
  useEffect(() => { load().catch((error) => setNotice({ type: "error", text: error.message })); }, []);

  async function saveSettings(event: FormEvent) {
    event.preventDefault(); setBusy("settings"); setNotice(null);
    try {
      const data = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...settings, apiKey, testConnection: true }) }).then(responseJson);
      const saved = data.aiSettings ?? settings;
      setSettings((current) => ({ ...current, ...saved })); updateSettings("ai-provider", saved); setApiKey(""); setNotice({ type: "success", text: "Đã kiểm tra kết nối và lưu cấu hình AI." });
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Không thể lưu cấu hình." }); }
    finally { setBusy(null); }
  }
  async function addGroup(event: FormEvent) {
    event.preventDefault(); if (!newName.trim()) return; setBusy("group");
    try { const data = await fetch("/api/knowledge/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) }).then(responseJson); setGroups((current) => [data.group, ...current]); setGroupId(data.group.id); setNewName(""); setNotice({ type: "success", text: "Đã tạo nhóm tài liệu." }); }
    catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Không thể tạo nhóm." }); }
    finally { setBusy(null); }
  }
  async function deleteGroup(id: string) {
    if (!window.confirm("Xóa nhóm này và toàn bộ tài liệu thuộc nhóm?")) return;
    try { await fetch(`/api/knowledge/groups?id=${encodeURIComponent(id)}`, { method: "DELETE" }).then(responseJson); setGroups((current) => current.filter((group) => group.id !== id)); if (groupId === id) setGroupId(""); setNotice({ type: "success", text: "Đã xóa nhóm." }); }
    catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Không thể xóa nhóm." }); }
  }
  async function crawl(event: FormEvent) {
    event.preventDefault(); setBusy("crawl"); setNotice(null); setPreview(null);
    try { const data = await fetch("/api/crawler", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, scope }) }).then(responseJson); setPreview(data); setNotice({ type: "success", text: `Quét xong ${data.stats.pagesFound} trang.` }); }
    catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Không thể quét website." }); }
    finally { setBusy(null); }
  }
  async function savePages() {
    if (!preview || !groupId) return; setBusy("save"); setNotice(null);
    try { const data = await fetch("/api/knowledge/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ knowledgeGroupId: groupId, pages: preview.pages }) }).then(responseJson); setNotice({ type: "success", text: `Đã lưu ${data.stats.documents} tài liệu và ${data.stats.chunks} chunks.` }); setPreview(null); await load(); }
    catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Không thể lưu tài liệu." }); }
    finally { setBusy(null); }
  }

  const inputClass = "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-500";
  const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <TopbarNavigation />
      <div className="mx-auto max-w-6xl">
        <a href="/" className="text-sm font-semibold text-cyan-400">← {systemName}</a>
        <header className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">Knowledge base</p><h1 className="mt-2 text-3xl font-bold">Quản lý kiến thức</h1><p className="mt-2 text-slate-400">Cấu hình AI, nhóm tài liệu và quét nội dung website để chuẩn bị cho RAG.</p></header>
        {notice && <div role="status" className={`mt-6 flex items-start gap-2 rounded-xl border p-3 text-sm ${notice.type === "error" ? "border-rose-900 bg-rose-950/50 text-rose-200" : "border-emerald-900 bg-emerald-950/40 text-emerald-200"}`}>{notice.type === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" />}{notice.text}</div>}
        <div className="mt-7 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-cyan-950 p-2 text-cyan-400"><KeyRound className="h-5 w-5" /></span><div><h2 className="font-semibold">Cấu hình AI Provider</h2><p className="text-xs text-slate-400">API key chỉ được xử lý ở server.</p></div></div>
            <form onSubmit={saveSettings} className="mt-5 space-y-4">
              <label className="block text-sm">Provider<select className={inputClass} value={settings.provider} onChange={(e) => setSettings({ ...settings, provider: e.target.value })}><option value="openai">OpenAI</option><option value="deepseek">DeepSeek</option><option value="custom">Custom OpenAI-compatible</option></select></label>
              {settings.provider === "custom" && <label className="block text-sm">Base URL<input className={inputClass} placeholder="https://api.example.com/v1" value={settings.baseUrl || ""} onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })} /></label>}
              <label className="block text-sm">API Key<input className={inputClass} type="password" autoComplete="new-password" placeholder={settings.hasApiKey ? "Đã lưu · nhập khoá mới để thay đổi" : "Nhập API key"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} /></label>
              <label className="block text-sm">Chat model<input className={inputClass} value={settings.modelName} onChange={(e) => setSettings({ ...settings, modelName: e.target.value })} /></label>
              <label className="block text-sm">Embedding model<input className={inputClass} value={settings.embeddingModel} onChange={(e) => setSettings({ ...settings, embeddingModel: e.target.value })} /><span className="mt-1 block text-xs text-slate-500">Schema hiện tại yêu cầu vector 1536 chiều.</span></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.isEnabled} onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })} className="accent-cyan-500" />Bật tính năng AI</label>
              <button className={buttonClass} disabled={busy === "settings"}>{busy === "settings" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Kiểm tra kết nối & lưu</button>
            </form>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-violet-950 p-2 text-violet-300"><Globe className="h-5 w-5" /></span><div><h2 className="font-semibold">Nhóm tài liệu</h2><p className="text-xs text-slate-400">Tổ chức nguồn kiến thức của bạn.</p></div></div>
            <form onSubmit={addGroup} className="mt-5 flex gap-2"><input className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-500" placeholder="Ví dụ: Chính sách bảo hành" value={newName} onChange={(e) => setNewName(e.target.value)} /><button className={`${buttonClass} px-3`} disabled={busy === "group"} aria-label="Tạo nhóm"><Plus className="h-4 w-4" /></button></form>
            <div className="mt-4 space-y-2">{groups.length ? groups.map((group) => <div key={group.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3"><div><p className="text-sm font-medium">{group.name}</p><p className="mt-0.5 text-xs text-slate-500">{group._count?.documents ?? 0} tài liệu</p></div><button onClick={() => deleteGroup(group.id)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-950 hover:text-rose-300" aria-label={`Xóa ${group.name}`}><Trash2 className="h-4 w-4" /></button></div>) : <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">Chưa có nhóm tài liệu.</p>}</div>
          </section>
        </div>
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-950 p-2 text-emerald-300"><Globe className="h-5 w-5" /></span><div><h2 className="font-semibold">Quét website</h2><p className="text-xs text-slate-400">Xem trước nội dung trước khi tạo embeddings và lưu.</p></div></div>
          <form onSubmit={crawl} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm md:col-span-2">URL gốc<input className={inputClass} required type="url" placeholder="https://example.com/help" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
            <label className="text-sm">Nhóm tài liệu<select className={inputClass} required value={groupId} onChange={(e) => setGroupId(e.target.value)}><option value="">Chọn nhóm...</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
            <label className="text-sm">Phạm vi quét<select className={inputClass} value={scope} onChange={(e) => setScope(e.target.value as "single" | "domain")}><option value="single">Chỉ trang này</option><option value="domain">Cả tên miền (tối đa 25 trang)</option></select></label>
            <div className="md:col-span-2"><button className={buttonClass} disabled={busy === "crawl" || !groupId}>{busy === "crawl" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}Quét website</button></div>
          </form>
          {preview && <div className="mt-7 border-t border-slate-800 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Xem trước kết quả</h3><p className="mt-1 text-sm text-slate-400">{preview.stats.pagesFound} trang · {preview.stats.failedPages} lỗi · {preview.stats.chunks} chunks{preview.stats.truncated ? " · đạt giới hạn quét" : ""}</p></div><button onClick={savePages} className={buttonClass} disabled={busy === "save" || !preview.pages.length}>{busy === "save" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Lưu tài liệu</button></div>
            {preview.pages.length > 0 && <div className="mt-4 space-y-3">{preview.pages.map((page) => <article key={page.url} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950"><button className="flex w-full items-center justify-between gap-4 p-4 text-left" onClick={() => setExpanded(expanded === page.url ? null : page.url)}><span className="min-w-0"><span className="block truncate text-sm font-semibold">{page.title}</span><span className="mt-1 block truncate text-xs text-slate-500">{page.url} · {page.chunks.length} chunks</span></span>{expanded === page.url ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}</button>{expanded === page.url && <div className="border-t border-slate-800 p-4"><p className="max-h-56 overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-300">{page.text}</p></div>}</article>)}</div>}
            {preview.errors.length > 0 && <div className="mt-4 space-y-2">{preview.errors.map((item) => <p key={item.url} className="rounded-lg bg-rose-950/40 px-3 py-2 text-xs text-rose-200">{item.url}: {item.error}</p>)}</div>}
          </div>}
        </section>
      </div>
    </main>
  );
}
