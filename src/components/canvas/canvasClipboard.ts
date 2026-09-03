import type { Edge, Node } from "@xyflow/react";
import type { CanvasNodeType } from "../../types";
import type { CanvasNodeData } from "./canvasContext";

export type FlowNode = Node<CanvasNodeData, CanvasNodeType>;

export type ClipboardNode = {
  id: string;
  type: CanvasNodeType;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  data: CanvasNodeData;
};

export type ClipboardEdge = {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type ClipboardAsset = {
  oldId: string;
  blob: Blob;
  mimeType: string;
};

export type CanvasClipboard = {
  nodes: ClipboardNode[];
  edges: ClipboardEdge[];
  assets: ClipboardAsset[];
};

export const CLONE_OFFSET = { x: 32, y: 32 };

export function selectedNodeIds(nodes: FlowNode[]): string[] {
  return nodes.filter((node) => node.selected).map((node) => node.id);
}

export function nodesByIds(nodes: FlowNode[], ids: string[]): FlowNode[] {
  const set = new Set(ids);
  return nodes.filter((node) => set.has(node.id));
}

export function selectOnly(nodes: FlowNode[], ids: string[]): FlowNode[] {
  const set = new Set(ids);
  return nodes.map((node) => {
    const selected = set.has(node.id);
    return node.selected === selected ? node : { ...node, selected };
  });
}

export function clearNodeSelection(nodes: FlowNode[]): FlowNode[] {
  return nodes.map((node) => (node.selected ? { ...node, selected: false } : node));
}

export function snapshotSelection(
  nodes: FlowNode[],
  edges: Edge[],
  ids: string[],
  blobs: Record<string, Blob>,
): CanvasClipboard | null {
  const chosen = nodesByIds(nodes, ids);
  if (chosen.length === 0) return null;
  const idSet = new Set(chosen.map((node) => node.id));
  const assets: ClipboardAsset[] = [];
  const seen = new Set<string>();
  for (const node of chosen) {
    const assetId = node.data.assetId;
    if (!assetId || seen.has(assetId)) continue;
    const blob = blobs[assetId];
    if (!blob) continue;
    seen.add(assetId);
    assets.push({
      oldId: assetId,
      blob,
      mimeType: blob.type || "application/octet-stream",
    });
  }
  return {
    nodes: chosen.map(toClipboardNode),
    edges: edges
      .filter((edge) => idSet.has(edge.source) && idSet.has(edge.target))
      .map((edge) => ({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
      })),
    assets,
  };
}

export function cloneSelection(
  nodes: FlowNode[],
  edges: Edge[],
  ids: string[],
  ideaId: string,
  offset = CLONE_OFFSET,
): { nodes: FlowNode[]; edges: Edge[] } | null {
  const clip = snapshotSelection(nodes, edges, ids, {});
  if (!clip) return null;
  return instantiateNodes(clip, ideaId, (node) => ({
    x: node.position.x + offset.x,
    y: node.position.y + offset.y,
  }), (assetId) => assetId);
}

export function instantiateClipboard(
  clip: CanvasClipboard,
  ideaId: string,
  origin: { x: number; y: number },
  assetIdMap: Record<string, string>,
): { nodes: FlowNode[]; edges: Edge[] } {
  const base = boundingMin(clip.nodes);
  return instantiateNodes(
    clip,
    ideaId,
    (node) => ({
      x: origin.x + (node.position.x - base.x),
      y: origin.y + (node.position.y - base.y),
    }),
    (assetId) => (assetId ? assetIdMap[assetId] ?? assetId : undefined),
  );
}

export function removeNodesAndEdges(
  nodes: FlowNode[],
  edges: Edge[],
  ids: string[],
): { nodes: FlowNode[]; edges: Edge[] } {
  const set = new Set(ids);
  return {
    nodes: nodes.filter((node) => !set.has(node.id)),
    edges: edges.filter((edge) => !set.has(edge.source) && !set.has(edge.target)),
  };
}

function toClipboardNode(node: FlowNode): ClipboardNode {
  return {
    id: node.id,
    type: node.type ?? "note",
    position: { x: node.position.x, y: node.position.y },
    width: node.width ?? node.measured?.width,
    height: node.height ?? node.measured?.height,
    data: { ...node.data },
  };
}

function boundingMin(nodes: { position: { x: number; y: number } }[]): { x: number; y: number } {
  let x = Infinity;
  let y = Infinity;
  for (const node of nodes) {
    if (node.position.x < x) x = node.position.x;
    if (node.position.y < y) y = node.position.y;
  }
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  };
}

function instantiateNodes(
  clip: Pick<CanvasClipboard, "nodes" | "edges">,
  ideaId: string,
  positionOf: (node: ClipboardNode) => { x: number; y: number },
  assetIdOf: (assetId: string | undefined) => string | undefined,
): { nodes: FlowNode[]; edges: Edge[] } {
  const idMap = new Map<string, string>();
  for (const node of clip.nodes) {
    idMap.set(node.id, crypto.randomUUID());
  }
  const nodes: FlowNode[] = clip.nodes.map((node) => {
    const next: FlowNode = {
      id: idMap.get(node.id) ?? crypto.randomUUID(),
      type: node.type,
      position: positionOf(node),
      selected: true,
      data: {
        ideaId,
        title: node.data.title,
        body: node.data.body,
        linkedIdeaId: node.data.linkedIdeaId,
        assetId: assetIdOf(node.data.assetId),
        url: node.data.url,
      },
    };
    if (node.width) {
      next.width = node.width;
      next.style = { width: node.width };
    }
    if (node.height) next.height = node.height;
    return next;
  });
  const edges: Edge[] = [];
  for (const edge of clip.edges) {
    const source = idMap.get(edge.source);
    const target = idMap.get(edge.target);
    if (!source || !target) continue;
    edges.push({
      id: crypto.randomUUID(),
      source,
      target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    });
  }
  return { nodes, edges };
}
