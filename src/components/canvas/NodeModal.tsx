import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { type Node } from "@xyflow/react";
import { CollapseIcon, StatusIcon } from "../../icons";
import { useMotionPreference } from "../../motion";
import type { CanvasNodeType } from "../../types";
import { useCanvasRuntime, type CanvasNodeData } from "./canvasContext";
import { parseVideoUrl } from "./parseMediaUrl";

export type OriginRect = { top: number; left: number; width: number; height: number };

type FlowNode = Node<CanvasNodeData, CanvasNodeType>;

function modalDest(): OriginRect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const compact = vw <= 860;
  const width = compact ? Math.max(280, vw - 20) : Math.min(720, vw - 48);
  const height = compact ? Math.max(320, vh - 24) : Math.min(vh * 0.82, 680);
  return { width, height, left: (vw - width) / 2, top: (vh - height) / 2 };
}

function flipFrom(origin: OriginRect, dest: OriginRect) {
  return {
    x: origin.left - dest.left,
    y: origin.top - dest.top,
    scaleX: dest.width === 0 ? 1 : origin.width / dest.width,
    scaleY: dest.height === 0 ? 1 : origin.height / dest.height,
  };
}

export function NodeModal({
  node,
  origin,
  onClose,
}: {
  node: FlowNode;
  origin: OriginRect;
  onClose: () => void;
}) {
  const reduced = useMotionPreference();
  const dest = useMemo(() => modalDest(), []);
  const from = useMemo(
    () => flipFrom(origin, dest),
    [dest, origin.height, origin.left, origin.top, origin.width],
  );
  const cardStyle = useMemo(
    () =>
      ({
        top: dest.top,
        left: dest.left,
        width: dest.width,
        height: dest.height,
        ["--flip-from"]: `translate(${from.x}px, ${from.y}px) scale(${from.scaleX}, ${from.scaleY})`,
      }) as CSSProperties,
    [dest, from],
  );
  const [closing, setClosing] = useState(false);
  const [backdropArmed, setBackdropArmed] = useState(false);

  const close = useCallback(() => {
    if (closing) return;
    if (reduced) {
      onClose();
      return;
    }
    setClosing(true);
  }, [closing, onClose, reduced]);

  useEffect(() => {
    const id = window.setTimeout(() => setBackdropArmed(true), 250);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!closing) return;
    const id = window.setTimeout(onClose, 500);
    return () => window.clearTimeout(id);
  }, [closing, onClose]);

  return (
    <>
      <button
        type="button"
        className="canvas-node-modal-backdrop"
        aria-label="Cerrar nodo"
        tabIndex={backdropArmed ? 0 : -1}
        style={{ pointerEvents: backdropArmed ? "auto" : "none" }}
        onClick={close}
      />
      <div
        className={`canvas-node-modal${closing ? " is-closing" : ""}${reduced ? " is-static" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Nodo maximizado"
        onAnimationEnd={(e) => {
          if (e.target !== e.currentTarget) return;
          if (closing) onClose();
        }}
        style={cardStyle}
      >
        <div className="canvas-node-modal-bar">
          <span className="canvas-node-modal-kind">{kindLabel(node.type)}</span>
          <button className="canvas-expand" type="button" aria-label="Minimizar" onClick={close}>
            <CollapseIcon size={14} />
          </button>
        </div>
        <div className="canvas-node-modal-body">
          <NodeModalBody node={node} />
        </div>
      </div>
    </>
  );
}

function kindLabel(type: CanvasNodeType | undefined): string {
  if (type === "idea") return "Idea";
  if (type === "image") return "Imagen";
  if (type === "video") return "Vídeo";
  return "Nota";
}

function NodeModalBody({ node }: { node: FlowNode }) {
  const { ideas, assetUrls, onOpenIdea, onPatchNode } = useCanvasRuntime();
  const type = node.type ?? "note";
  const data = node.data;

  if (type === "note") {
    return (
      <>
        <input
          className="canvas-node-title"
          placeholder="Nota"
          aria-label="Título de la nota"
          value={data.title}
          onChange={(e) => onPatchNode(node.id, { title: e.target.value })}
        />
        <textarea
          className="canvas-node-body canvas-node-modal-text"
          placeholder="Escribe…"
          aria-label="Cuerpo de la nota"
          value={data.body}
          onChange={(e) => onPatchNode(node.id, { body: e.target.value })}
        />
      </>
    );
  }

  if (type === "idea") {
    const linked = data.linkedIdeaId ? ideas.find((idea) => idea.id === data.linkedIdeaId) : undefined;
    const identifier = linked?.identifier ?? data.title;
    const title = linked?.title ?? data.body;
    const missing = Boolean(data.linkedIdeaId) && !linked;
    return (
      <>
        <div className="canvas-idea-head">
          {linked ? <StatusIcon status={linked.status} /> : <span className="canvas-idea-dot" />}
          <span className="ident">{identifier || "IDEA"}</span>
        </div>
        <div className="canvas-idea-title canvas-node-modal-idea-title">
          {missing ? "Idea eliminada" : title || "Sin título"}
        </div>
        {linked?.description ? <p className="canvas-node-modal-desc">{linked.description}</p> : null}
        {linked ? (
          <button className="canvas-idea-open" type="button" onClick={() => onOpenIdea(linked.id)}>
            Abrir
          </button>
        ) : null}
      </>
    );
  }

  if (type === "image") {
    const src = (data.assetId ? assetUrls[data.assetId] : undefined) ?? data.url;
    return (
      <>
        {src ? (
          <img className="canvas-media-img canvas-node-modal-media" src={src} alt={data.title || "Imagen"} />
        ) : (
          <div className="canvas-media-empty">Sin imagen</div>
        )}
        <input
          className="canvas-node-caption"
          placeholder="Pie de foto"
          aria-label="Pie de foto"
          value={data.title}
          onChange={(e) => onPatchNode(node.id, { title: e.target.value })}
        />
      </>
    );
  }

  const blobUrl = data.assetId ? assetUrls[data.assetId] : undefined;
  const parsed = !blobUrl && data.url ? parseVideoUrl(data.url) : null;
  const embed = parsed && parsed.kind !== "file" ? parsed : null;
  const fileSrc = blobUrl ?? (parsed?.kind === "file" ? parsed.src : undefined);
  return (
    <>
      {embed ? (
        <iframe
          className="canvas-media-frame canvas-node-modal-media"
          src={embed.src}
          title={data.title || "Vídeo"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : fileSrc ? (
        <video className="canvas-media-video canvas-node-modal-media" src={fileSrc} controls playsInline />
      ) : (
        <div className="canvas-media-empty">Sin vídeo</div>
      )}
      <input
        className="canvas-node-caption"
        placeholder="Pie de vídeo"
        aria-label="Pie de vídeo"
        value={data.title}
        onChange={(e) => onPatchNode(node.id, { title: e.target.value })}
      />
    </>
  );
}
