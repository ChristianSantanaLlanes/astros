import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  ConnectionMode,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type DefaultEdgeOptions,
  type Edge,
  type NodeTypes,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getCanvas, putCanvasAsset, replaceCanvas } from "../../db";
import { isTypingTarget } from "../../format";
import { CloseIcon, ImageIcon, NoteIcon, StatusIcon, VideoIcon, ViewsIcon } from "../../icons";
import type { CanvasEdge, CanvasNode, CanvasNodeType, Idea } from "../../types";
import {
  clearNodeSelection,
  cloneSelection,
  instantiateClipboard,
  removeNodesAndEdges,
  selectOnly,
  selectedNodeIds,
  snapshotSelection,
  type CanvasClipboard,
  type FlowNode,
} from "./canvasClipboard";
import { CanvasRuntimeContext, type CanvasNodeData } from "./canvasContext";
import { IdeaPicker } from "./IdeaPicker";
import { IdeaRefNode } from "./IdeaRefNode";
import { ImageNode } from "./ImageNode";
import { NoteNode } from "./NoteNode";
import { NodeContextMenu } from "./NodeContextMenu";
import { VideoNode } from "./VideoNode";
import { NodeModal, type OriginRect } from "./NodeModal";
import { isHttpUrl } from "./parseMediaUrl";

type ContextMenu =
  | { kind: "node"; x: number; y: number; ids: string[] }
  | { kind: "pane"; x: number; y: number; flow: { x: number; y: number } };

const nodeTypes = {
  note: NoteNode,
  idea: IdeaRefNode,
  image: ImageNode,
  video: VideoNode,
} satisfies NodeTypes;

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "default",
  style: { stroke: "#5e6ad2", strokeWidth: 1.6 },
};

function toFlowNodes(nodes: CanvasNode[]): FlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: { x: node.x, y: node.y },
    data: {
      ideaId: node.ideaId,
      title: node.title,
      body: node.body,
      linkedIdeaId: node.linkedIdeaId,
      assetId: node.assetId,
      url: node.url,
    },
    ...(node.width ? { width: node.width, style: { width: node.width } } : {}),
  }));
}

function toCanvasNodes(ideaId: string, nodes: FlowNode[]): CanvasNode[] {
  return nodes.map((node) => ({
    id: node.id,
    ideaId,
    type: node.type ?? "note",
    x: node.position.x,
    y: node.position.y,
    width: node.width,
    height: node.height,
    title: node.data.title,
    body: node.data.body,
    linkedIdeaId: node.data.linkedIdeaId,
    assetId: node.data.assetId,
    url: node.data.url,
  }));
}

function toCanvasEdges(ideaId: string, edges: Edge[]): CanvasEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    ideaId,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
  }));
}

function samePorts(a: Connection | Edge, b: Connection | Edge): boolean {
  const aFrom = `${a.source}:${a.sourceHandle ?? ""}`;
  const aTo = `${a.target}:${a.targetHandle ?? ""}`;
  const bFrom = `${b.source}:${b.sourceHandle ?? ""}`;
  const bTo = `${b.target}:${b.targetHandle ?? ""}`;
  return (aFrom === bFrom && aTo === bTo) || (aFrom === bTo && aTo === bFrom);
}

function isAllowedConnection(connection: Connection | Edge, edges: Edge[]): boolean {
  if (!connection.source || !connection.target) return false;
  if (connection.source === connection.target) return false;
  return !edges.some((edge) => samePorts(edge, connection));
}

function UrlDialog({
  kind,
  onClose,
  onSubmit,
}: {
  kind: "image" | "video";
  onClose: () => void;
  onSubmit: (url: string) => void;
}) {
  const [value, setValue] = useState("");
  const valid = isHttpUrl(value);
  return (
    <div className="overlay canvas-picker-overlay" onMouseDown={onClose}>
      <form
        className="palette canvas-url-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSubmit(value.trim());
        }}
      >
        <label className="canvas-url-label" htmlFor="canvas-media-url">
          {kind === "image" ? "URL de la imagen" : "URL del vídeo"}
        </label>
        <input
          id="canvas-media-url"
          autoFocus
          className="palette-input"
          placeholder={kind === "image" ? "https://…" : "YouTube, Vimeo o un archivo…"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="canvas-url-actions">
          <button className="chip" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" type="submit" disabled={!valid}>
            Añadir
          </button>
        </div>
      </form>
    </div>
  );
}

