import { forwardRef, useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { CheckIcon, Kbd, PriorityIcon } from "../icons";
import { menuPresence, mergeRefs, useMotionPreference } from "../motion";
import { PRIORITIES, type Priority } from "../types";

const MENU_W = 220;
const ITEM_H = 32;
const MENU_PAD = 8;

export const PriorityMenu = forwardRef<
  HTMLDivElement,
  {
    x: number;
    y: number;
    current: Priority;
    onClose: () => void;
    onPick: (priority: Priority) => void;
  }
>(function PriorityMenu({ x, y, current, onClose, onPick }, forwarded) {
  const root = useRef<HTMLDivElement>(null);
  const pos = useMemo(() => {
    const h = PRIORITIES.length * ITEM_H + MENU_PAD;
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
      const byNum = PRIORITIES.find((p) => p.shortcut === e.key);
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
        const id = PRIORITIES[i]?.id;
        if (id !== undefined) onPick(id);
      }
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose, onPick]);

  const reduced = useMotionPreference();
  const presence = menuPresence(reduced);

  return (
    <motion.div
      ref={mergeRefs(root, forwarded)}
      className="menu"
      role="menu"
      aria-label="Cambiar prioridad"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={(e) => e.stopPropagation()}
      initial={presence.initial}
      animate={presence.animate}
      exit={presence.exit}
      transition={presence.transition}
    >
      {PRIORITIES.map((p) => (
        <button
          key={p.id}
          role="menuitemradio"
          aria-checked={p.id === current}
          className={`menu-item${p.id === current ? " active" : ""}`}
          type="button"
          onClick={() => onPick(p.id)}
          onMouseEnter={(e) => e.currentTarget.focus()}
        >
          <span className="menu-tick" aria-hidden>
            {p.id === current ? <CheckIcon /> : null}
          </span>
          <PriorityIcon priority={p.id} />
          {p.label}
          <span className="spacer" />
          <Kbd>{p.shortcut}</Kbd>
        </button>
      ))}
    </motion.div>
  );
});
