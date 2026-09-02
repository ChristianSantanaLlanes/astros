import { useCallback, useEffect, useMemo, useState } from "react";
import { CommandPalette, SearchOverlay } from "./components/Search";
import { Composer, NavItem } from "./components/Composer";
import { Detail } from "./components/Detail";
import { Empty } from "./components/Empty";
import { IdeaRow } from "./components/IdeaRow";
import { StatusMenu } from "./components/StatusMenu";
import { createIdea, deleteIdea, listIdeas, searchIdeas, updateIdea } from "./db";
import { isTypingTarget } from "./format";
import {
  ChevronIcon,
  FilterIcon,
  ForgeMark,
  InboxIcon,
  Kbd,
  PlusIcon,
  SearchIcon,
  StatusIcon,
  ViewsIcon,
} from "./icons";
import { STATUSES, statusLabel, type Idea, type Priority, type Status } from "./types";

type View = "inbox" | "active" | "all" | Status;
type Overlay = "none" | "create" | "command" | "search";

const STATUS_ORDER: Status[] = ["in_progress", "todo", "backlog", "done", "canceled"];

const STATUS_BY_CODE: Record<string, Status> = {
  Digit1: "backlog",
  Digit2: "todo",
  Digit3: "in_progress",
  Digit4: "done",
  Digit5: "canceled",
  Numpad1: "backlog",
  Numpad2: "todo",
  Numpad3: "in_progress",
  Numpad4: "done",
  Numpad5: "canceled",
};

const STATUS_BY_KEY: Record<string, Status> = {
  "1": "backlog",
  "2": "todo",
  "3": "in_progress",
  "4": "done",
  "5": "canceled",
};

function statusFromKeyboard(e: KeyboardEvent): Status | undefined {
  return STATUS_BY_CODE[e.code] ?? STATUS_BY_KEY[e.key];
}