function CanvasBoard({
  idea,
  ideas,
  assetUrls,
  assetBlobs,
  rememberAsset,
  onOpenIdea,
  onError,
}: {
  idea: Idea;
  ideas: Idea[];
  assetUrls: Record<string, string>;
  assetBlobs: Record<string, Blob>;
  rememberAsset: (id: string, blob: Blob, url: string) => void;
  onOpenIdea: (id: string) => void;
  onError: (message: string) => void;
}) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [ready, setReady] = useState(false);
  const [picker, setPicker] = useState(false);
  const [mediaMenu, setMediaMenu] = useState<"image" | "video" | null>(null);
  const [urlKind, setUrlKind] = useState<"image" | "video" | null>(null);
  const [expanded, setExpanded] = useState<{ id: string; origin: OriginRect } | null>(null);
  const [clipboard, setClipboard] = useState<CanvasClipboard | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileKind = useRef<"image" | "video">("image");
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const ideaIdRef = useRef(idea.id);
  const blobsRef = useRef(assetBlobs);
  const clipboardRef = useRef(clipboard);
  const lastFlowPoint = useRef({ x: 120, y: 80 });
  const lastPaneClick = useRef({ t: 0, x: 0, y: 0 });
  const persistTimer = useRef<number | null>(null);
  const dirty = useRef(false);

  nodesRef.current = nodes;
  edgesRef.current = edges;
  ideaIdRef.current = idea.id;
  blobsRef.current = assetBlobs;
  clipboardRef.current = clipboard;

  const flush = useCallback(() => {
    const id = ideaIdRef.current;
    void replaceCanvas(id, toCanvasNodes(id, nodesRef.current), toCanvasEdges(id, edgesRef.current));
  }, []);

  const schedulePersist = useCallback(() => {
    dirty.current = true;
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      persistTimer.current = null;
      flush();
    }, 300);
  }, [flush]);

  useEffect(() => {
    let cancelled = false;
    const loadedId = idea.id;
    setReady(false);
    void getCanvas(loadedId).then((graph) => {
      if (cancelled) return;
      setNodes(toFlowNodes(graph.nodes));
      setEdges(
        graph.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        })),
      );
      setReady(true);
      if (graph.nodes.length > 0) {
        requestAnimationFrame(() => fitView({ padding: 0.18 }));
      }
    });
    return () => {
      cancelled = true;
      if (persistTimer.current) {
        window.clearTimeout(persistTimer.current);
        persistTimer.current = null;
      }
      if (dirty.current) {
        dirty.current = false;
        void replaceCanvas(loadedId, toCanvasNodes(loadedId, nodesRef.current), toCanvasEdges(loadedId, edgesRef.current));
      }
    };
  }, [fitView, idea.id, setEdges, setNodes]);

  const center = useCallback(() => {
    const pane = document.querySelector(".canvas-board .react-flow");
    const rect = pane?.getBoundingClientRect();
    const origin = rect
      ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : { x: 120, y: 80 };
    const n = nodesRef.current.length;
    return { x: origin.x - 120 + (n % 3) * 260, y: origin.y - 80 + Math.floor(n / 3) * 180 };
  }, [screenToFlowPosition]);

  const addNode = useCallback(
    (type: CanvasNodeType, extra: Partial<CanvasNodeData> = {}, position?: { x: number; y: number }) => {
      const pos = position ?? center();
      const node: FlowNode = {
        id: crypto.randomUUID(),
        type,
        position: pos,
        data: {
          ideaId: idea.id,
          title: extra.title ?? "",
          body: extra.body ?? "",
          linkedIdeaId: extra.linkedIdeaId,
          assetId: extra.assetId,
          url: extra.url,
        },
      };
      setNodes((current) => [...current, node]);
      schedulePersist();
      return node;
    },
    [center, idea.id, schedulePersist, setNodes],
  );

  const onPatchNode = useCallback(
    (id: string, patch: Partial<CanvasNodeData>) => {
      setNodes((current) =>
        current.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)),
      );
      schedulePersist();
    },
    [schedulePersist, setNodes],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => {
        if (!isAllowedConnection(connection, current)) return current;
        schedulePersist();
        return addEdge({ ...connection, id: crypto.randomUUID() }, current);
      });
    },
    [schedulePersist, setEdges],
  );

  const onExpandNode = useCallback((id: string) => {
    const el = document.querySelector(`.canvas-board .react-flow__node[data-id="${CSS.escape(id)}"]`);
    const rect = el?.getBoundingClientRect();
    setExpanded({
      id,
      origin: rect
        ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
        : { top: 96, left: 96, width: 240, height: 160 },
    });
    setMediaMenu(null);
  }, []);

  const closeOverlays = useCallback(() => {
    setContextMenu(null);
    setMediaMenu(null);
  }, []);

  const idsForAction = useCallback((explicit?: string[]) => {
    if (explicit && explicit.length > 0) return explicit;
    return selectedNodeIds(nodesRef.current);
  }, []);

  const copyIds = useCallback((ids: string[]) => {
    const clip = snapshotSelection(nodesRef.current, edgesRef.current, ids, blobsRef.current);
    if (!clip) return false;
    setClipboard(clip);
    return true;
  }, []);

  const deleteIds = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      if (expanded && ids.includes(expanded.id)) setExpanded(null);
      const next = removeNodesAndEdges(nodesRef.current, edgesRef.current, ids);
      setNodes(next.nodes);
      setEdges(next.edges);
      schedulePersist();
    },
    [expanded, schedulePersist, setEdges, setNodes],
  );

  const cloneIds = useCallback(
    (ids: string[]) => {
      const duplicated = cloneSelection(nodesRef.current, edgesRef.current, ids, idea.id);
      if (!duplicated) return;
      setNodes([...clearNodeSelection(nodesRef.current), ...duplicated.nodes]);
      setEdges([...edgesRef.current, ...duplicated.edges]);
      schedulePersist();
    },
    [idea.id, schedulePersist, setEdges, setNodes],
  );

  const pasteAt = useCallback(
    async (origin: { x: number; y: number }) => {
      const clip = clipboardRef.current;
      if (!clip) return;
      const assetIdMap: Record<string, string> = {};
      for (const asset of clip.assets) {
        try {
          const stored = await putCanvasAsset(idea.id, asset.blob);
          rememberAsset(stored.id, asset.blob, URL.createObjectURL(asset.blob));
          assetIdMap[asset.oldId] = stored.id;
        } catch (error) {
          onError(error instanceof Error ? error.message : "No se pudo pegar el archivo");
          return;
        }
      }
      const next = instantiateClipboard(clip, idea.id, origin, assetIdMap);
      setNodes([...clearNodeSelection(nodesRef.current), ...next.nodes]);
      setEdges([...edgesRef.current, ...next.edges]);
      schedulePersist();
    },
    [idea.id, onError, rememberAsset, schedulePersist, setEdges, setNodes],
  );

  const onCopy = useCallback(() => {
    copyIds(idsForAction(contextMenu?.kind === "node" ? contextMenu.ids : undefined));
    setContextMenu(null);
  }, [contextMenu, copyIds, idsForAction]);

  const onCut = useCallback(() => {
    const ids = idsForAction(contextMenu?.kind === "node" ? contextMenu.ids : undefined);
    if (!copyIds(ids)) return;
    deleteIds(ids);
    setContextMenu(null);
  }, [contextMenu, copyIds, deleteIds, idsForAction]);

  const onClone = useCallback(() => {
    cloneIds(idsForAction(contextMenu?.kind === "node" ? contextMenu.ids : undefined));
    setContextMenu(null);
  }, [cloneIds, contextMenu, idsForAction]);

  const onDelete = useCallback(() => {
    deleteIds(idsForAction(contextMenu?.kind === "node" ? contextMenu.ids : undefined));
    setContextMenu(null);
  }, [contextMenu, deleteIds, idsForAction]);

  const onPaste = useCallback(() => {
    const origin = contextMenu?.kind === "pane" ? contextMenu.flow : lastFlowPoint.current;
    void pasteAt(origin);
    setContextMenu(null);
  }, [contextMenu, pasteAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.code === "Space") {
        if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat && !picker && !urlKind && !mediaMenu && !expanded && !contextMenu && !isTypingTarget(e.target)) {
          e.preventDefault();
          e.stopPropagation();
          addNode("note", {}, lastFlowPoint.current);
          return;
        }
      }
      if (e.key === "Escape") {
        if (contextMenu) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setContextMenu(null);
          return;
        }
        if (expanded) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setExpanded(null);
          return;
        }
        if (!picker && !urlKind && !mediaMenu) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        setPicker(false);
        setUrlKind(null);
        setMediaMenu(null);
        return;
      }

      const meta = e.metaKey || e.ctrlKey;
      if (!meta || e.repeat || e.altKey) return;
      if (picker || urlKind || mediaMenu || expanded) return;
      if (isTypingTarget(e.target)) return;
      const letter = e.key.toLowerCase();
      if (letter === "c") {
        e.preventDefault();
        copyIds(idsForAction());
        return;
      }
      if (letter === "x") {
        e.preventDefault();
        const ids = idsForAction();
        if (!copyIds(ids)) return;
        deleteIds(ids);
        return;
      }
      if (letter === "v") {
        e.preventDefault();
        void pasteAt(lastFlowPoint.current);
        return;
      }
      if (letter === "d") {
        e.preventDefault();
        cloneIds(idsForAction());
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [addNode, cloneIds, contextMenu, copyIds, deleteIds, expanded, idsForAction, mediaMenu, pasteAt, picker, urlKind]);

  const runtime = useMemo(
    () => ({
      ideas,
      currentIdeaId: idea.id,
      expandedId: expanded?.id ?? null,
      assetUrls,
      onOpenIdea,
      onPatchNode,
      onExpandNode,
    }),
    [assetUrls, expanded?.id, idea.id, ideas, onExpandNode, onOpenIdea, onPatchNode],
  );

  const pickFile = (kind: "image" | "video") => {
    fileKind.current = kind;
    setMediaMenu(null);
    const input = fileRef.current;
    if (!input) return;
    input.accept = kind === "video" ? "video/*,.mp4,.webm,.mov" : "image/*";
    input.click();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const asset = await putCanvasAsset(idea.id, file);
      rememberAsset(asset.id, file, URL.createObjectURL(file));
      addNode(fileKind.current, { assetId: asset.id, title: file.name });
    } catch (error) {
      onError(error instanceof Error ? error.message : "No se pudo añadir el archivo");
    }
  };

  const expandedNode = expanded ? (nodes.find((node) => node.id === expanded.id) ?? null) : null;

  return (
    <CanvasRuntimeContext.Provider value={runtime}>
      <div
        className="canvas-board"
        onPointerMove={(e) => {
          lastFlowPoint.current = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={(changes) => {
            onNodesChange(changes);
            if (changes.some((change) => change.type !== "select" && change.type !== "dimensions")) {
              schedulePersist();
            }
          }}
          onEdgesChange={(changes) => {
            onEdgesChange(changes);
            if (changes.some((change) => change.type !== "select")) schedulePersist();
          }}
          connectionMode={ConnectionMode.Loose}
          onConnect={onConnect}
          onPaneClick={(e) => {
            closeOverlays();
            const now = performance.now();
            const prev = lastPaneClick.current;
            const dt = now - prev.t;
            const dist = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
            lastPaneClick.current = { t: now, x: e.clientX, y: e.clientY };
            const isDouble = dt > 0 && dt < 400 && dist < 12;
            if (!isDouble) return;
            addNode("note", {}, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
          }}
          onNodeContextMenu={(e, node) => {
            e.preventDefault();
            const selected = selectedNodeIds(nodesRef.current);
            const ids = selected.includes(node.id) ? selected : [node.id];
            if (!selected.includes(node.id)) {
              setNodes(selectOnly(nodesRef.current, [node.id]));
            }
            setContextMenu({ kind: "node", x: e.clientX, y: e.clientY, ids });
            setMediaMenu(null);
          }}
          onPaneContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({
              kind: "pane",
              x: e.clientX,
              y: e.clientY,
              flow: screenToFlowPosition({ x: e.clientX, y: e.clientY }),
            });
            setMediaMenu(null);
          }}
          isValidConnection={(c) => isAllowedConnection(c, edgesRef.current)}
          minZoom={0.25}
          maxZoom={2}
          zoomOnDoubleClick={false}
          panActivationKeyCode={null}
          deleteKeyCode={["Backspace", "Delete"]}
          colorMode="dark"
          panOnScroll
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(255,255,255,0.06)" />
          <Controls position="top-left" showInteractive={false} />
        </ReactFlow>

        {ready && nodes.length === 0 ? (
          <p className="canvas-empty">Doble clic o usa la barra para añadir nodos</p>
        ) : null}

        <div className="canvas-toolbar" role="toolbar" aria-label="Añadir nodos">
          <button className="canvas-tool" type="button" onClick={() => addNode("note")} aria-label="Nota">
            <NoteIcon size={14} />
            Nota
          </button>
          <button className="canvas-tool" type="button" onClick={() => setPicker(true)} aria-label="Idea">
            <ViewsIcon size={14} />
            Idea
          </button>
          <div className="canvas-tool-wrap">
            <button
              className={`canvas-tool${mediaMenu === "image" ? " active" : ""}`}
              type="button"
              onClick={() => setMediaMenu((current) => (current === "image" ? null : "image"))}
              aria-label="Imagen"
            >
              <ImageIcon size={14} />
              Imagen
            </button>
            {mediaMenu === "image" ? (
              <div className="canvas-pop">
                <button type="button" onClick={() => pickFile("image")}>
                  Subir archivo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaMenu(null);
                    setUrlKind("image");
                  }}
                >
                  Pegar URL
                </button>
              </div>
            ) : null}
          </div>
          <div className="canvas-tool-wrap">
            <button
              className={`canvas-tool${mediaMenu === "video" ? " active" : ""}`}
              type="button"
              onClick={() => setMediaMenu((current) => (current === "video" ? null : "video"))}
              aria-label="Vídeo"
            >
              <VideoIcon size={14} />
              Vídeo
            </button>
            {mediaMenu === "video" ? (
              <div className="canvas-pop">
                <button type="button" onClick={() => pickFile("video")}>
                  Subir archivo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaMenu(null);
                    setUrlKind("video");
                  }}
                >
                  Pegar URL
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <input
          ref={fileRef}
          className="canvas-file"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void onFile(file);
          }}
        />
        {contextMenu ? (
          <NodeContextMenu
            kind={contextMenu.kind}
            x={contextMenu.x}
            y={contextMenu.y}
            canPaste={clipboard !== null}
            onClose={() => setContextMenu(null)}
            onCopy={onCopy}
            onCut={onCut}
            onClone={onClone}
            onDelete={onDelete}
            onPaste={onPaste}
          />
        ) : null}
      </div>

      {picker ? (
        <IdeaPicker
          ideas={ideas}
          excludeId={idea.id}
          onClose={() => setPicker(false)}
          onPick={(picked) => {
            addNode("idea", {
              linkedIdeaId: picked.id,
              title: picked.identifier,
              body: picked.title,
            });
            setPicker(false);
          }}
        />
      ) : null}
      {urlKind ? (
        <UrlDialog
          kind={urlKind}
          onClose={() => setUrlKind(null)}
          onSubmit={(url) => {
            addNode(urlKind, { url });
            setUrlKind(null);
          }}
        />
      ) : null}
      {expanded && expandedNode ? (
        <div className="canvas-node-modal-layer">
          <NodeModal key={expanded.id} node={expandedNode} origin={expanded.origin} onClose={() => setExpanded(null)} />
        </div>
      ) : null}
    </CanvasRuntimeContext.Provider>
  );
}

