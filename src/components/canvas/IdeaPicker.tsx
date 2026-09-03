import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { searchIdeas } from "../../db";
import { StatusIcon } from "../../icons";
import { statusLabel, type Idea } from "../../types";

export function IdeaPicker({
  ideas,
  excludeId,
  onClose,
  onPick,
}: {
  ideas: Idea[];
  excludeId: string;
  onClose: () => void;
  onPick: (idea: Idea) => void;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const hits = useMemo(
    () => searchIdeas(ideas.filter((idea) => idea.id !== excludeId), q).slice(0, 20),
    [excludeId, ideas, q],
  );

  useEffect(() => {
    setActive((i) => (hits.length === 0 ? 0 : Math.min(i, hits.length - 1)));
  }, [hits.length]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(hits.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[active];
      if (hit) onPick(hit);
    }
  };

  return (
    <div className="overlay canvas-picker-overlay" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-labelledby="canvas-idea-picker"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          id="canvas-idea-picker"
          autoFocus
          className="palette-input"
          placeholder="Enlazar una idea…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <div className="palette-list" role="listbox">
          {hits.length === 0 ? (
            <div className="palette-item" data-empty="true" role="status">
              No se encontraron ideas
            </div>
          ) : (
            hits.map((idea, i) => (
              <button
                key={idea.id}
                type="button"
                role="option"
                aria-selected={i === active}
                className={`palette-item${i === active ? " active" : ""}`}
                ref={i === active ? (node) => node?.scrollIntoView({ block: "nearest" }) : undefined}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(idea)}
              >
                <StatusIcon status={idea.status} />
                <span className="ident">{idea.identifier}</span>
                <span className="title">{idea.title}</span>
                <span className="meta">{statusLabel(idea.status)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
