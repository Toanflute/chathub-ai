"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { addEdge, Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, type Connection, type Edge, type Node } from "@xyflow/react";
import { ArrowLeft, Bot, Check, LoaderCircle, MessageSquare, GitBranch, Play, Plus, Save, Send, UserRound, X } from "lucide-react";
import { workflowNodeTypes } from "@/components/workflow-nodes";
import type { WorkflowGraph, WorkflowNodeData } from "@/lib/workflow";

const defaultData: Record<string, WorkflowNodeData> = {
  start: { label: "Bắt đầu hội thoại" }, message: { label: "Gửi tin nhắn", message: "Xin chào! Tôi có thể giúp gì cho bạn?" }, condition: { label: "Kiểm tra điều kiện", conditionType: "keyword", keyword: "gặp nhân viên", channel: "WEB_CHAT" }, aiAgent: { label: "AI Agent", systemPrompt: "Bạn là trợ lý chăm sóc khách hàng thân thiện. Trả lời dựa trên tài liệu được cung cấp.", knowledgeGroupIds: [], debounceSeconds: 2, fallback: "handoff" }, handoff: { label: "Chuyển nhân viên" }, end: { label: "Kết thúc" },
};
const nodeMeta: Record<string, { label: string; icon: typeof Play }> = { start: { label: "Bắt đầu", icon: Play }, message: { label: "Tin nhắn", icon: MessageSquare }, condition: { label: "Điều kiện", icon: GitBranch }, aiAgent: { label: "AI Agent", icon: Bot }, handoff: { label: "Chuyển nhân viên", icon: UserRound }, end: { label: "Kết thúc", icon: X } };