export function IdeaCanvas({
  idea,
  ideas,
  onClose,
  onOpenIdea,
  onError,
}: {
  idea: Idea;
  ideas: Idea[];
  onClose: () => void;
  onOpenIdea: (id: string) => void;
  onError: (message: string) => void;
}) {
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [assetBlobs, setAssetBlobs] = useState<Record<string, Blob>>({});
  const urlsRef = useRef(assetUrls);
  urlsRef.current = assetUrls;

  useEffect(() => {
    let cancelled = false;
    void getCanvas(idea.id).then((graph) => {
      if (cancelled) return;
      const nextUrls: Record<string, string> = {};
      const nextBlobs: Record<string, Blob> = {};
      for (const asset of graph.assets) {
        const url = URL.createObjectURL(asset.blob);
        nextUrls[asset.id] = url;
        nextBlobs[asset.id] = asset.blob;
      }
      setAssetUrls(nextUrls);
      setAssetBlobs(nextBlobs);
    });
    return () => {
      cancelled = true;
      for (const url of Object.values(urlsRef.current)) URL.revokeObjectURL(url);
      setAssetUrls({});
      setAssetBlobs({});
    };
  }, [idea.id]);

  const rememberAsset = useCallback((id: string, blob: Blob, url: string) => {
    setAssetUrls((current) => ({ ...current, [id]: url }));
    setAssetBlobs((current) => ({ ...current, [id]: blob }));
  }, []);

  return (
    <div className="canvas-overlay" role="dialog" aria-modal="true" aria-label={`Estructura de ${idea.title}`}>
      <header className="canvas-head">
        <button className="chip" type="button" onClick={onClose}>
          Detalle
        </button>
        <StatusIcon status={idea.status} />
        <span className="ident">{idea.identifier}</span>
        <span className="canvas-head-title">{idea.title}</span>
        <span className="spacer" />
        <button className="icon-btn" type="button" onClick={onClose} aria-label="Cerrar canvas">
          <CloseIcon />
        </button>
      </header>
      <ReactFlowProvider>
        <CanvasBoard
          idea={idea}
          ideas={ideas}
          assetUrls={assetUrls}
          assetBlobs={assetBlobs}
          rememberAsset={rememberAsset}
          onOpenIdea={onOpenIdea}
          onError={onError}
        />
      </ReactFlowProvider>
    </div>
  );
}
