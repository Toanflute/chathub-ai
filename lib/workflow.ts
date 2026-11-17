import type { Edge, Node } from "@xyflow/react";

export type WorkflowNodeData = Record<string, unknown> & {
  label?: string;
  message?: string;
  conditionType?: "keyword" | "channel";
  keyword?: string;
  channel?: string;
  systemPrompt?: string;
  knowledgeGroupIds?: string[];
  debounceSeconds?: number;
  fallback?: string;
};

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;
export type WorkflowGraph = { nodes: WorkflowNode[]; edges: WorkflowEdge[] };

const ALLOWED_NODE_TYPES = new Set(["start", "message", "condition", "aiAgent", "handoff", "end"]);
const MAX_NODES = 60;
const MAX_EDGES = 120;

export function validateGraph(value: unknown): WorkflowGraph | null {
  if (!value || typeof value !== "object") return null;
  const graph = value as Record<string, unknown>;
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || graph.nodes.length > MAX_NODES || graph.edges.length > MAX_EDGES) return null;
  const ids = new Set<string>();
  const nodes: WorkflowNode[] = [];
  for (const raw of graph.nodes) {
    if (!raw || typeof raw !== "object") return null;
    const node = raw as Record<string, unknown>;
    if (typeof node.id !== "string" || !node.id || ids.has(node.id) || typeof node.type !== "string" || !ALLOWED_NODE_TYPES.has(node.type)) return null;
    if (!node.position || typeof node.position !== "object") return null;
    const position = node.position as Record<string, unknown>;
    if (typeof position.x !== "number" || typeof position.y !== "number" || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
    const data = node.data && typeof node.data === "object" ? node.data as Record<string, unknown> : {};
    nodes.push({
      id: node.id.slice(0, 100),
      type: node.type,
      position: { x: Math.max(-5000, Math.min(5000, position.x)), y: Math.max(-5000, Math.min(5000, position.y)) },
      data: {
        label: typeof data.label === "string" ? data.label.slice(0, 120) : undefined,
        message: typeof data.message === "string" ? data.message.slice(0, 3000) : undefined,
        conditionType: data.conditionType === "channel" ? "channel" : data.conditionType === "keyword" ? "keyword" : undefined,
        keyword: typeof data.keyword === "string" ? data.keyword.slice(0, 200) : undefined,
        channel: typeof data.channel === "string" ? data.channel.slice(0, 80) : undefined,
        systemPrompt: typeof data.systemPrompt === "string" ? data.systemPrompt.slice(0, 5000) : undefined,
        knowledgeGroupIds: Array.isArray(data.knowledgeGroupIds) ? data.knowledgeGroupIds.filter((id): id is string => typeof id === "string").slice(0, 50) : undefined,
        debounceSeconds: typeof data.debounceSeconds === "number" ? Math.max(0, Math.min(60, data.debounceSeconds)) : undefined,
        fallback: typeof data.fallback === "string" ? data.fallback.slice(0, 1000) : undefined,
      },
    });
    ids.add(node.id);
  }
  const edges: WorkflowEdge[] = [];
  for (const raw of graph.edges) {
    if (!raw || typeof raw !== "object") return null;
    const edge = raw as Record<string, unknown>;
    if (typeof edge.id !== "string" || typeof edge.source !== "string" || typeof edge.target !== "string" || !ids.has(edge.source) || !ids.has(edge.target)) return null;
    edges.push({ id: edge.id.slice(0, 120), source: edge.source, target: edge.target, sourceHandle: typeof edge.sourceHandle === "string" ? edge.sourceHandle.slice(0, 40) : null, targetHandle: typeof edge.targetHandle === "string" ? edge.targetHandle.slice(0, 40) : null, label: typeof edge.label === "string" ? edge.label.slice(0, 40) : undefined, animated: Boolean(edge.animated) });
  }
  return { nodes, edges };
}

export function assistantTemplate(): WorkflowGraph {
  const at = (x: number, y: number) => ({ x, y });
  return {
    nodes: [
      { id: "start", type: "start", position: at(80, 180), data: { label: "Bắt đầu hội thoại" } },
      { id: "welcome", type: "message", position: at(340, 180), data: { label: "Chào mừng", message: "Xin chào! Tôi là trợ lý AI. Tôi có thể giúp gì cho bạn?" } },
      { id: "intent", type: "condition", position: at(620, 180), data: { label: "Yêu cầu gặp nhân viên?", conditionType: "keyword", keyword: "gặp nhân viên" } },
      { id: "agent", type: "aiAgent", position: at(930, 90), data: { label: "Trợ lý AI 24/7", systemPrompt: "Bạn là nhân viên chăm sóc khách hàng thân thiện. Trả lời chính xác dựa trên tài liệu kiến thức được cung cấp. Nếu không biết, hãy nói rõ và đề nghị chuyển nhân viên.", knowledgeGroupIds: [], debounceSeconds: 2, fallback: "handoff" } },
      { id: "human", type: "handoff", position: at(930, 330), data: { label: "Chuyển nhân viên" } },
    ],
    edges: [
      { id: "e-start-welcome", source: "start", target: "welcome" },
      { id: "e-welcome-intent", source: "welcome", target: "intent" },
      { id: "e-intent-agent", source: "intent", sourceHandle: "yes", target: "human", label: "Có" },
      { id: "e-intent-ai", source: "intent", sourceHandle: "no", target: "agent", label: "Không" },
    ],
  };
}
