import { useMemo, useState } from "react";
import { searchIdeas } from "../db";
import { PlusIcon, StatusIcon } from "../icons";
import { statusLabel, type Idea } from "../types";

export function CommandPalette({
  ideas,
  onClose,
  onCreate,
  onOpen,
  onSearch,
}: {
  ideas: Idea[];
  onClose: () => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onSearch: (q: string) => void;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const items = useMemo(() => {
    const actions = [
      { id: "new", kind: "action" as const, title: "New idea", meta: "C" },
      { id: "search", kind: "action" as const, title: q ? `Filter list: ${q}` : "Filter current view", meta: "/" },
    ];
    const hits = searchIdeas(ideas, q).slice(0, 8).map((idea) => ({
      id: idea.id,
      kind: "idea" as const,
      title: `${idea.identifier}  ${idea.title}`,
      meta: statusLabel(idea.status),
    }));
    return [...actions, ...hits];
  }, [ideas, q]);
  const run = (item: (typeof items)[number]) => {
    if (item.id === "new") onCreate();
    else if (item.id === "search") onSearch(q);
    else onOpen(item.id);
  };
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="palette-input"
          placeholder="Type a command or search…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(items.length - 1, a + 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            }
            if (e.key === "Enter" && items[active]) {
              e.preventDefault();
              run(items[active]!);
            }
          }}
        />
        <div className="palette-list">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={`palette-item${i === active ? " active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(item)}
            >
              {item.kind === "idea" ? <StatusIcon status={ideas.find((x) => x.id === item.id)?.status ?? "todo"} /> : <PlusIcon size={14} />}
              {item.title}
              <span className="meta">{item.meta}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SearchOverlay({
  value,
  ideas,
  onChange,
  onClose,
  onOpen,
}: {
  value: string;
  ideas: Idea[];
  onChange: (q: string) => void;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const [q, setQ] = useState(value);
  const [active, setActive] = useState(0);
  const hits = searchIdeas(ideas, q).slice(0, 12);
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="palette-input"
          placeholder="Search ideas…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            onChange(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(hits.length - 1, a + 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            }
            if (e.key === "Enter" && hits[active]) {
              e.preventDefault();
              onOpen(hits[active]!.id);
            }
          }}
        />
        <div className="palette-list">
          {hits.length === 0 ? (
            <div className="palette-item">No matching ideas</div>
          ) : (
            hits.map((idea, i) => (
              <button
                key={idea.id}
                type="button"
                className={`palette-item${i === active ? " active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => onOpen(idea.id)}
              >
                <StatusIcon status={idea.status} />
                <span className="ident">{idea.identifier}</span>
                {idea.title}
                <span className="meta">{statusLabel(idea.status)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
