import { Handle, Position } from "@xyflow/react";
import { ExpandIcon, GripIcon } from "../../icons";
import { useCanvasRuntime } from "./canvasContext";

const SIDES = [
  { id: "t", position: Position.Top, label: "Conector superior" },
  { id: "r", position: Position.Right, label: "Conector derecho" },
  { id: "b", position: Position.Bottom, label: "Conector inferior" },
  { id: "l", position: Position.Left, label: "Conector izquierdo" },
] as const;

export function NodeHandles({ nodeId }: { nodeId: string }) {
  const { onExpandNode } = useCanvasRuntime();
  return (
    <>
      <div className="canvas-node-chrome">
        <div className="canvas-drag" title="Arrastrar" role="button" aria-label="Arrastrar tarjeta">
          <GripIcon size={20} />
        </div>
        <button
          className="canvas-expand nodrag nopan"
          type="button"
          aria-label="Maximizar"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onExpandNode(nodeId);
          }}
        >
          <ExpandIcon size={14} />
        </button>
      </div>
      {SIDES.map((side) => (
        <Handle
          key={side.id}
          className="canvas-handle"
          type="source"
          position={side.position}
          id={side.id}
          role="button"
          aria-label={side.label}
        >
          <span className="canvas-handle-mark" aria-hidden="true" />
        </Handle>
      ))}
    </>
  );
}
