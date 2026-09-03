import { forwardRef, useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { searchIdeas } from "../db";
import { PlusIcon, SearchIcon, StatusIcon } from "../icons";
import { exitEase, fadeQuick, hidden, uiSpring, useMotionPreference } from "../motion";
import { statusLabel, type Idea, type Label } from "../types";

type ActionId = "new" | "search";

type ActionHit = {
  id: ActionId;
  kind: "action";
  title: string;
  meta: string;
};

function moveActive(key: string, count: number, setActive: (fn: (i: number) => number) => void): boolean {
  if (count <= 0) return key === "ArrowDown" || key === "ArrowUp";
  if (key === "ArrowDown") {
    setActive((i) => Math.min(count - 1, i + 1));
    return true;
  }
  if (key === "ArrowUp") {
    setActive((i) => Math.max(0, i - 1));
    return true;
  }
  return false;
}

const Palette = forwardRef<
  HTMLDivElement,
  {
    labelledBy: string;
    placeholder: string;
    value: string;
    onChange: (q: string) => void;
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
    onClose: () => void;
    children: ReactNode;
  }
>(function Palette({ labelledBy, placeholder, value, onChange, onKeyDown, onClose, children }, ref) {
  const reduced = useMotionPreference();
  return (
    <motion.div
      ref={ref}
      className="overlay"
      onMouseDown={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduced ? fadeQuick : exitEase}
    >
      <motion.div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onMouseDown={(e) => e.stopPropagation()}
        initial={hidden(reduced, { scale: 0.96 })}
        animate={{ opacity: 1, scale: 1 }}
        exit={hidden(reduced, { scale: 0.98 })}
        transition={reduced ? fadeQuick : uiSpring}
      >
        <input
          id={labelledBy}
          autoFocus
          className="palette-input"
          placeholder={placeholder}
          value={value}
          aria-autocomplete="list"
          aria-controls={`${labelledBy}-list`}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="palette-list" id={`${labelledBy}-list`} role="listbox">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
});

function IdeaHit({
  idea,
  active,
  onHover,
  onOpen,
}: {
  idea: Idea;
  active: boolean;
  onHover: () => void;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={`palette-item${active ? " active" : ""}`}
      ref={active ? (node) => node?.scrollIntoView({ block: "nearest" }) : undefined}
      onMouseEnter={onHover}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onOpen}
    >
      <StatusIcon status={idea.status} />
      <span className="ident">{idea.identifier}</span>
      <span className="title">{idea.title}</span>
      <span className="meta">{statusLabel(idea.status)}</span>
    </button>
  );
}

function EmptyHits() {
  return (
    <div className="palette-item" data-empty="true" role="status">
      No se encontraron ideas
    </div>
  );
}

export const CommandPalette = forwardRef<
  HTMLDivElement,
  {
    ideas: Idea[];
    labels: Label[];
    onClose: () => void;
    onCreate: () => void;
    onOpen: (id: string) => void;
    onSearch: (q: string) => void;
  }
>(function CommandPalette({ ideas, labels, onClose, onCreate, onOpen, onSearch }, ref) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const needle = q.trim().toLowerCase();

  const actions = useMemo<ActionHit[]>(() => {
    const all: ActionHit[] = [
      { id: "new", kind: "action", title: "Nueva idea", meta: "C" },
      {
        id: "search",
        kind: "action",
        title: needle ? `Filtrar “${q.trim()}”` : "Filtrar la vista actual",
        meta: "/",
      },
    ];
    if (!needle) return all;
    return all.filter((action) => action.id === "search" || action.title.toLowerCase().includes(needle));
  }, [needle, q]);

  const hits = useMemo(() => searchIdeas(ideas, q, labels).slice(0, 20), [ideas, labels, q]);

  const items = useMemo(
    () => [
      ...actions,
      ...hits.map((idea) => ({ id: idea.id, kind: "idea" as const, idea })),
    ],
    [actions, hits],
  );

  useEffect(() => {
    setActive((i) => (items.length === 0 ? 0 : Math.min(i, items.length - 1)));
  }, [items.length]);

  const run = (item: (typeof items)[number] | undefined) => {
    if (!item) {
      if (needle) onSearch(q);
      return;
    }
    if (item.kind === "action") {
      if (item.id === "new") onCreate();
      else onSearch(q);
      return;
    }
    onOpen(item.idea.id);
  };

  return (
    <Palette
      ref={ref}
      labelledBy="forge-command"
      placeholder="Escribe un comando o busca…"
      value={q}
      onClose={onClose}
      onChange={(next) => {
        setQ(next);
        setActive(0);
      }}
      onKeyDown={(e) => {
        if (moveActive(e.key, items.length, setActive)) {
          e.preventDefault();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          run(items[active]);
        }
      }}
    >
      {items.length === 0 ? (
        <EmptyHits />
      ) : (
        <>
          {actions.length > 0 ? <div className="palette-section">Comandos</div> : null}
          {items.map((item, i) =>
            item.kind === "action" ? (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={i === active}
                className={`palette-item${i === active ? " active" : ""}`}
                ref={i === active ? (node) => node?.scrollIntoView({ block: "nearest" }) : undefined}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => run(item)}
              >
                {item.id === "new" ? <PlusIcon size={14} /> : <SearchIcon size={14} />}
                <span className="title">{item.title}</span>
                <span className="meta">{item.meta}</span>
              </button>
            ) : null,
          )}
          {hits.length > 0 ? <div className="palette-section">Ideas</div> : null}
          {items.map((item, i) =>
            item.kind === "idea" ? (
              <IdeaHit
                key={item.id}
                idea={item.idea}
                active={i === active}
                onHover={() => setActive(i)}
                onOpen={() => onOpen(item.idea.id)}
              />
            ) : null,
          )}
        </>
      )}
    </Palette>
  );
});

export const SearchOverlay = forwardRef<
  HTMLDivElement,
  {
    value: string;
    ideas: Idea[];
    labels: Label[];
    onChange: (q: string) => void;
    onClose: () => void;
    onOpen: (id: string) => void;
  }
>(function SearchOverlay({ value, ideas, labels, onChange, onClose, onOpen }, ref) {
  const [q, setQ] = useState(value);
  const [active, setActive] = useState(0);
  const hits = useMemo(() => searchIdeas(ideas, q, labels), [ideas, labels, q]);

  useEffect(() => {
    setActive((i) => (hits.length === 0 ? 0 : Math.min(i, hits.length - 1)));
  }, [hits.length]);

  return (
    <Palette
      ref={ref}
      labelledBy="forge-search"
      placeholder="Buscar ideas…"
      value={q}
      onClose={onClose}
      onChange={(next) => {
        setQ(next);
        onChange(next);
        setActive(0);
      }}
      onKeyDown={(e) => {
        if (moveActive(e.key, hits.length, setActive)) {
          e.preventDefault();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const hit = hits[active];
          if (hit) onOpen(hit.id);
          else onClose();
        }
      }}
    >
      {hits.length === 0 ? (
        <EmptyHits />
      ) : (
        hits.map((idea, i) => (
          <IdeaHit
            key={idea.id}
            idea={idea}
            active={i === active}
            onHover={() => setActive(i)}
            onOpen={() => onOpen(idea.id)}
          />
        ))
      )}
    </Palette>
  );
});
