import { Handle, Position } from "@xyflow/react";
import { GripIcon } from "../../icons";

const SIDES = [
  { id: "t", position: Position.Top, label: "Conector superior" },
  { id: "r", position: Position.Right, label: "Conector derecho" },
  { id: "b", position: Position.Bottom, label: "Conector inferior" },
  { id: "l", position: Position.Left, label: "Conector izquierdo" },
] as const;

export function NodeHandles() {
  return (
    <>
      <div className="canvas-drag" title="Arrastrar" role="button" aria-label="Arrastrar tarjeta">
        <GripIcon size={20} />
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
