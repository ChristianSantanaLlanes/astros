import { useEffect, useMemo, useRef } from "react";
import { CheckIcon, Kbd, StatusIcon } from "../icons";
import { STATUSES, type Status } from "../types";

const MENU_W = 220;
const ITEM_H = 32;
const MENU_PAD = 8;

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
  const root = useRef<HTMLDivElement>(null);
  const pos = useMemo(() => {
    const h = STATUSES.length * ITEM_H + MENU_PAD;
    return {
      left: Math.max(8, Math.min(x, window.innerWidth - MENU_W - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - h - 8)),
    };
  }, [x, y]);

  useEffect(() => {
    const currentBtn = root.current?.querySelector<HTMLButtonElement>(".menu-item.active");
    currentBtn?.focus();
  }, []);

  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const byNum = STATUSES.find((s) => s.shortcut === e.key);
      if (byNum) {
        e.preventDefault();
        e.stopPropagation();
        onPick(byNum.id);
        return;
      }
      const buttons = [...(root.current?.querySelectorAll<HTMLButtonElement>(".menu-item") ?? [])];
      const i = buttons.findIndex((b) => b === document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const start = i < 0 ? (dir === 1 ? -1 : 0) : i;
        const next = buttons[(start + dir + buttons.length) % buttons.length];
        next?.focus();
        return;
      }
      if (e.key === "Enter" && i >= 0) {
        e.preventDefault();
        e.stopPropagation();
        const id = STATUSES[i]?.id;
        if (id) onPick(id);
      }
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose, onPick]);

  return (
    <div
      ref={root}
      className="menu"
      role="menu"
      aria-label="Change status"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {STATUSES.map((s) => (
        <button
          key={s.id}
          role="menuitemradio"
          aria-checked={s.id === current}
          className={`menu-item${s.id === current ? " active" : ""}`}
          type="button"
          onClick={() => onPick(s.id)}
          onMouseEnter={(e) => e.currentTarget.focus()}
        >
          <span className="menu-tick" aria-hidden>
            {s.id === current ? <CheckIcon /> : null}
          </span>
          <StatusIcon status={s.id} outline={s.id === "done" && s.id !== current} />
          {s.label}
          <span className="spacer" />
          <Kbd>{s.shortcut}</Kbd>
        </button>
      ))}
    </div>
  );
}
