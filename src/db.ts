import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Comment, Idea, Priority, Status } from "./types";
import { seedIdeas } from "./seed";

const TEAM = "FOR";

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
}

let dbPromise: Promise<IDBPDatabase<ForgeDB>> | null = null;

function db(): Promise<IDBPDatabase<ForgeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ForgeDB>("forge-ideas", 1, {
      upgrade(database) {
        const ideas = database.createObjectStore("ideas", { keyPath: "id" });
        ideas.createIndex("by_status_order", ["status", "order"]);
        ideas.createIndex("by_updated", "updatedAt");
        ideas.createIndex("by_number", "number");
        const comments = database.createObjectStore("comments", { keyPath: "id" });
        comments.createIndex("by_idea", "ideaId");
        database.createObjectStore("meta", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

function uid(): string {
  return crypto.randomUUID();
}

export async function ensureSeed(): Promise<void> {
  const database = await db();
  const count = await database.count("ideas");
  if (count > 0) return;
  const now = Date.now();
  const seeded = seedIdeas(now);
  const tx = database.transaction(["ideas", "meta"], "readwrite");
  for (const idea of seeded) {
    await tx.objectStore("ideas").put(idea);
  }
  await tx.objectStore("meta").put({ key: "counters", nextNumber: seeded.length + 1 });
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
    (i) => i.status === (input.status ?? "todo"),
  );
  const idea: Idea = {
    id: uid(),
    number,
    identifier: `${TEAM}-${number}`,
    title,
    description: input.description?.trim() ?? "",
    status: input.status ?? "todo",
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
  patch: Partial<Pick<Idea, "title" | "description" | "status" | "priority" | "labels" | "order">>,
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
  const tx = database.transaction(["ideas", "comments"], "readwrite");
  await tx.objectStore("ideas").delete(id);
  const comments = await tx.objectStore("comments").index("by_idea").getAll(id);
  for (const comment of comments) {
    await tx.objectStore("comments").delete(comment.id);
  }
  await tx.done;
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

export function searchIdeas(ideas: Idea[], query: string): Idea[] {
  const q = query.trim().toLowerCase();
  if (!q) return ideas;
  return ideas.filter((idea) => {
    const hay = `${idea.identifier} ${idea.title} ${idea.description} ${idea.labels.join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
}
