import { useEffect, useMemo, useRef } from "react";
import { CheckIcon } from "../icons";
import { OWNERS } from "../owners";

const MENU_W = 220;
const ITEM_H = 32;
const MENU_PAD = 8;

export function AssigneeMenu({
  x,
  y,
  current,
  onClose,
  onPick,
}: {
  x: number;
  y: number;
  current: string;
  onClose: () => void;
  onPick: (name: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const pos = useMemo(() => {
    const h = OWNERS.length * ITEM_H + MENU_PAD;
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
        const name = OWNERS[i]?.name;
        if (name) onPick(name);
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
      aria-label="Change assignee"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {OWNERS.map((owner) => (
        <button
          key={owner.name}
          role="menuitemradio"
          aria-checked={owner.name === current}
          className={`menu-item${owner.name === current ? " active" : ""}`}
          type="button"
          onClick={() => onPick(owner.name)}
          onMouseEnter={(e) => e.currentTarget.focus()}
        >
          <span className="menu-tick" aria-hidden>
            {owner.name === current ? <CheckIcon /> : null}
          </span>
          <span className="owner" style={{ background: owner.color }}>
            {owner.initials}
          </span>
          {owner.name}
        </button>
      ))}
    </div>
  );
}
