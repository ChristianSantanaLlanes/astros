import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Kbd } from "../../icons";
import { menuPresence, useMotionPreference } from "../../motion";

const MENU_W = 220;
const ITEM_H = 32;
const MENU_PAD = 8;
const SEP_H = 9;

export type NodeMenuKind = "node" | "pane";

function isMacPlatform(): boolean {
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

function modChord(key: string): string {
  return isMacPlatform() ? `⌘${key}` : `Ctrl+${key}`;
}

function deleteChord(): string {
  return isMacPlatform() ? "⌫" : "Del";
}

export function NodeContextMenu({
  kind,
  x,
  y,
  canPaste,
  onClose,
  onCopy,
  onCut,
  onClone,
  onDelete,
  onPaste,
}: {
  kind: NodeMenuKind;
  x: number;
  y: number;
  canPaste: boolean;
  onClose: () => void;
  onCopy: () => void;
  onCut: () => void;
  onClone: () => void;
  onDelete: () => void;
  onPaste: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const itemCount = kind === "pane" ? 1 : 4;
  const height = itemCount * ITEM_H + MENU_PAD + (kind === "node" ? SEP_H : 0);
  const pos = useMemo(
    () => ({
      left: Math.max(8, Math.min(x, window.innerWidth - MENU_W - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    }),
    [height, x, y],
  );

  useEffect(() => {
    const first = root.current?.querySelector<HTMLButtonElement>(".menu-item:not(:disabled)");
    (first ?? root.current)?.focus();
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
      const buttons = [...(root.current?.querySelectorAll<HTMLButtonElement>(".menu-item:not(:disabled)") ?? [])];
      const i = buttons.findIndex((button) => button === document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        if (buttons.length === 0) return;
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const start = i < 0 ? (dir === 1 ? -1 : 0) : i;
        const next = buttons[(start + dir + buttons.length) % buttons.length];
        next?.focus();
        return;
      }
      if (e.key === "Enter" && i >= 0) {
        e.preventDefault();
        e.stopPropagation();
        buttons[i]?.click();
      }
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  const reduced = useMotionPreference();
  const presence = menuPresence(reduced);

  return createPortal(
    <motion.div
      ref={root}
      className="menu canvas-context-menu"
      role="menu"
      tabIndex={-1}
      aria-label={kind === "pane" ? "Menú del lienzo" : "Menú del nodo"}
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={(e) => e.stopPropagation()}
      initial={presence.initial}
      animate={presence.animate}
      exit={presence.exit}
      transition={presence.transition}
    >
      {kind === "pane" ? (
        <MenuItem label="Pegar" shortcut={modChord("V")} disabled={!canPaste} onPick={onPaste} />
      ) : (
        <>
          <MenuItem label="Copiar" shortcut={modChord("C")} onPick={onCopy} />
          <MenuItem label="Cortar" shortcut={modChord("X")} onPick={onCut} />
          <MenuItem label="Clonar" shortcut={modChord("D")} onPick={onClone} />
          <div className="menu-sep" role="separator" />
          <MenuItem label="Eliminar" shortcut={deleteChord()} danger onPick={onDelete} />
        </>
      )}
    </motion.div>,
    document.body,
  );
}

function MenuItem({
  label,
  shortcut,
  disabled,
  danger,
  onPick,
}: {
  label: string;
  shortcut: string;
  disabled?: boolean;
  danger?: boolean;
  onPick: () => void;
}) {
  return (
    <button
      role="menuitem"
      className={`menu-item${danger ? " danger" : ""}`}
      type="button"
      disabled={disabled}
      onClick={onPick}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.focus();
      }}
    >
      {label}
      <span className="spacer" />
      <Kbd>{shortcut}</Kbd>
    </button>
  );
}
