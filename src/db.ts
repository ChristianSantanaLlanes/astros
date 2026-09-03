import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CanvasAsset, CanvasEdge, CanvasGraph, CanvasNode, Comment, Idea, Label, Priority, Status } from "./types";
import { LABEL_PALETTE, SEED_LABELS, nextLabelColor, normalizeLabelName } from "./types";
import { seedIdeas } from "./seed";

const TEAM = "IDEA";
export const MAX_CANVAS_FILE_BYTES = 25 * 1024 * 1024;

interface ForgeDB extends DBSchema {
  ideas: {
    key: string;
    value: Idea;
    indexes: {
      by_status_order: [Status, number];
      by_updated: number;
      by_number: number;
    };
  };
  comments: {
    key: string;
    value: Comment;
    indexes: { by_idea: string };
  };
  meta: {
    key: string;
    value: { key: string; nextNumber: number };
  };
  canvasNodes: {
    key: string;
    value: CanvasNode;
    indexes: { by_idea: string };
  };
  canvasEdges: {
    key: string;
    value: CanvasEdge;
    indexes: { by_idea: string };
  };
  canvasAssets: {
    key: string;
    value: CanvasAsset;
    indexes: { by_idea: string };
  };
  labels: {
    key: string;
    value: Label;
  };
}

let dbPromise: Promise<IDBPDatabase<ForgeDB>> | null = null;

function db(): Promise<IDBPDatabase<ForgeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ForgeDB>("forge-ideas-6", 3, {
      async upgrade(database, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          const ideas = database.createObjectStore("ideas", { keyPath: "id" });
          ideas.createIndex("by_status_order", ["status", "order"]);
          ideas.createIndex("by_updated", "updatedAt");
          ideas.createIndex("by_number", "number");
          const comments = database.createObjectStore("comments", { keyPath: "id" });
          comments.createIndex("by_idea", "ideaId");
          database.createObjectStore("meta", { keyPath: "key" });
        }
        if (oldVersion < 2) {
          const nodes = database.createObjectStore("canvasNodes", { keyPath: "id" });
          nodes.createIndex("by_idea", "ideaId");
          const edges = database.createObjectStore("canvasEdges", { keyPath: "id" });
          edges.createIndex("by_idea", "ideaId");
          const assets = database.createObjectStore("canvasAssets", { keyPath: "id" });
          assets.createIndex("by_idea", "ideaId");
        }
        if (oldVersion < 3) {
          database.createObjectStore("labels", { keyPath: "id" });
          await migrateIdeaLabels(transaction.objectStore("labels"), transaction.objectStore("ideas"));
        }
      },
    });
  }
  return dbPromise;
}

function uid(): string {
  return crypto.randomUUID();
}

async function migrateIdeaLabels(
  labelStore: { put: (value: Label) => Promise<string> },
  ideaStore: { put: (value: Idea) => Promise<string>; getAll: () => Promise<Idea[]> },
): Promise<void> {
  const byName = new Map<string, Label>();
  for (const seed of SEED_LABELS) {
    await labelStore.put(seed);
    byName.set(seed.name.toLowerCase(), seed);
  }
  const ideas = await ideaStore.getAll();
  let extra = 0;
  for (const idea of ideas) {
    const nextIds: string[] = [];
    for (const raw of idea.labels) {
      if (SEED_LABELS.some((seed) => seed.id === raw)) {
        nextIds.push(raw);
        continue;
      }
      const key = raw.trim().toLowerCase();
      if (!key) continue;
      let label = byName.get(key);
      if (!label) {
        label = {
          id: uid(),
          name: raw.trim(),
          color: LABEL_PALETTE[(SEED_LABELS.length + extra) % LABEL_PALETTE.length]!,
        };
        extra += 1;
        byName.set(key, label);
        await labelStore.put(label);
      }
      nextIds.push(label.id);
    }
    idea.labels = [...new Set(nextIds)];
    await ideaStore.put(idea);
  }
}

export async function ensureSeed(): Promise<void> {
  const database = await db();
  if ((await database.count("labels")) === 0) {
    for (const label of SEED_LABELS) {
      await database.put("labels", label);
    }
  }
  const count = await database.count("ideas");
  if (count > 0) return;
  const now = Date.now();
  const seeded = seedIdeas(now);
  const tx = database.transaction(["ideas", "comments", "meta"], "readwrite");
  for (const idea of seeded) {
    await tx.objectStore("ideas").put(idea);
  }
  await tx.objectStore("comments").put({
    id: "seed-comment-1",
    ideaId: "seed-1",
    body: "Si hay que buscar el composer, la idea ya se fue. El campo tiene que estar siempre ahí.",
    createdAt: now - 4 * 60_000,
  });
  await tx.objectStore("comments").put({
    id: "seed-comment-2",
    ideaId: "seed-1",
    body: "Enter crea y deja el cursor listo. Sin identificador ni prioridad en la captura: eso se afila después.",
    createdAt: now - 2 * 60_000,
  });
  await tx.objectStore("meta").put({
    key: "counters",
    nextNumber: Math.max(...seeded.map((idea) => idea.number)) + 1,
  });
  await tx.done;
}

