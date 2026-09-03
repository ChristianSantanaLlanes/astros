import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { isTypingTarget } from "../format";
import { CheckIcon, PencilIcon, TrashIcon } from "../icons";
import { menuPresence, mergeRefs, useMotionPreference } from "../motion";
import { LABEL_PALETTE, type Label } from "../types";

const MENU_W = 268;
const ITEM_H = 32;
const CREATE_H = 40;
const EDIT_EXTRA = 28;
const MENU_PAD = 8;

export const LabelMenu = forwardRef<
  HTMLDivElement,
  {
    x: number;
    y: number;
    labels: Label[];
    selected: string[];
    onClose: () => void;
    onToggle: (id: string) => void;
    onCreate: (name: string) => Promise<void> | void;
    onRename: (id: string, name: string) => Promise<void> | void;
    onRecolor: (id: string, color: string) => Promise<void> | void;
    onDelete: (id: string) => Promise<void> | void;
  }
>(function LabelMenu(
  { x, y, labels, selected, onClose, onToggle, onCreate, onRename, onRecolor, onDelete },
  forwarded,
) {
  const root = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const pos = useMemo(() => {
    const extra = editingId ? EDIT_EXTRA : 0;
    const h = labels.length * ITEM_H + CREATE_H + extra + MENU_PAD + (error ? 22 : 0);
    return {
      left: Math.max(8, Math.min(x, window.innerWidth - MENU_W - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - h - 8)),
    };
  }, [editingId, error, labels.length, x, y]);

  useEffect(() => {
    const first = root.current?.querySelector<HTMLButtonElement>(".menu-item");
    first?.focus();
  }, []);

  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (editingId) {
          setEditingId(null);
          setError(null);
          return;
        }
        onClose();
        return;
      }
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const buttons = [...(root.current?.querySelectorAll<HTMLButtonElement>(".label-menu-pick") ?? [])];
      const i = buttons.findIndex((b) => b === document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const start = i < 0 ? (dir === 1 ? -1 : 0) : i;
        const next = buttons[(start + dir + buttons.length) % buttons.length];
        next?.focus();
      }
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [editingId, onClose]);

  const submitCreate = async () => {
    const name = draft.trim();
    if (!name) return;
    try {
      setError(null);
      await onCreate(name);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear");
    }
  };

  const commitRename = async (id: string) => {
    const name = editName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    try {
      setError(null);
      await onRename(id, name);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo editar");
    }
  };

  const reduced = useMotionPreference();
  const presence = menuPresence(reduced);

  return (
    <motion.div
      ref={mergeRefs(root, forwarded)}
      className="menu label-menu"
      role="menu"
      aria-label="Etiquetas"
      style={{ left: pos.left, top: pos.top, width: MENU_W }}
      onMouseDown={(e) => e.stopPropagation()}
      initial={presence.initial}
      animate={presence.animate}
      exit={presence.exit}
      transition={presence.transition}
    >
      {labels.map((label) => {
        const on = selectedSet.has(label.id);
        const editing = editingId === label.id;
        return (
          <div key={label.id} className={`label-menu-row${on ? " active" : ""}`}>
            {editing ? (
              <input
                className="label-menu-input label-menu-edit"
                value={editName}
                aria-label="Nombre de la etiqueta"
                autoFocus
                onChange={(e) => setEditName(e.target.value)}
                onBlur={(e) => {
                  const next = e.relatedTarget;
                  if (next instanceof Node && e.currentTarget.parentElement?.contains(next)) return;
                  void commitRename(label.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void commitRename(label.id);
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingId(null);
                  }
                }}
              />
            ) : (
              <button
                className={`menu-item label-menu-pick${on ? " active" : ""}`}
                type="button"
                role="menuitemcheckbox"
                aria-checked={on}
                onClick={() => onToggle(label.id)}
                onMouseEnter={(e) => e.currentTarget.focus()}
              >
                <span className="menu-tick" aria-hidden>
                  {on ? <CheckIcon /> : null}
                </span>
                <span className="dot" style={{ background: label.color }} />
                <span className="label-menu-name">{label.name}</span>
              </button>
            )}
            <div className="label-menu-actions">
              <button
                className="icon-btn label-menu-icon"
                type="button"
                aria-label={`Editar ${label.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(label.id);
                  setEditName(label.name);
                  setError(null);
                }}
              >
                <PencilIcon size={12} />
              </button>
              <button
                className="icon-btn label-menu-icon danger"
                type="button"
                aria-label={`Eliminar ${label.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void onDelete(label.id);
                  if (editingId === label.id) setEditingId(null);
                }}
              >
                <TrashIcon size={12} />
              </button>
            </div>
            {editing ? (
              <div className="label-menu-palette" role="group" aria-label="Color">
                {LABEL_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`label-swatch${label.color === color ? " selected" : ""}`}
                    style={{ background: color }}
                    aria-label={color}
                    onClick={() => void onRecolor(label.id, color)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="menu-sep" />
      <form
        className="label-menu-create"
        onSubmit={(e) => {
          e.preventDefault();
          void submitCreate();
        }}
      >
        <input
          ref={createRef}
          className="label-menu-input grow"
          placeholder="Nueva etiqueta"
          value={draft}
          aria-label="Nueva etiqueta"
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submitCreate();
            }
          }}
        />
      </form>
      {error ? <p className="label-menu-error">{error}</p> : null}
    </motion.div>
  );
});
