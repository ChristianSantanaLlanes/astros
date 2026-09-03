import { type Node, type NodeProps } from "@xyflow/react";
import type { CanvasNodeData } from "./canvasContext";
import { useCanvasRuntime } from "./canvasContext";
import { NodeHandles } from "./NodeHandles";

export function NoteNode({ id, data, selected }: NodeProps<Node<CanvasNodeData, "note">>) {
  const { onPatchNode } = useCanvasRuntime();
  return (
    <div className={`canvas-node canvas-note${selected ? " selected" : ""}`}>
      <NodeHandles />
      <input
        className="canvas-node-title nodrag nopan"
        placeholder="Nota"
        aria-label="Título de la nota"
        value={data.title}
        onChange={(e) => onPatchNode(id, { title: e.target.value })}
      />
      <textarea
        className="canvas-node-body nodrag nopan nowheel"
        placeholder="Escribe…"
        aria-label="Cuerpo de la nota"
        value={data.body}
        rows={3}
        onChange={(e) => onPatchNode(id, { body: e.target.value })}
      />
    </div>
  );
}
