export type Status = "inbox" | "planned" | "in_progress" | "done";
export type Priority = 0 | 1 | 2 | 3 | 4;

export type Label = {
  id: string;
  name: string;
  color: string;
};

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

export const LABEL_PALETTE = [
  "#5e6ad2",
  "#27a644",
  "#bb87fc",
  "#eb5757",
  "#f2c94c",
  "#26b5ce",
  "#f2994a",
] as const;

export const SEED_LABELS: Label[] = [
  { id: "label-producto", name: "Producto", color: "#5e6ad2" },
  { id: "label-personal", name: "Personal", color: "#27a644" },
  { id: "label-investigacion", name: "Investigación", color: "#bb87fc" },
  { id: "label-diseno", name: "Diseño", color: "#eb5757" },
];

export function normalizeLabelName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function nextLabelColor(existing: Label[]): string {
  const used = new Set(existing.map((label) => label.color));
  const unused = LABEL_PALETTE.find((color) => !used.has(color));
  return unused ?? LABEL_PALETTE[existing.length % LABEL_PALETTE.length]!;
}

export function resolveLabels(ids: string[], catalog: Label[]): Label[] {
  const byId = new Map(catalog.map((label) => [label.id, label]));
  return ids.flatMap((id) => {
    const label = byId.get(id);
    return label ? [label] : [];
  });
}

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
