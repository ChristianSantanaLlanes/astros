import { type Node, type NodeProps } from "@xyflow/react";
import { StatusIcon } from "../../icons";
import type { CanvasNodeData } from "./canvasContext";
import { useCanvasRuntime } from "./canvasContext";
import { NodeHandles } from "./NodeHandles";

export function IdeaRefNode({ id: _id, data, selected }: NodeProps<Node<CanvasNodeData, "idea">>) {
  const { ideas, onOpenIdea } = useCanvasRuntime();
  const linked = data.linkedIdeaId ? ideas.find((idea) => idea.id === data.linkedIdeaId) : undefined;
  const identifier = linked?.identifier ?? data.title;
  const title = linked?.title ?? data.body;
  const missing = Boolean(data.linkedIdeaId) && !linked;

  return (
    <div className={`canvas-node canvas-idea${selected ? " selected" : ""}`}>
      <NodeHandles />
      <div className="canvas-idea-head">
        {linked ? <StatusIcon status={linked.status} /> : <span className="canvas-idea-dot" />}
        <span className="ident">{identifier || "IDEA"}</span>
      </div>
      <div className="canvas-idea-title">{missing ? "Idea eliminada" : title || "Sin título"}</div>
      {linked ? (
        <button
          className="canvas-idea-open nodrag nopan"
          type="button"
          onClick={() => onOpenIdea(linked.id)}
        >
          Abrir
        </button>
      ) : null}
    </div>
  );
}