export async function listIdeas(): Promise<Idea[]> {
  await ensureSeed();
  const database = await db();
  const all = await database.getAll("ideas");
  return all.sort((a, b) => {
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    if (a.order !== b.order) return a.order - b.order;
    return b.updatedAt - a.updatedAt;
  });
}

export async function getIdea(id: string): Promise<Idea | undefined> {
  const database = await db();
  return database.get("ideas", id);
}

export async function createIdea(input: {
  title: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  labels?: string[];
}): Promise<Idea> {
  const title = input.title.trim();
  if (!title) throw new Error("El título es obligatorio");
  const database = await db();
  const meta = (await database.get("meta", "counters")) ?? { key: "counters", nextNumber: 1 };
  const number = meta.nextNumber;
  const now = Date.now();
  const sameStatus = (await database.getAllFromIndex("ideas", "by_status_order")).filter(
    (i) => i.status === (input.status ?? "inbox"),
  );
  const idea: Idea = {
    id: uid(),
    number,
    identifier: `${TEAM}-${number}`,
    title,
    description: input.description?.trim() ?? "",
    status: input.status ?? "inbox",
    priority: input.priority ?? 0,
    labels: input.labels ?? [],
    order: sameStatus.length === 0 ? 0 : Math.min(...sameStatus.map((i) => i.order)) - 1,
    createdAt: now,
    updatedAt: now,
  };
  const tx = database.transaction(["ideas", "meta"], "readwrite");
  await tx.objectStore("ideas").put(idea);
  await tx.objectStore("meta").put({ key: "counters", nextNumber: number + 1 });
  await tx.done;
  return idea;
}

export async function updateIdea(
  id: string,
  patch: Partial<Pick<Idea, "title" | "description" | "status" | "priority" | "labels" | "assignee" | "order">>,
): Promise<Idea> {
  const database = await db();
  const current = await database.get("ideas", id);
  if (!current) throw new Error("Idea no encontrada");
  const next: Idea = {
    ...current,
    ...patch,
    title: patch.title !== undefined ? patch.title.trim() : current.title,
    updatedAt: Date.now(),
  };
  if (!next.title) throw new Error("El título es obligatorio");
  await database.put("ideas", next);
  return next;
}

export async function moveIdea(id: string, status: Status, order: number): Promise<Idea> {
  return updateIdea(id, { status, order });
}

export async function deleteIdea(id: string): Promise<void> {
  const database = await db();
  const tx = database.transaction(
    ["ideas", "comments", "canvasNodes", "canvasEdges", "canvasAssets"],
    "readwrite",
  );
  await tx.objectStore("ideas").delete(id);
  const comments = await tx.objectStore("comments").index("by_idea").getAll(id);
  for (const comment of comments) {
    await tx.objectStore("comments").delete(comment.id);
  }
  const nodes = await tx.objectStore("canvasNodes").index("by_idea").getAll(id);
  for (const node of nodes) {
    await tx.objectStore("canvasNodes").delete(node.id);
  }
  const edges = await tx.objectStore("canvasEdges").index("by_idea").getAll(id);
  for (const edge of edges) {
    await tx.objectStore("canvasEdges").delete(edge.id);
  }
  const assets = await tx.objectStore("canvasAssets").index("by_idea").getAll(id);
  for (const asset of assets) {
    await tx.objectStore("canvasAssets").delete(asset.id);
  }
  await tx.done;
}

export async function restoreIdea(idea: Idea, comments: Comment[], canvas?: CanvasGraph): Promise<void> {
  const database = await db();
  const tx = database.transaction(
    ["ideas", "comments", "canvasNodes", "canvasEdges", "canvasAssets"],
    "readwrite",
  );
  await tx.objectStore("ideas").put(idea);
  for (const comment of comments) {
    await tx.objectStore("comments").put(comment);
  }
  if (canvas) {
    for (const node of canvas.nodes) {
      await tx.objectStore("canvasNodes").put(node);
    }
    for (const edge of canvas.edges) {
      await tx.objectStore("canvasEdges").put(edge);
    }
    for (const asset of canvas.assets) {
      await tx.objectStore("canvasAssets").put(asset);
    }
  }
  await tx.done;
}

export async function getCanvas(ideaId: string): Promise<CanvasGraph> {
  const database = await db();
  const [nodes, edges, assets] = await Promise.all([
    database.getAllFromIndex("canvasNodes", "by_idea", ideaId),
    database.getAllFromIndex("canvasEdges", "by_idea", ideaId),
    database.getAllFromIndex("canvasAssets", "by_idea", ideaId),
  ]);
  return { nodes, edges, assets };
}

