import { useEffect } from "react";
import { Kbd, StatusIcon } from "../icons";
import { STATUSES, type Status } from "../types";

export function StatusMenu({
  x,
  y,
  current,
  onClose,
  onPick,
}: {
  x: number;
  y: number;
  current: Status;
  onClose: () => void;
  onPick: (status: Status) => void;
}) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [onClose]);
  return (
    <div className="menu" style={{ left: x, top: y }} onMouseDown={(e) => e.stopPropagation()}>
      {STATUSES.map((s) => (
        <button key={s.id} className={`menu-item${s.id === current ? " active" : ""}`} type="button" onClick={() => onPick(s.id)}>
          <StatusIcon status={s.id} />
          {s.label}
          <span className="spacer" />
          <Kbd>{s.shortcut}</Kbd>
        </button>
      ))}
    </div>
  );
}
