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
  type Node,
  type NodeTypes,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getCanvas, putCanvasAsset, replaceCanvas } from "../../db";
import { CloseIcon, ImageIcon, NoteIcon, StatusIcon, VideoIcon, ViewsIcon } from "../../icons";
import type { CanvasEdge, CanvasNode, CanvasNodeType, Idea } from "../../types";
import { CanvasRuntimeContext, type CanvasNodeData } from "./canvasContext";
import { IdeaPicker } from "./IdeaPicker";
import { IdeaRefNode } from "./IdeaRefNode";
import { ImageNode } from "./ImageNode";
import { NoteNode } from "./NoteNode";
import { VideoNode } from "./VideoNode";
import { isHttpUrl } from "./parseMediaUrl";

type FlowNode = Node<CanvasNodeData, CanvasNodeType>;

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

function isAllowedConnection(connection: Connection, edges: Edge[]): boolean {
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
  rememberAssetUrl,
  onOpenIdea,
  onError,
}: {
  idea: Idea;
  ideas: Idea[];
  assetUrls: Record<string, string>;
  rememberAssetUrl: (id: string, url: string) => void;
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
  const fileRef = useRef<HTMLInputElement>(null);
  const fileKind = useRef<"image" | "video">("image");
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const ideaIdRef = useRef(idea.id);
  const persistTimer = useRef<number | null>(null);
  const dirty = useRef(false);

  nodesRef.current = nodes;
  edgesRef.current = edges;
  ideaIdRef.current = idea.id;

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!picker && !urlKind && !mediaMenu) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setPicker(false);
      setUrlKind(null);
      setMediaMenu(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [mediaMenu, picker, urlKind]);

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

  const runtime = useMemo(
    () => ({
      ideas,
      currentIdeaId: idea.id,
      assetUrls,
      onOpenIdea,
      onPatchNode,
    }),
    [assetUrls, idea.id, ideas, onOpenIdea, onPatchNode],
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
      rememberAssetUrl(asset.id, URL.createObjectURL(file));
      addNode(fileKind.current, { assetId: asset.id, title: file.name });
    } catch (error) {
      onError(error instanceof Error ? error.message : "No se pudo añadir el archivo");
    }
  };

  return (
    <CanvasRuntimeContext.Provider value={runtime}>
      <div className="canvas-board">
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
          onPaneClick={() => setMediaMenu(null)}
          isValidConnection={(c) => isAllowedConnection(c, edgesRef.current)}
          onDoubleClick={(e) => {
            const pane = (e.target as HTMLElement).closest(".react-flow__pane");
            if (!pane) return;
            addNode("note", {}, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
          }}
          minZoom={0.25}
          maxZoom={2}
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
  const urlsRef = useRef(assetUrls);
  urlsRef.current = assetUrls;

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    void getCanvas(idea.id).then((graph) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const asset of graph.assets) {
        const url = URL.createObjectURL(asset.blob);
        created.push(url);
        next[asset.id] = url;
      }
      setAssetUrls(next);
    });
    return () => {
      cancelled = true;
      for (const url of Object.values(urlsRef.current)) URL.revokeObjectURL(url);
      setAssetUrls({});
    };
  }, [idea.id]);

  const rememberAssetUrl = useCallback((id: string, url: string) => {
    setAssetUrls((current) => ({ ...current, [id]: url }));
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
          rememberAssetUrl={rememberAssetUrl}
          onOpenIdea={onOpenIdea}
          onError={onError}
        />
      </ReactFlowProvider>
    </div>
  );
}
