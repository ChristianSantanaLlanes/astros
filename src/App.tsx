import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  addComment,
  createIdea,
  deleteIdea,
  listComments,
  listIdeas,
  searchIdeas,
  updateIdea,
} from "./db";
import {
  ChevronIcon,
  CloseIcon,
  FilterIcon,
  ForgeMark,
  InboxIcon,
  Kbd,
  PlusIcon,
  PriorityIcon,
  SearchIcon,
  StatusIcon,
  ViewsIcon,
} from "./icons";
import { LABEL_COLORS, PRIORITIES, STATUSES, statusLabel, type Comment, type Idea, type Priority, type Status } from "./types";

type View = "inbox" | "active" | "all" | Status;
type Overlay = "none" | "create" | "command" | "search";

const STATUS_ORDER: Status[] = ["in_progress", "todo", "backlog", "done", "canceled"];

function formatTime(ts: number): string {
  const delta = Date.now() - ts;
  const mins = Math.round(delta / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

export function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [collapsed, setCollapsed] = useState<Set<Status>>(new Set(["canceled"]));
  const [toast, setToast] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ status: Status; beforeId: string | null } | null>(null);
  const [statusMenu, setStatusMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  const reload = useCallback(async () => {
    const rows = await listIdeas();
    setIdeas(rows);
    setReady(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => {
    let rows = ideas;
    if (view === "inbox") rows = ideas.filter((i) => i.status === "todo" || i.status === "in_progress");
    else if (view === "active") rows = ideas.filter((i) => i.status !== "done" && i.status !== "canceled");
    else if (view !== "all") rows = ideas.filter((i) => i.status === view);
    if (query) rows = searchIdeas(rows, query);
    return rows;
  }, [ideas, query, view]);

  const grouped = useMemo(() => {
    return STATUS_ORDER.map((status) => ({
      status,
      items: visible.filter((i) => i.status === status).sort((a, b) => a.order - b.order || a.number - b.number),
    })).filter((g) => g.items.length > 0 || (!query && view === "all"));
  }, [query, view, visible]);

  const flatIds = useMemo(() => grouped.flatMap((g) => (collapsed.has(g.status) ? [] : g.items.map((i) => i.id))), [collapsed, grouped]);

  const openIdea = ideas.find((i) => i.id === openId) ?? null;

  const flash = (msg: string) => setToast(msg);

  const create = async (
    title: string,
    description = "",
    status: Status = "todo",
    priority: Priority = 0,
  ) => {
    const idea = await createIdea({ title, description, status, priority });
    await reload();
    setFocusId(idea.id);
    setOpenId(idea.id);
    flash(`${idea.identifier} created`);
    return idea;
  };

  const patch = async (id: string, next: Parameters<typeof updateIdea>[1]) => {
    await updateIdea(id, next);
    await reload();
  };

  const remove = async (id: string) => {
    await deleteIdea(id);
    if (openId === id) setOpenId(null);
    setSelected((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    await reload();
    flash("Idea deleted");
  };

  const moveFocused = (dir: 1 | -1) => {
    if (flatIds.length === 0) return;
    const i = focusId ? flatIds.indexOf(focusId) : -1;
    const next = flatIds[Math.max(0, Math.min(flatIds.length - 1, (i === -1 ? 0 : i) + dir))];
    if (next) {
      setFocusId(next);
      document.getElementById(`row-${next}`)?.scrollIntoView({ block: "nearest" });
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOverlay((o) => (o === "command" ? "none" : "command"));
        return;
      }
      if (e.key === "Escape") {
        if (statusMenu) {
          setStatusMenu(null);
          return;
        }
        if (overlay !== "none") {
          setOverlay("none");
          return;
        }
        if (openId) {
          setOpenId(null);
          return;
        }
        setSelected(new Set());
        return;
      }
      if (isTypingTarget(e.target)) return;
      if (e.key === "c" && !meta) {
        e.preventDefault();
        setOverlay("create");
        return;
      }
      if (e.key === "/" && !meta) {
        e.preventDefault();
        setOverlay("search");
        return;
      }
      if (e.key === "j") {
        e.preventDefault();
        moveFocused(1);
      }
      if (e.key === "k") {
        e.preventDefault();
        moveFocused(-1);
      }
      if (e.key === "Enter" && focusId) {
        e.preventDefault();
        setOpenId(focusId);
      }
      if (e.key === "x" && focusId) {
        e.preventDefault();
        setSelected((s) => {
          const n = new Set(s);
          if (n.has(focusId)) n.delete(focusId);
          else n.add(focusId);
          return n;
        });
      }
      if (e.key === "Backspace" && meta && (focusId || selected.size)) {
        e.preventDefault();
        const ids = selected.size ? [...selected] : focusId ? [focusId] : [];
        void Promise.all(ids.map((id) => deleteIdea(id))).then(reload);
        setSelected(new Set());
        flash("Deleted");
      }
      const statusKeys: Record<string, Status> = { "1": "backlog", "2": "todo", "3": "in_progress", "4": "done", "5": "canceled" };
      if (e.altKey && statusKeys[e.key] && focusId) {
        e.preventDefault();
        void patch(focusId, { status: statusKeys[e.key] });
        flash(`Moved to ${statusLabel(statusKeys[e.key]!)}`);
      }
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && focusId) {
        e.preventDefault();
        const dir = e.key === "ArrowUp" ? -1 : 1;
        const idea = ideas.find((i) => i.id === focusId);
        if (!idea) return;
        const group = ideas.filter((i) => i.status === idea.status).sort((a, b) => a.order - b.order);
        const idx = group.findIndex((i) => i.id === idea.id);
        const swap = group[idx + dir];
        if (!swap) return;
        void Promise.all([updateIdea(idea.id, { order: swap.order }), updateIdea(swap.id, { order: idea.order })]).then(reload);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onDrop = async (status: Status, beforeId: string | null) => {
    if (!dragId) return;
    const group = ideas.filter((i) => i.status === status && i.id !== dragId).sort((a, b) => a.order - b.order);
    const before = beforeId ? group.find((i) => i.id === beforeId) : undefined;
    let order: number;
    if (!before) {
      order = group.length ? group[group.length - 1]!.order + 1 : 0;
    } else {
      const idx = group.findIndex((i) => i.id === before.id);
      const prev = group[idx - 1];
      order = prev ? (prev.order + before.order) / 2 : before.order - 1;
    }
    await updateIdea(dragId, { status, order });
    setDragId(null);
    setDrop(null);
    await reload();
  };

  const counts = {
    all: ideas.length,
    inbox: ideas.filter((i) => i.status === "todo" || i.status === "in_progress").length,
    active: ideas.filter((i) => i.status !== "done" && i.status !== "canceled").length,
  };

  if (!ready) {
    return (
      <div className="app">
        <aside className="sidebar" />
        <main className="main" />
      </div>
    );
  }

  return (
    <div className="app">
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="workspace">
          <ForgeMark />
          <div>
            <div className="workspace-name">Forge</div>
          </div>
          <span className="workspace-meta">FOR</span>
        </div>
        <button className="nav-search" onClick={() => setOverlay("command")} type="button">
          <SearchIcon size={14} />
          <span className="grow">Search</span>
          <Kbd>⌘K</Kbd>
        </button>
        <div className="nav-section">
          <NavItem icon={<InboxIcon />} label="Inbox" count={counts.inbox} active={view === "inbox"} onClick={() => setView("inbox")} />
          <NavItem icon={<ViewsIcon />} label="Active" count={counts.active} active={view === "active"} onClick={() => setView("active")} />
          <NavItem icon={<ViewsIcon />} label="All ideas" count={counts.all} active={view === "all"} onClick={() => setView("all")} />
        </div>
        <div className="nav-label">Status</div>
        <div className="nav-section">
          {STATUSES.map((s) => (
            <NavItem
              key={s.id}
              icon={<StatusIcon status={s.id} />}
              label={s.label}
              count={ideas.filter((i) => i.status === s.id).length}
              active={view === s.id}
              onClick={() => setView(s.id)}
            />
          ))}
        </div>
        <div className="sidebar-foot">
          <Kbd>C</Kbd> new · <Kbd>J</Kbd>/<Kbd>K</Kbd> move · <Kbd>/</Kbd> find
        </div>
      </aside>

      <main className="main">
        {openIdea ? (
          <Detail
            idea={openIdea}
            onBack={() => setOpenId(null)}
            onChange={(next) => void patch(openIdea.id, next)}
            onDelete={() => void remove(openIdea.id)}
          />
        ) : (
          <>
            <header className="topbar">
              <button className="icon-btn" type="button" onClick={() => setSidebarOpen((v) => !v)} aria-label="Menu">
                <ViewsIcon />
              </button>
              <h1>{view === "all" ? "All ideas" : view === "inbox" ? "Inbox" : view === "active" ? "Active" : statusLabel(view)}</h1>
              <button className={`chip${query ? " active" : ""}`} type="button" onClick={() => setOverlay("search")}>
                <FilterIcon size={14} />
                {query ? query : "Filter"}
              </button>
              <span className="spacer" />
              <span style={{ color: "var(--text-4)", fontSize: 12 }}>{visible.length}</span>
              <button className="primary" type="button" onClick={() => setOverlay("create")}>
                <PlusIcon size={14} />
                New idea
                <Kbd>C</Kbd>
              </button>
            </header>
            <div className="list">
              {visible.length === 0 ? (
                <Empty query={query} onCreate={() => setOverlay("create")} onClear={() => setQuery("")} />
              ) : (
                grouped.map((group) => (
                  <section key={group.status} className="group">
                    <button
                      className="group-head"
                      type="button"
                      onClick={() =>
                        setCollapsed((c) => {
                          const n = new Set(c);
                          if (n.has(group.status)) n.delete(group.status);
                          else n.add(group.status);
                          return n;
                        })
                      }
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDrop({ status: group.status, beforeId: group.items[0]?.id ?? null });
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        void onDrop(group.status, group.items[0]?.id ?? null);
                      }}
                    >
                      <ChevronIcon open={!collapsed.has(group.status)} />
                      <StatusIcon status={group.status} />
                      {statusLabel(group.status)}
                      <span className="n">{group.items.length}</span>
                    </button>
                    {!collapsed.has(group.status) &&
                      group.items.map((idea) => (
                        <IdeaRow
                          key={idea.id}
                          idea={idea}
                          focused={focusId === idea.id}
                          selected={selected.has(idea.id)}
                          dragging={dragId === idea.id}
                          dropTarget={drop?.beforeId === idea.id && drop.status === idea.status}
                          onFocus={() => setFocusId(idea.id)}
                          onOpen={() => setOpenId(idea.id)}
                          onStatus={(el) => {
                            const r = el.getBoundingClientRect();
                            setStatusMenu({ x: r.left, y: r.bottom + 4, id: idea.id });
                          }}
                          onDragStart={() => setDragId(idea.id)}
                          onDragOver={() => setDrop({ status: idea.status, beforeId: idea.id })}
                          onDrop={() => void onDrop(idea.status, idea.id)}
                          onDragEnd={() => {
                            setDragId(null);
                            setDrop(null);
                          }}
                        />
                      ))}
                  </section>
                ))
              )}
            </div>
          </>
        )}
      </main>

      {overlay === "create" && (
        <Composer
          onClose={() => setOverlay("none")}
          onCreate={async (title, description, status, priority) => {
            await create(title, description, status, priority);
            setOverlay("none");
          }}
        />
      )}
      {overlay === "command" && (
        <CommandPalette
          ideas={ideas}
          onClose={() => setOverlay("none")}
          onCreate={() => setOverlay("create")}
          onOpen={(id) => {
            setOpenId(id);
            setOverlay("none");
          }}
          onSearch={(q) => {
            setQuery(q);
            setOverlay("none");
          }}
        />
      )}
      {overlay === "search" && (
        <SearchOverlay
          value={query}
          ideas={ideas}
          onChange={setQuery}
          onClose={() => setOverlay("none")}
          onOpen={(id) => {
            setOpenId(id);
            setOverlay("none");
          }}
        />
      )}
      {statusMenu && (
        <StatusMenu
          x={statusMenu.x}
          y={statusMenu.y}
          current={ideas.find((i) => i.id === statusMenu.id)?.status ?? "todo"}
          onClose={() => setStatusMenu(null)}
          onPick={(status) => {
            void patch(statusMenu.id, { status });
            setStatusMenu(null);
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function NavItem({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`nav-item${active ? " active" : ""}`} type="button" onClick={onClick}>
      {icon}
      {label}
      <span className="count">{count}</span>
    </button>
  );
}

function IdeaRow({
  idea,
  focused,
  selected,
  dragging,
  dropTarget,
  onFocus,
  onOpen,
  onStatus,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  idea: Idea;
  focused: boolean;
  selected: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onFocus: () => void;
  onOpen: () => void;
  onStatus: (el: HTMLElement) => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      id={`row-${idea.id}`}
      className={`row${focused ? " focused" : ""}${selected ? " selected" : ""}${dragging ? " dragging" : ""}${dropTarget ? " drop-target" : ""}`}
      draggable
      onClick={onFocus}
      onDoubleClick={onOpen}
      onDragStart={onDragStart}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        className="icon-btn"
        aria-label="Change status"
        onClick={(e) => {
          e.stopPropagation();
          onStatus(e.currentTarget);
        }}
      >
        <StatusIcon status={idea.status} />
      </button>
      <span className="ident">{idea.identifier}</span>
      <span className="title">{idea.title}</span>
      <span className="labels">
        {idea.labels.map((label) => (
          <span className="label" key={label}>
            <span className="dot" style={{ background: LABEL_COLORS[label] ?? "#8a8f98" }} />
            {label}
          </span>
        ))}
      </span>
      <span className="prio-slot" title={PRIORITIES.find((p) => p.id === idea.priority)?.label}>
        <PriorityIcon priority={idea.priority} />
      </span>
      <span className="ident">{formatTime(idea.updatedAt)}</span>
    </div>
  );
}

function Empty({ query, onCreate, onClear }: { query: string; onCreate: () => void; onClear: () => void }) {
  return (
    <div className="empty">
      <div className="empty-art">
        <InboxIcon size={28} />
      </div>
      {query ? (
        <>
          <h2>No ideas match “{query}”</h2>
          <p>Try another identifier, title fragment, or label. Search is instant and local.</p>
          <div className="hint-row">
            <button className="chip" type="button" onClick={onClear}>
              Clear search
            </button>
            <button className="primary" type="button" onClick={onCreate}>
              New idea
            </button>
          </div>
        </>
      ) : (
        <>
          <h2>No ideas yet</h2>
          <p>Capture the next one in a single keystroke. Title, then Cmd+Enter. Stay in flow.</p>
          <div className="hint-row">
            <button className="primary" type="button" onClick={onCreate}>
              New idea
            </button>
            <span>
              Press <Kbd>C</Kbd>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function Composer({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, description: string, status: Status, priority: Priority) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("todo");
  const [priority, setPriority] = useState<Priority>(0);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  const submit = () => {
    if (!title.trim()) return;
    void onCreate(title, description, status, priority);
  };
  return (
    <div className="overlay" onMouseDown={onClose}>
      <form
        className="composer"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          ref={titleRef}
          className="composer-title"
          placeholder="Idea title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <textarea
          className="composer-body"
          placeholder="Add description…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="composer-bar">
          <button className="chip" type="button" onClick={() => setStatus((s) => STATUSES[(STATUSES.findIndex((x) => x.id === s) + 1) % STATUSES.length]!.id)}>
            <StatusIcon status={status} />
            {statusLabel(status)}
          </button>
          <button
            className="chip"
            type="button"
            onClick={() => setPriority(((priority + 1) % 5) as Priority)}
          >
            <PriorityIcon priority={priority} />
            {PRIORITIES.find((p) => p.id === priority)?.label}
          </button>
          <span className="spacer" />
          <span style={{ color: "var(--text-4)", fontSize: 12 }}>
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd> create
          </span>
          <button className="primary" type="submit" disabled={!title.trim()}>
            Create idea
          </button>
        </div>
      </form>
    </div>
  );
}

function CommandPalette({
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

function SearchOverlay({
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

function StatusMenu({
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

function Detail({
  idea,
  onBack,
  onChange,
  onDelete,
}: {
  idea: Idea;
  onBack: () => void;
  onChange: (patch: Partial<Pick<Idea, "title" | "description" | "status" | "priority" | "labels">>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setTitle(idea.title);
    setDescription(idea.description);
    void listComments(idea.id).then(setComments);
  }, [idea.id, idea.title, idea.description]);

  return (
    <div className="detail-shell">
      <div className="detail">
        <div className="detail-head">
          <button className="chip" type="button" onClick={onBack}>
            All ideas
          </button>
          <span className="ident">{idea.identifier}</span>
          <span className="spacer" />
          <button className="icon-btn" type="button" onClick={onDelete} aria-label="Delete">
            <CloseIcon />
          </button>
        </div>
        <input
          className="detail-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title !== idea.title) onChange({ title });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <textarea
          className="detail-body"
          placeholder="Write a description…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            if (description !== idea.description) onChange({ description });
          }}
        />
        <div className="comments">
          {comments.map((c) => (
            <div className="comment" key={c.id}>
              <time>{new Date(c.createdAt).toLocaleString()}</time>
              {c.body}
            </div>
          ))}
          <input
            className="comment-input"
            placeholder="Leave a comment…  Enter to send"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                void addComment(idea.id, draft).then((c) => {
                  setComments((list) => [...list, c]);
                  setDraft("");
                });
              }
            }}
          />
        </div>
      </div>
      <aside className="props">
        <div className="prop">
          <div className="k">Status</div>
          <button
            className="v"
            type="button"
            onClick={() => {
              const i = STATUSES.findIndex((s) => s.id === idea.status);
              onChange({ status: STATUSES[(i + 1) % STATUSES.length]!.id });
            }}
          >
            <StatusIcon status={idea.status} />
            {statusLabel(idea.status)}
          </button>
        </div>
        <div className="prop">
          <div className="k">Priority</div>
          <button className="v" type="button" onClick={() => onChange({ priority: (((idea.priority + 1) % 5) as Priority) })}>
            <PriorityIcon priority={idea.priority} />
            {PRIORITIES.find((p) => p.id === idea.priority)?.label}
          </button>
        </div>
        <div className="prop">
          <div className="k">Labels</div>
          <div className="v" style={{ height: "auto", padding: "6px 0", flexWrap: "wrap" }}>
            {idea.labels.map((label) => (
              <span className="label" key={label}>
                <span className="dot" style={{ background: LABEL_COLORS[label] ?? "#8a8f98" }} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="prop">
          <div className="k">Created</div>
          <div className="v">{new Date(idea.createdAt).toLocaleString()}</div>
        </div>
        <div className="prop">
          <div className="k">Updated</div>
          <div className="v">{new Date(idea.updatedAt).toLocaleString()}</div>
        </div>
      </aside>
    </div>
  );
}
