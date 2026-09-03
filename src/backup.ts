import type { CanvasAsset, CanvasEdge, CanvasNode, Comment, Idea, Label } from "./types";
import { statusLabel } from "./types";

export const BACKUP_VERSION = 1 as const;

export type ForgeBackupAsset = {
  id: string;
  ideaId: string;
  mimeType: string;
  dataBase64: string;
};

export type ForgeBackup = {
  version: typeof BACKUP_VERSION;
  exportedAt: number;
  ideas: Idea[];
  comments: Comment[];
  labels: Label[];
  canvasNodes: CanvasNode[];
  canvasEdges: CanvasEdge[];
  canvasAssets: ForgeBackupAsset[];
  meta: { nextNumber: number };
};

export type ForgeSnapshot = {
  ideas: Idea[];
  comments: Comment[];
  labels: Label[];
  canvasNodes: CanvasNode[];
  canvasEdges: CanvasEdge[];
  canvasAssets: CanvasAsset[];
  nextNumber: number;
};

function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function snapshotToBackup(snapshot: ForgeSnapshot): Promise<ForgeBackup> {
  const canvasAssets: ForgeBackupAsset[] = [];
  for (const asset of snapshot.canvasAssets) {
    const buffer = await asset.blob.arrayBuffer();
    canvasAssets.push({
      id: asset.id,
      ideaId: asset.ideaId,
      mimeType: asset.mimeType,
      dataBase64: bytesToBase64(new Uint8Array(buffer)),
    });
  }
  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    ideas: snapshot.ideas,
    comments: snapshot.comments,
    labels: snapshot.labels,
    canvasNodes: snapshot.canvasNodes,
    canvasEdges: snapshot.canvasEdges,
    canvasAssets,
    meta: { nextNumber: snapshot.nextNumber },
  };
}

export function backupToSnapshot(backup: ForgeBackup): ForgeSnapshot {
  return {
    ideas: backup.ideas,
    comments: backup.comments,
    labels: backup.labels,
    canvasNodes: backup.canvasNodes,
    canvasEdges: backup.canvasEdges,
    canvasAssets: backup.canvasAssets.map((asset) => {
      const bytes = base64ToBytes(asset.dataBase64);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      return {
        id: asset.id,
        ideaId: asset.ideaId,
        mimeType: asset.mimeType,
        blob: new Blob([copy], { type: asset.mimeType }),
      };
    }),
    nextNumber: backup.meta.nextNumber,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseIdea(raw: unknown): Idea | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || typeof raw.title !== "string") return null;
  if (typeof raw.number !== "number" || typeof raw.identifier !== "string") return null;
  if (typeof raw.description !== "string") return null;
  if (
    raw.status !== "inbox" &&
    raw.status !== "planned" &&
    raw.status !== "in_progress" &&
    raw.status !== "done"
  ) {
    return null;
  }
  if (
    raw.priority !== 0 &&
    raw.priority !== 1 &&
    raw.priority !== 2 &&
    raw.priority !== 3 &&
    raw.priority !== 4
  ) {
    return null;
  }
  if (!isStringArray(raw.labels)) return null;
  if (typeof raw.order !== "number") return null;
  if (typeof raw.createdAt !== "number" || typeof raw.updatedAt !== "number") return null;
  return {
    id: raw.id,
    number: raw.number,
    identifier: raw.identifier,
    title: raw.title,
    description: raw.description,
    status: raw.status,
    priority: raw.priority,
    labels: raw.labels,
    assignee: typeof raw.assignee === "string" ? raw.assignee : undefined,
    order: raw.order,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function parseBackupJson(text: string): ForgeBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("El archivo no es un JSON válido");
  }
  if (!isRecord(parsed)) throw new Error("Backup inválido");
  if (parsed.version !== BACKUP_VERSION) {
    throw new Error(`Versión de backup no soportada (${String(parsed.version)})`);
  }
  if (!Array.isArray(parsed.ideas) || !Array.isArray(parsed.comments) || !Array.isArray(parsed.labels)) {
    throw new Error("Backup incompleto");
  }
  if (!Array.isArray(parsed.canvasNodes) || !Array.isArray(parsed.canvasEdges) || !Array.isArray(parsed.canvasAssets)) {
    throw new Error("Backup incompleto");
  }
  if (!isRecord(parsed.meta) || typeof parsed.meta.nextNumber !== "number") {
    throw new Error("Backup sin contador de ideas");
  }

  const ideas: Idea[] = [];
  for (const item of parsed.ideas) {
    const idea = parseIdea(item);
    if (!idea) throw new Error("El backup contiene una idea inválida");
    ideas.push(idea);
  }

  const comments = parsed.comments as Comment[];
  const labels = parsed.labels as Label[];
  const canvasNodes = parsed.canvasNodes as CanvasNode[];
  const canvasEdges = parsed.canvasEdges as CanvasEdge[];
  const canvasAssets = parsed.canvasAssets as ForgeBackupAsset[];

  for (const asset of canvasAssets) {
    if (
      !isRecord(asset) ||
      typeof asset.id !== "string" ||
      typeof asset.ideaId !== "string" ||
      typeof asset.mimeType !== "string" ||
      typeof asset.dataBase64 !== "string"
    ) {
      throw new Error("El backup contiene un asset inválido");
    }
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: typeof parsed.exportedAt === "number" ? parsed.exportedAt : Date.now(),
    ideas,
    comments,
    labels,
    canvasNodes,
    canvasEdges,
    canvasAssets,
    meta: { nextNumber: parsed.meta.nextNumber },
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function backupFilename(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `forge-backup-${stamp}.json`;
}

export function ideaToMarkdown(idea: Idea, comments: Comment[] = [], labelNames: Map<string, string> = new Map()): string {
  const labels = idea.labels
    .map((id) => labelNames.get(id) ?? id)
    .filter(Boolean)
    .join(", ");
  const lines = [
    `# ${idea.title}`,
    "",
    `- Identificador: ${idea.identifier}`,
    `- Estado: ${statusLabel(idea.status)}`,
    `- Prioridad: ${idea.priority}`,
  ];
  if (labels) lines.push(`- Etiquetas: ${labels}`);
  lines.push("");
  if (idea.description.trim()) {
    lines.push(idea.description.trim(), "");
  }
  if (comments.length) {
    lines.push("## Comentarios", "");
    for (const comment of comments) {
      const when = new Date(comment.createdAt).toLocaleString("es");
      lines.push(`### ${when}`, "", comment.body, "");
    }
  }
  return `${lines.join("\n").trim()}\n`;
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
