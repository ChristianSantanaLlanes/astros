export type Status = "backlog" | "todo" | "in_progress" | "done" | "canceled";
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

export const STATUSES: { id: Status; label: string; shortcut: string }[] = [
  { id: "backlog", label: "Backlog", shortcut: "1" },
  { id: "todo", label: "Todo", shortcut: "2" },
  { id: "in_progress", label: "In Progress", shortcut: "3" },
  { id: "done", label: "Done", shortcut: "4" },
  { id: "canceled", label: "Canceled", shortcut: "5" },
];

export const PRIORITIES: { id: Priority; label: string; shortcut: string }[] = [
  { id: 0, label: "No priority", shortcut: "0" },
  { id: 1, label: "Urgent", shortcut: "1" },
  { id: 2, label: "High", shortcut: "2" },
  { id: 3, label: "Medium", shortcut: "3" },
  { id: 4, label: "Low", shortcut: "4" },
];

export const LABEL_COLORS: Record<string, string> = {
  Design: "#eb5757",
  Performance: "#f2c94c",
  iOS: "#5e6ad2",
  Android: "#27a644",
  API: "#26b5ce",
  Growth: "#f2994a",
  Infra: "#8a8f98",
  Research: "#bb87fc",
};

export function statusLabel(status: Status): string {
  return STATUSES.find((s) => s.id === status)?.label ?? status;
}

export function priorityLabel(priority: Priority): string {
  return PRIORITIES.find((p) => p.id === priority)?.label ?? "No priority";
}

export function nextStatus(status: Status, dir: 1 | -1): Status {
  const i = STATUSES.findIndex((s) => s.id === status);
  const next = Math.max(0, Math.min(STATUSES.length - 1, i + dir));
  return STATUSES[next]!.id;
}