export function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("active");
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

  const flatIds = useMemo(
    () => grouped.flatMap((g) => (collapsed.has(g.status) ? [] : g.items.map((i) => i.id))),
    [collapsed, grouped],
  );

  const openIdea = ideas.find((i) => i.id === openId) ?? null;
  const flash = (msg: string) => setToast(msg);

  const create = async (title: string, description = "", status: Status = "todo", priority: Priority = 0) => {
    const idea = await createIdea({ title, description, status, priority });
    await reload();
    setFocusId(idea.id);
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

  const actionIds = () => (selected.size > 0 ? [...selected] : focusId ? [focusId] : []);

  const moveFocused = (dir: 1 | -1) => {
    if (flatIds.length === 0) return;
    const i = focusId ? flatIds.indexOf(focusId) : -1;
    const nextIndex =
      i === -1 ? (dir === 1 ? 0 : flatIds.length - 1) : Math.max(0, Math.min(flatIds.length - 1, i + dir));
    const next = flatIds[nextIndex];
    if (next) {
      setFocusId(next);
      document.getElementById(`row-${next}`)?.scrollIntoView({ block: "nearest" });
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const reorderFocused = (dir: 1 | -1) => {
    if (!focusId) return;
    const idea = ideas.find((i) => i.id === focusId);
    if (!idea) return;
    const group = ideas.filter((i) => i.status === idea.status).sort((a, b) => a.order - b.order);
    const idx = group.findIndex((i) => i.id === idea.id);
    const swap = group[idx + dir];
    if (!swap) return;
    void Promise.all([updateIdea(idea.id, { order: swap.order }), updateIdea(swap.id, { order: idea.order })]).then(
      reload,
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key;
      const letter = key.length === 1 ? key.toLowerCase() : key;

      if (meta && letter === "k") {
        e.preventDefault();
        setOverlay((o) => (o === "command" ? "none" : "command"));
        return;
      }

      if (key === "Escape") {
        if (statusMenu) {
          e.preventDefault();
          setStatusMenu(null);
          return;
        }
        if (overlay !== "none") {
          e.preventDefault();
          setOverlay("none");
          return;
        }
        if (openId) {
          e.preventDefault();
          setOpenId(null);
          return;
        }
        if (selected.size) {
          e.preventDefault();
          setSelected(new Set());
        }
        return;
      }

      if (e.isComposing || isTypingTarget(e.target)) return;

      if (statusMenu) {
        const status = statusFromKeyboard(e);
        if (status && !meta) {
          e.preventDefault();
          void patch(statusMenu.id, { status });
          setStatusMenu(null);
          flash(`Moved to ${statusLabel(status)}`);
        }
        return;
      }

      if (overlay !== "none") return;

      if (meta && key === "Backspace" && !e.repeat) {
        const ids = actionIds();
        if (!ids.length) return;
        e.preventDefault();
        const focusIndex = focusId ? flatIds.indexOf(focusId) : -1;
        const remaining = flatIds.filter((id) => !ids.includes(id));
        const next = remaining[Math.min(Math.max(focusIndex, 0), remaining.length - 1)] ?? null;
        void Promise.all(ids.map((id) => deleteIdea(id))).then(reload);
        if (openId && ids.includes(openId)) setOpenId(null);
        setSelected(new Set());
        setFocusId(next);
        flash("Deleted");
        return;
      }

      if (e.altKey && !meta) {
        const status = statusFromKeyboard(e);
        if (status && !e.repeat) {
          const ids = actionIds();
          if (!ids.length) return;
          e.preventDefault();
          void Promise.all(ids.map((id) => updateIdea(id, { status }))).then(reload);
          flash(`Moved to ${statusLabel(status)}`);
          return;
        }
        if (key === "ArrowUp" || key === "ArrowDown") {
          e.preventDefault();
          reorderFocused(key === "ArrowUp" ? -1 : 1);
        }
        return;
      }

      if (meta || e.altKey) return;

      if (letter === "c" && !e.shiftKey && !e.repeat) {
        e.preventDefault();
        setOverlay("create");
        return;
      }
      if (key === "/" && !e.repeat) {
        e.preventDefault();
        setOverlay("search");
        return;
      }
      if (openId) return;
      if (letter === "j") {
        e.preventDefault();
        moveFocused(1);
        return;
      }
      if (letter === "k") {
        e.preventDefault();
        moveFocused(-1);
        return;
      }
      if (e.repeat) return;
      if (key === "Enter" && focusId) {
        e.preventDefault();
        setOpenId(focusId);
        return;
      }
      if (letter === "x" && !e.shiftKey && focusId) {
        e.preventDefault();
        toggleSelected(focusId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onDrop = async (status: Status, beforeId: string | null) => {
    if (!dragId) return;
    if (beforeId === dragId) {
      setDragId(null);
      setDrop(null);
      return;
    }
    const group = ideas
      .filter((i) => i.status === status && i.id !== dragId)
      .sort((a, b) => a.order - b.order || a.number - b.number);
    const before = beforeId ? group.find((i) => i.id === beforeId) : undefined;
    let order: number;
    if (!beforeId) {
      order = group.length ? group[0]!.order - 1 : 0;
    } else if (!before) {
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
          <NavItem icon={<ViewsIcon />} label="My issues" count={counts.active} active={view === "active"} onClick={() => setView("active")} />
          <NavItem icon={<ViewsIcon />} label="All issues" count={counts.all} active={view === "all"} onClick={() => setView("all")} />
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
              <h1>{view === "all" ? "My issues" : view === "inbox" ? "Inbox" : view === "active" ? "My issues" : statusLabel(view)}</h1>
              <button className={`chip${view === "active" ? " active" : ""}`} type="button" onClick={() => setView("active")}>
                Assigned
              </button>
              <button className={`chip${view === "all" ? " active" : ""}`} type="button" onClick={() => setView("all")}>
                Created
              </button>
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
                        e.dataTransfer.dropEffect = "move";
                        setDrop((current) =>
                          current?.status === group.status && current.beforeId === null
                            ? current
                            : { status: group.status, beforeId: null },
                        );
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void onDrop(group.status, null);
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
                          dropTarget={
                            Boolean(
                              drop &&
                                drop.status === idea.status &&
                                dragId !== idea.id &&
                                (drop.beforeId === idea.id ||
                                  (drop.beforeId === null &&
                                    idea.id === group.items.find((item) => item.id !== dragId)?.id)),
                            )
                          }
                          onFocus={() => setFocusId(idea.id)}
                          onOpen={() => setOpenId(idea.id)}
                          onStatus={(el) => {
                            const r = el.getBoundingClientRect();
                            setStatusMenu({ x: r.left, y: r.bottom + 4, id: idea.id });
                          }}
                          onDragStart={() => setDragId(idea.id)}
                          onDragOver={() =>
                            setDrop((current) =>
                              current?.status === idea.status && current.beforeId === idea.id
                                ? current
                                : { status: idea.status, beforeId: idea.id },
                            )
                          }
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
