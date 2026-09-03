export type Status = "inbox" | "planned" | "in_progress" | "done";
export type Priority = 0 | 1 | 2 | 3 | 4;

export type Idea = {
  id: string;
  number: number;
  identifier: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  labels: string[];
  assignee?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type Comment = {
  id: string;
  ideaId: string;
  body: string;
  createdAt: number;
  authorName?: string;
  authorInitials?: string;
  authorColor?: string;
};

export type CanvasNodeType = "note" | "idea" | "image" | "video";

export type CanvasNode = {
  id: string;
  ideaId: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  title: string;
  body: string;
  linkedIdeaId?: string;
  assetId?: string;
  url?: string;
};

export type CanvasEdge = {
  id: string;
  ideaId: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type CanvasAsset = {
  id: string;
  ideaId: string;
  mimeType: string;
  blob: Blob;
};

export type CanvasGraph = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  assets: CanvasAsset[];
};

export const STATUSES: { id: Status; label: string; shortcut: string }[] = [
  { id: "inbox", label: "Bandeja", shortcut: "1" },
  { id: "planned", label: "Por hacer", shortcut: "2" },
  { id: "in_progress", label: "En progreso", shortcut: "3" },
  { id: "done", label: "Completada", shortcut: "4" },
];

export const PRIORITIES: { id: Priority; label: string; shortcut: string }[] = [
  { id: 0, label: "Sin prioridad", shortcut: "0" },
  { id: 1, label: "Urgente", shortcut: "1" },
  { id: 2, label: "Alta", shortcut: "2" },
  { id: 3, label: "Media", shortcut: "3" },
  { id: 4, label: "Baja", shortcut: "4" },
];

export const LABEL_COLORS: Record<string, string> = {
  Producto: "#5e6ad2",
  Personal: "#27a644",
  Investigación: "#bb87fc",
  Diseño: "#eb5757",
};

export function statusLabel(status: Status): string {
  return STATUSES.find((s) => s.id === status)?.label ?? status;
}

export function priorityLabel(priority: Priority): string {
  return PRIORITIES.find((p) => p.id === priority)?.label ?? "Sin prioridad";
}

export function nextStatus(status: Status, dir: 1 | -1): Status {
  const i = STATUSES.findIndex((s) => s.id === status);
  const next = Math.max(0, Math.min(STATUSES.length - 1, i + dir));
  return STATUSES[next]!.id;
}
