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
      const statusKeys: Record<string, Status> = {
        "1": "backlog",
        "2": "todo",
        "3": "in_progress",
        "4": "done",
        "5": "canceled",
      };
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
        void Promise.all([updateIdea(idea.id, { order: swap.order }), updateIdea(swap.id, { order: idea.order })]).then(
          reload,
        );
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
