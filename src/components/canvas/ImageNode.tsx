import { type Node, type NodeProps } from "@xyflow/react";
import type { CanvasNodeData } from "./canvasContext";
import { useCanvasRuntime } from "./canvasContext";
import { NodeHandles } from "./NodeHandles";

export function ImageNode({ id, data, selected }: NodeProps<Node<CanvasNodeData, "image">>) {
  const { assetUrls, onPatchNode } = useCanvasRuntime();
  const src = (data.assetId ? assetUrls[data.assetId] : undefined) ?? data.url;
  return (
    <div className={`canvas-node canvas-media${selected ? " selected" : ""}`}>
      <NodeHandles />
      {src ? (
        <img className="canvas-media-img nodrag nopan" src={src} alt={data.title || "Imagen"} />
      ) : (
        <div className="canvas-media-empty">Sin imagen</div>
      )}
      <input
        className="canvas-node-caption nodrag nopan"
        placeholder="Pie de foto"
        aria-label="Pie de foto"
        value={data.title}
        onChange={(e) => onPatchNode(id, { title: e.target.value })}
      />
    </div>
  );
}
