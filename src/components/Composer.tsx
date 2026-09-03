import { useRef, useState, type ReactNode, type RefObject } from "react";
import { motion } from "motion/react";
import { PlusIcon } from "../icons";
import { bootHidden, enterTransition, shown, useMotionPreference } from "../motion";

export function Composer({
  inputRef,
  onCreate,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onCreate: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const busy = useRef(false);

  const submit = async () => {
    const next = title.trim();
    if (!next || busy.current) return;
    busy.current = true;
    setTitle("");
    try {
      await onCreate(next);
    } finally {
      busy.current = false;
      inputRef.current?.focus();
    }
  };

  return (
    <form
      className="quick-capture"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <PlusIcon size={14} />
      <input
        ref={inputRef}
        id="quick-capture"
        className="quick-capture-input"
        placeholder="Captura una idea…"
        value={title}
        maxLength={140}
        autoComplete="off"
        spellCheck
        aria-label="Captura rápida"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setTitle("");
            e.currentTarget.blur();
          }
        }}
      />
      <kbd className="kbd">C</kbd>
    </form>
  );
}

export function NavItem({
  icon,
  label,
  count,
  active,
  onClick,
  enterDelay = 0,
  animateEnter = false,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  enterDelay?: number;
  animateEnter?: boolean;
}) {
  const reduced = useMotionPreference();
  return (
    <motion.button
      className={`nav-item${active ? " active" : ""}`}
      type="button"
      onClick={onClick}
      initial={bootHidden(animateEnter, reduced, { y: 8 })}
      animate={shown(reduced)}
      transition={enterTransition(reduced, enterDelay)}
    >
      {icon}
      {label}
      {count !== undefined ? <span className="count">{count}</span> : null}
    </motion.button>
  );
}