type Props = { workflowId: string };
function Editor({ workflowId }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [name, setName] = useState("Workflow mới");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState<WorkflowGraph | null>(null);
  const [chat, setChat] = useState<{ role: "assistant" | "user"; text: string }[]>([{ role: "assistant", text: "Xin chào! Mô tả thay đổi bạn muốn, ví dụ: Thêm điều kiện chỉ áp dụng cho kênh WEB_CHAT." }]);
  const [busy, setBusy] = useState<string | null>(workflowId === "new" ? null : "load");
  const [notice, setNotice] = useState("");
  const nodeTypes = useMemo(() => workflowNodeTypes, []);
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null;

  useEffect(() => {
    fetch("/api/knowledge/groups").then((res) => res.json()).then((data) => setGroups(data.groups ?? [])).catch(() => undefined);
    if (workflowId === "new") return;
    fetch(`/api/workflows/${workflowId}`).then((res) => res.json().then((data) => ({ res, data }))).then(({ res, data }) => { if (!res.ok) throw new Error(data.error); setName(data.workflow.name); setNodes(data.workflow.config.nodes); setEdges(data.workflow.config.edges); }).catch((error) => setNotice(error.message || "Không thể tải workflow.")).finally(() => setBusy(null));
  }, [workflowId, setEdges, setNodes]);

  const onConnect = useCallback((connection: Connection) => setEdges((current) => addEdge({ ...connection, id: `e-${crypto.randomUUID()}` }, current)), [setEdges]);
  function addNode(type: string) {
    const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;
    const node: Node<WorkflowNodeData> = { id, type, position: { x: 120 + Math.random() * 180, y: 120 + Math.random() * 180 }, data: { ...defaultData[type] } };
    setNodes((current) => [...current, node]); setSelectedId(id);
  }
  function updateData(key: string, value: unknown) {
    if (!selectedId) return;
    setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, data: { ...node.data, [key]: value } } : node));
  }
  async function save() {
    setBusy("save"); setNotice("");
    try {
      const payload = { name, config: { nodes, edges } };
      const response = await fetch(workflowId === "new" ? "/api/workflows" : `/api/workflows/${workflowId}`, { method: workflowId === "new" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Lưu thất bại.");
      setNotice("Đã lưu workflow."); if (workflowId === "new") window.location.replace(`/workflows/${data.workflow.id}`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Lưu thất bại."); }
    finally { setBusy(null); }
  }
  async function askCopilot(event: FormEvent) {
    event.preventDefault(); if (!instruction.trim()) return;
    const request = instruction.trim(); setInstruction(""); setProposal(null); setChat((current) => [...current, { role: "user", text: request }]); setBusy("copilot");
    try {
      const response = await fetch("/api/workflows/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instruction: request, graph: { nodes, edges } }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Copilot không thể cập nhật sơ đồ.");
      setProposal(data.graph); setChat((current) => [...current, { role: "assistant", text: data.message }]);
    } catch (error) { setChat((current) => [...current, { role: "assistant", text: error instanceof Error ? error.message : "Có lỗi xảy ra." }]); }
    finally { setBusy(null); }
  }
  function applyProposal() { if (!proposal) return; setNodes(proposal.nodes); setEdges(proposal.edges); setProposal(null); setChat((current) => [...current, { role: "assistant", text: "Đã áp dụng thay đổi vào canvas. Nhớ lưu workflow để giữ lại." }]); }

  const input = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500";
  return <main className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3"><a href="/workflows" aria-label="Quay lại" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /></a><input className="max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold" value={name} onChange={(e) => setName(e.target.value)} aria-label="Tên workflow"/><div className="ml-auto flex items-center gap-3">{notice && <span className="text-xs text-cyan-300">{notice}</span>}<button onClick={save} disabled={busy === "save" || busy === "load"} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy === "save" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Lưu workflow</button></div></header>
    <div className="flex min-h-0 flex-1">
      <aside className="w-16 shrink-0 border-r border-slate-800 bg-slate-900 p-2 md:w-48"><p className="hidden px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 md:block">Thêm node</p>{Object.entries(nodeMeta).map(([type, meta]) => { const Icon = meta.icon; return <button key={type} onClick={() => addNode(type)} title={meta.label} className="mb-1 flex w-full items-center justify-center gap-2 rounded-lg p-2 text-sm text-slate-300 hover:bg-slate-800 md:justify-start"><Icon className="h-4 w-4 shrink-0"/><span className="hidden md:inline">{meta.label}</span></button>; })}</aside>
      <section className="relative min-w-0 flex-1"><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, node) => setSelectedId(node.id)} onPaneClick={() => setSelectedId(null)} nodeTypes={nodeTypes} fitView deleteKeyCode={["Backspace", "Delete"]}><Background color="#334155" gap={20}/><Controls/><MiniMap nodeColor={(node) => node.type === "aiAgent" ? "#a78bfa" : node.type === "condition" ? "#fbbf24" : "#22d3ee"}/></ReactFlow></section>
      <aside className="flex w-[300px] shrink-0 flex-col border-l border-slate-800 bg-slate-900 xl:w-[360px]">
        <section className="min-h-0 flex-1 overflow-y-auto border-b border-slate-800 p-4"><h2 className="mb-4 text-sm font-semibold">{selectedNode ? `Cấu hình: ${nodeMeta[selectedNode.type || ""]?.label || "Node"}` : "Cấu hình node"}</h2>{selectedNode ? <div className="space-y-3">
          <label className="block text-xs text-slate-400">Tên node<input className={input} value={String(selectedNode.data.label ?? "")} onChange={(e) => updateData("label", e.target.value)}/></label>
          {selectedNode.type === "message" && <label className="block text-xs text-slate-400">Nội dung tin nhắn<textarea className={input} rows={4} value={String(selectedNode.data.message ?? "")} onChange={(e) => updateData("message", e.target.value)}/></label>}
          {selectedNode.type === "condition" && <><label className="block text-xs text-slate-400">Loại điều kiện<select className={input} value={String(selectedNode.data.conditionType ?? "keyword")} onChange={(e) => updateData("conditionType", e.target.value)}><option value="keyword">Tin nhắn chứa từ khóa</option><option value="channel">Kênh chat</option></select></label>{selectedNode.data.conditionType === "channel" ? <label className="block text-xs text-slate-400">Kênh<input className={input} value={String(selectedNode.data.channel ?? "WEB_CHAT")} onChange={(e) => updateData("channel", e.target.value)}/></label> : <label className="block text-xs text-slate-400">Từ khóa<input className={input} value={String(selectedNode.data.keyword ?? "")} onChange={(e) => updateData("keyword", e.target.value)}/></label>}</>}
          {selectedNode.type === "aiAgent" && <><label className="block text-xs text-slate-400">System Prompt<textarea className={input} rows={5} value={String(selectedNode.data.systemPrompt ?? "")} onChange={(e) => updateData("systemPrompt", e.target.value)}/></label><fieldset><legend className="mb-2 text-xs text-slate-400">Nhóm tài liệu được đọc</legend>{groups.length ? groups.map((group) => { const checked = (selectedNode.data.knowledgeGroupIds as string[] ?? []).includes(group.id); return <label key={group.id} className="mb-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={checked} onChange={(e) => { const current = selectedNode.data.knowledgeGroupIds as string[] ?? []; updateData("knowledgeGroupIds", e.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id)); }} className="accent-violet-500"/>{group.name}</label>; }) : <p className="text-xs text-slate-500">Chưa có nhóm. Tạo tại trang Kiến thức.</p>}</fieldset><label className="block text-xs text-slate-400">Gộp tin nhắn liên tiếp (giây)<input className={input} type="number" min="0" max="60" value={Number(selectedNode.data.debounceSeconds ?? 2)} onChange={(e) => updateData("debounceSeconds", Number(e.target.value))}/></label><label className="block text-xs text-slate-400">Khi AI không trả lời được<select className={input} value={String(selectedNode.data.fallback ?? "handoff")} onChange={(e) => updateData("fallback", e.target.value)}><option value="handoff">Chuyển nhân viên</option><option value="end">Kết thúc</option></select></label></>}
          <button onClick={() => { setNodes((current) => current.filter((node) => node.id !== selectedNode.id)); setEdges((current) => current.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)); setSelectedId(null); }} className="rounded-lg border border-rose-900 px-3 py-2 text-xs text-rose-300 hover:bg-rose-950">Xóa node</button>
        </div> : <p className="text-xs leading-5 text-slate-500">Chọn một node trên canvas để chỉnh sửa cấu hình.</p>}</section>
        <section className="flex h-[44%] min-h-[240px] flex-col"><div className="flex items-center gap-2 border-b border-slate-800 p-3"><Bot className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-semibold">Workflow Copilot</h2></div><div className="flex-1 space-y-3 overflow-y-auto p-3">{chat.map((item, index) => <div key={index} className={`max-w-[95%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-5 ${item.role === "user" ? "ml-auto bg-cyan-950 text-cyan-100" : "bg-slate-800 text-slate-300"}`}>{item.text}</div>)}{proposal && <div className="rounded-xl border border-violet-700 bg-violet-950/40 p-3"><p className="text-xs text-violet-200">Đề xuất: {proposal.nodes.length} node, {proposal.edges.length} cạnh.</p><button onClick={applyProposal} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-violet-400 px-3 py-2 text-xs font-semibold text-slate-950"><Check className="h-3 w-3"/>Áp dụng vào sơ đồ</button></div>}</div><form onSubmit={askCopilot} className="flex gap-2 border-t border-slate-800 p-3"><textarea className="min-w-0 flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-violet-500" rows={2} placeholder="Mô tả thay đổi bằng tiếng Việt..." value={instruction} onChange={(e) => setInstruction(e.target.value)}/><button disabled={busy === "copilot" || !instruction.trim()} className="self-end rounded-lg bg-violet-400 p-2 text-slate-950 disabled:opacity-50" aria-label="Gửi yêu cầu">{busy === "copilot" ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}</button></form></section>
      </aside>
    </div>
  </main>;
}
export default function WorkflowEditor(props: Props) { return <ReactFlowProvider><Editor {...props}/></ReactFlowProvider>; }
