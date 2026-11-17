"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bot, GitBranch, MessageSquare, Play, UserRound, X } from "lucide-react";
import type { WorkflowNodeData } from "@/lib/workflow";

function Card({ icon: Icon, title, children, color = "cyan" }: { icon: typeof Play; title: string; children?: React.ReactNode; color?: string }) {
  return <div className="min-w-[220px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl"><div className={`flex items-center gap-2 border-b border-slate-800 bg-${color}-950/50 px-3 py-2 text-sm font-semibold text-${color}-300`}><Icon className="h-4 w-4" />{title}</div><div className="p-3 text-xs leading-5 text-slate-300">{children}</div></div>;
}
export function StartNode({ data }: NodeProps) { return <><Card icon={Play} title={String(data.label || "Bắt đầu")} color="emerald">Điểm bắt đầu hội thoại</Card><Handle type="source" position={Position.Right} className="!h-3 !w-3 !bg-emerald-400" /></>; }
export function MessageNode({ data }: NodeProps) { return <><Handle type="target" position={Position.Left} /><Card icon={MessageSquare} title={String(data.label || "Gửi tin nhắn")} color="blue">{String(data.message || "Nhập nội dung lời chào...").slice(0, 100)}</Card><Handle type="source" position={Position.Right} /></>; }
export function ConditionNode({ data }: NodeProps) { return <><Handle type="target" position={Position.Left} /><Card icon={GitBranch} title={String(data.label || "Điều kiện")} color="amber">IF {data.conditionType === "channel" ? `channel == ${data.channel || "WEB_CHAT"}` : `nội dung chứa “${data.keyword || "từ khóa"}”`}<div className="mt-2 flex justify-between text-[10px]"><span>Có →</span><span>→ Không</span></div></Card><Handle id="yes" type="source" position={Position.Right} style={{ top: "35%" }} className="!bg-emerald-400" /><Handle id="no" type="source" position={Position.Right} style={{ top: "72%" }} className="!bg-rose-400" /></>; }
export function AiAgentNode({ data }: NodeProps) { const groups = Array.isArray(data.knowledgeGroupIds) ? data.knowledgeGroupIds.length : 0; return <><Handle type="target" position={Position.Left} /><Card icon={Bot} title={String(data.label || "AI Agent")} color="violet">{String(data.systemPrompt || "Chưa cấu hình system prompt").slice(0, 90)}<div className="mt-2 text-violet-300">{groups} nhóm kiến thức · debounce {Number(data.debounceSeconds ?? 2)}s</div></Card><Handle type="source" position={Position.Right} /></>; }
export function HandoffNode({ data }: NodeProps) { return <><Handle type="target" position={Position.Left} /><Card icon={UserRound} title={String(data.label || "Chuyển nhân viên")} color="orange">Chuyển cuộc hội thoại cho nhân viên hỗ trợ</Card><Handle type="source" position={Position.Right} /></>; }
export function EndNode({ data }: NodeProps) { return <><Handle type="target" position={Position.Left} /><Card icon={X} title={String(data.label || "Kết thúc")} color="slate">Kết thúc luồng hội thoại</Card></>; }
export const workflowNodeTypes = { start: StartNode, message: MessageNode, condition: ConditionNode, aiAgent: AiAgentNode, handoff: HandoffNode, end: EndNode };