export async function replaceCanvas(ideaId: string, nodes: CanvasNode[], edges: CanvasEdge[]): Promise<void> {
  const database = await db();
  const tx = database.transaction(["canvasNodes", "canvasEdges", "canvasAssets"], "readwrite");
  const existingNodes = await tx.objectStore("canvasNodes").index("by_idea").getAll(ideaId);
  const existingEdges = await tx.objectStore("canvasEdges").index("by_idea").getAll(ideaId);
  const existingAssets = await tx.objectStore("canvasAssets").index("by_idea").getAll(ideaId);
  const nextNodeIds = new Set(nodes.map((node) => node.id));
  const nextEdgeIds = new Set(edges.map((edge) => edge.id));
  const keptAssetIds = new Set(nodes.map((node) => node.assetId).filter((id): id is string => Boolean(id)));
  for (const node of existingNodes) {
    if (!nextNodeIds.has(node.id)) await tx.objectStore("canvasNodes").delete(node.id);
  }
  for (const edge of existingEdges) {
    if (!nextEdgeIds.has(edge.id)) await tx.objectStore("canvasEdges").delete(edge.id);
  }
  for (const asset of existingAssets) {
    if (!keptAssetIds.has(asset.id)) await tx.objectStore("canvasAssets").delete(asset.id);
  }
  for (const node of nodes) {
    await tx.objectStore("canvasNodes").put(node);
  }
  for (const edge of edges) {
    await tx.objectStore("canvasEdges").put(edge);
  }
  await tx.done;
}

export async function putCanvasAsset(ideaId: string, file: Blob): Promise<CanvasAsset> {
  if (file.size > MAX_CANVAS_FILE_BYTES) {
    throw new Error("El archivo supera 25 MB");
  }
  const asset: CanvasAsset = {
    id: uid(),
    ideaId,
    mimeType: file.type || "application/octet-stream",
    blob: file,
  };
  const database = await db();
  await database.put("canvasAssets", asset);
  return asset;
}

export async function listComments(ideaId: string): Promise<Comment[]> {
  const database = await db();
  const all = await database.getAllFromIndex("comments", "by_idea", ideaId);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function addComment(ideaId: string, body: string): Promise<Comment> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("El comentario está vacío");
  const idea = await getIdea(ideaId);
  if (!idea) throw new Error("Idea no encontrada");
  const comment: Comment = {
    id: uid(),
    ideaId,
    body: trimmed,
    createdAt: Date.now(),
  };
  const database = await db();
  await database.put("comments", comment);
  await updateIdea(ideaId, {});
  return comment;
}

export async function listLabels(): Promise<Label[]> {
  await ensureSeed();
  const database = await db();
  const all = await database.getAll("labels");
  return all.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function createLabel(name: string, color?: string): Promise<Label> {
  const normalized = normalizeLabelName(name);
  if (!normalized) throw new Error("El nombre es obligatorio");
  const database = await db();
  const all = await database.getAll("labels");
  if (all.some((label) => label.name.toLowerCase() === normalized.toLowerCase())) {
    throw new Error("Ya existe una etiqueta con ese nombre");
  }
  const label: Label = {
    id: uid(),
    name: normalized,
    color: color ?? nextLabelColor(all),
  };
  await database.put("labels", label);
  return label;
}

export async function updateLabel(id: string, patch: { name?: string; color?: string }): Promise<Label> {
  const database = await db();
  const current = await database.get("labels", id);
  if (!current) throw new Error("Etiqueta no encontrada");
  const name = patch.name !== undefined ? normalizeLabelName(patch.name) : current.name;
  if (!name) throw new Error("El nombre es obligatorio");
  if (patch.name !== undefined) {
    const all = await database.getAll("labels");
    if (all.some((label) => label.id !== id && label.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("Ya existe una etiqueta con ese nombre");
    }
  }
  const next: Label = {
    ...current,
    name,
    color: patch.color ?? current.color,
  };
  await database.put("labels", next);
  return next;
}

export async function deleteLabel(id: string): Promise<void> {
  const database = await db();
  const tx = database.transaction(["labels", "ideas"], "readwrite");
  await tx.objectStore("labels").delete(id);
  const ideas = await tx.objectStore("ideas").getAll();
  const now = Date.now();
  for (const idea of ideas) {
    if (!idea.labels.includes(id)) continue;
    await tx.objectStore("ideas").put({
      ...idea,
      labels: idea.labels.filter((labelId) => labelId !== id),
      updatedAt: now,
    });
  }
  await tx.done;
}

export function searchIdeas(ideas: Idea[], query: string, catalog: Label[] = []): Idea[] {
  const q = query.trim().toLowerCase();
  if (!q) return ideas;
  const names = new Map(catalog.map((label) => [label.id, label.name]));
  return ideas.filter((idea) => {
    const labelText = idea.labels.map((id) => names.get(id) ?? id).join(" ");
    const hay = `${idea.identifier} ${idea.title} ${idea.description} ${labelText}`.toLowerCase();
    return hay.includes(q);
  });
}
