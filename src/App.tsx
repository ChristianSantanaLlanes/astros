import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { CommandPalette, SearchOverlay } from "./components/Search";
import { Composer, NavItem } from "./components/Composer";
import { Detail } from "./components/Detail";
import { IdeaCanvas } from "./components/canvas/IdeaCanvas";
import { Empty } from "./components/Empty";
import { IdeaRow } from "./components/IdeaRow";
import { StatusMenu } from "./components/StatusMenu";
import {
  createIdea,
  deleteIdea,
  getCanvas,
  listComments,
  listIdeas,
  listLabels,
  restoreIdea,
  searchIdeas,
  updateIdea,
} from "./db";
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
import {
  bootHidden,
  enterTransition,
  exitEase,
  fadeQuick,
  hidden,
  MOBILE_MQ,
  panelSpring,
  shown,
  staggerDelay,
  uiSpring,
  useBootStagger,
  useMediaQuery,
  useMotionPreference,
  viewEase,
} from "./motion";
import { STATUSES, statusLabel, type CanvasGraph, type Comment, type Idea, type Label, type Status } from "./types";

type View = "active" | "all" | Status;
type Overlay = "none" | "command" | "search";
type Toast = { message: string; undo?: () => void };

const STATUS_ORDER: Status[] = ["inbox", "planned", "in_progress", "done"];

const STATUS_BY_CODE: Record<string, Status> = {
  Digit1: "inbox",
  Digit2: "planned",
  Digit3: "in_progress",
  Digit4: "done",
  Numpad1: "inbox",
  Numpad2: "planned",
  Numpad3: "in_progress",
  Numpad4: "done",
};

const STATUS_BY_KEY: Record<string, Status> = {
  "1": "inbox",
  "2": "planned",
  "3": "in_progress",
  "4": "done",
};

function statusFromKeyboard(e: KeyboardEvent): Status | undefined {
  return STATUS_BY_CODE[e.code] ?? STATUS_BY_KEY[e.key];
}

function captureHost(view: View): Status {
  if (view === "active" || view === "all") return "inbox";
  return view;
}

function viewLabel(view: View): string {
  if (view === "active") return "Mis ideas";
  if (view === "all") return "Todas las ideas";
  return statusLabel(view);
}

export function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("active");
  const [query, setQuery] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [collapsed, setCollapsed] = useState<Set<Status>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ status: Status; beforeId: string | null } | null>(null);
  const [statusMenu, setStatusMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const captureRef = useRef<HTMLInputElement>(null);
  const reduced = useMotionPreference();
  const mobile = useMediaQuery(MOBILE_MQ);
  const bootStagger = useBootStagger(ready);

  const reload = useCallback(async () => {
    const [rows, catalog] = await Promise.all([listIdeas(), listLabels()]);
    setIdeas(rows);
    setLabels(catalog);
    setReady(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.undo ? 3500 : 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => {
    let rows = ideas;
    if (view === "active") rows = ideas.filter((i) => i.status !== "done");
    else if (view !== "all") rows = ideas.filter((i) => i.status === view);
    if (query) rows = searchIdeas(rows, query, labels);
    return rows;
  }, [ideas, labels, query, view]);

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
  const flash = (msg: string, undo?: () => void) => setToast({ message: msg, undo });

  const selectView = (next: View) => {
    setView(next);
    setOpenId(null);
    setCanvasOpen(false);
    setSidebarOpen(false);
  };

  const focusCapture = () => {
    setStatusMenu(null);
    captureRef.current?.focus();
  };

  const create = async (title: string) => {
    const idea = await createIdea({ title, status: captureHost(view) });
    await reload();
    setFocusId(idea.id);
    flash("Idea capturada");
    return idea;
  };

  const patch = async (id: string, next: Parameters<typeof updateIdea>[1]) => {
    await updateIdea(id, next);
    await reload();
  };

  const restoreSnapshots = async (snapshots: Array<{ idea: Idea; comments: Comment[]; canvas: CanvasGraph }>) => {
    for (const snap of snapshots) {
      await restoreIdea(snap.idea, snap.comments, snap.canvas);
    }
    await reload();
    flash("Idea restaurada");
  };

  const remove = async (ids: string[]) => {
    if (!ids.length) return;
    const snapshots: Array<{ idea: Idea; comments: Comment[]; canvas: CanvasGraph }> = [];
    for (const id of ids) {
      const idea = ideas.find((row) => row.id === id);
      if (!idea) continue;
      const comments = await listComments(id);
      const canvas = await getCanvas(id);
      snapshots.push({ idea, comments, canvas });
      await deleteIdea(id);
    }
    if (openId && ids.includes(openId)) {
      setOpenId(null);
      setCanvasOpen(false);
    }
    setSelected((s) => {
      const n = new Set(s);
      for (const id of ids) n.delete(id);
      return n;
    });
    const focusIndex = focusId ? flatIds.indexOf(focusId) : -1;
    const remaining = flatIds.filter((id) => !ids.includes(id));
    setFocusId(remaining[Math.min(Math.max(focusIndex, 0), remaining.length - 1)] ?? null);
    await reload();
    flash(ids.length > 1 ? `${ids.length} ideas eliminadas` : "Idea eliminada", () => {
      void restoreSnapshots(snapshots);
    });
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

      if (canvasOpen) {
        if (key === "Escape") {
          if (document.querySelector(".canvas-node-modal")) return;
          e.preventDefault();
          setCanvasOpen(false);
        }
        return;
      }

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
          flash(`Movida a ${statusLabel(status)}`);
        }
        return;
      }

      if (overlay !== "none") return;

      if (meta && key === "Backspace" && !e.repeat) {
        const ids = actionIds();
        if (!ids.length) return;
        e.preventDefault();
        void remove(ids);
        return;
      }

      if (e.altKey && !meta) {
        const status = statusFromKeyboard(e);
        if (status && !e.repeat) {
          const ids = actionIds();
          if (!ids.length) return;
          e.preventDefault();
          void Promise.all(ids.map((id) => updateIdea(id, { status }))).then(reload);
          flash(`Movida a ${statusLabel(status)}`);
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
        focusCapture();
        return;
      }
      if (key === "/" && !e.repeat) {
        e.preventDefault();
        setOverlay("search");
        return;
      }
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
    inbox: ideas.filter((i) => i.status === "inbox").length,
    active: ideas.filter((i) => i.status !== "done").length,
  };

  if (!ready) {
    return (
      <div className="app">
        <aside className="sidebar" />
        <main className="main" />
      </div>
    );
  }

  const boot = bootStagger.current;
  let navI = 0;
  const navDelay = () => staggerDelay(navI++, boot, reduced);
  let listI = 0;
  const listDelay = () => staggerDelay(listI++, boot, reduced);

  const sidebarChrome = (
    <>
      <motion.a
        href="/"
        className="workspace"
        aria-label="Volver a Forge"
        initial={bootHidden(boot, reduced, { y: 8 })}
        animate={shown(reduced)}
        transition={enterTransition(reduced, navDelay())}
      >
        <ForgeMark />
        <div>
          <div className="workspace-name">Forge</div>
        </div>
        <span className="workspace-meta">DASH</span>
      </motion.a>
      <motion.button
        className="nav-search"
        onClick={() => setOverlay("command")}
        type="button"
        initial={bootHidden(boot, reduced, { y: 8 })}
        animate={shown(reduced)}
        transition={enterTransition(reduced, navDelay())}
      >
        <SearchIcon size={14} />
        <span className="grow">Buscar</span>
        <Kbd>⌘K</Kbd>
      </motion.button>
      <div className="nav-section">
        <NavItem
          icon={<InboxIcon />}
          label="Bandeja"
          count={counts.inbox}
          active={view === "inbox"}
          onClick={() => selectView("inbox")}
          animateEnter={boot}
          enterDelay={navDelay()}
        />
        <NavItem
          icon={<ViewsIcon />}
          label="Mis ideas"
          count={counts.active}
          active={view === "active"}
          onClick={() => selectView("active")}
          animateEnter={boot}
          enterDelay={navDelay()}
        />
        <NavItem
          icon={<ViewsIcon />}
          label="Todas las ideas"
          count={counts.all}
          active={view === "all"}
          onClick={() => selectView("all")}
          animateEnter={boot}
          enterDelay={navDelay()}
        />
      </div>
      <motion.div
        className="nav-label"
        initial={bootHidden(boot, reduced, { y: 8 })}
        animate={shown(reduced)}
        transition={enterTransition(reduced, navDelay())}
      >
        Estado
      </motion.div>
      <div className="nav-section">
        {STATUSES.map((s) => (
          <NavItem
            key={s.id}
            icon={<StatusIcon status={s.id} />}
            label={s.label}
            count={ideas.filter((i) => i.status === s.id).length}
            active={view === s.id}
            onClick={() => selectView(s.id)}
            animateEnter={boot}
            enterDelay={navDelay()}
          />
        ))}
      </div>
      <motion.div
        className="sidebar-foot"
        initial={bootHidden(boot, reduced, { y: 8 })}
        animate={shown(reduced)}
        transition={enterTransition(reduced, navDelay())}
      >
        <span className="sidebar-hint">
          <Kbd>C</Kbd> captura
        </span>
        <span className="sidebar-hint">
          <Kbd>J</Kbd>
          <span className="sidebar-hint-sep">/</span>
          <Kbd>K</Kbd> mover
        </span>
        <span className="sidebar-hint">
          <Kbd>/</Kbd> buscar
        </span>
      </motion.div>
    </>
  );

  return (
    <div className="app">
      {mobile ? (
        <AnimatePresence>
          {sidebarOpen ? (
            <motion.button
              key="drawer-overlay"
              type="button"
              className="drawer-overlay"
              aria-label="Cerrar menú"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reduced ? fadeQuick : exitEase}
              onClick={() => setSidebarOpen(false)}
            />
          ) : null}
          {sidebarOpen ? (
            <motion.aside
              key="drawer"
              className="sidebar"
              initial={hidden(reduced, { x: "-100%" })}
              animate={shown(reduced)}
              exit={hidden(reduced, { x: "-100%" })}
              transition={reduced ? fadeQuick : uiSpring}
            >
              {sidebarChrome}
            </motion.aside>
          ) : null}
        </AnimatePresence>
      ) : (
        <aside className="sidebar">{sidebarChrome}</aside>
      )}

      <main className="main">
        <header className="topbar">
          <button className="icon-btn" type="button" onClick={() => setSidebarOpen((v) => !v)} aria-label="Menú">
            <ViewsIcon />
          </button>
          <h1>{viewLabel(view)}</h1>
          <button className={`chip${view === "active" ? " active" : ""}`} type="button" onClick={() => selectView("active")}>
            Activas
          </button>
          <button className={`chip${view === "all" ? " active" : ""}`} type="button" onClick={() => selectView("all")}>
            Todas
          </button>
          <button className={`chip${query ? " active" : ""}`} type="button" onClick={() => setOverlay("search")}>
            <FilterIcon size={14} />
            <span className="filter-label">{query ? query : "Filtrar"}</span>
          </button>
          <span className="spacer" />
          <span className="topbar-count" style={{ color: "var(--text-4)", fontSize: 12 }}>
            {visible.length}
          </span>
          <button className="primary" type="button" onClick={focusCapture} aria-label="Nueva idea">
            <PlusIcon size={14} />
            <span className="primary-label">Nueva idea</span>
            <Kbd>C</Kbd>
          </button>
        </header>
        <Composer inputRef={captureRef} onCreate={async (title) => { await create(title); }} />
        <div className={`stage${openIdea ? " has-detail" : ""}`}>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={view}
              className="list"
              initial={boot ? false : hidden(reduced, { y: 8 })}
              animate={shown(reduced)}
              exit={hidden(reduced, { y: 8 })}
              transition={reduced ? fadeQuick : viewEase}
            >
              {visible.length === 0 ? (
                <Empty query={query} onCreate={focusCapture} onClear={() => setQuery("")} />
              ) : (
                <LayoutGroup>
                  {grouped.map((group) => (
                    <motion.section key={group.status} className="group" layout={!dragId}>
                      <motion.button
                        className={`group-head${drop?.status === group.status && drop.beforeId === null ? " drop-target" : ""}`}
                        type="button"
                        initial={bootHidden(boot, reduced, { y: 8 })}
                        animate={shown(reduced)}
                        transition={enterTransition(reduced, listDelay())}
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
                      </motion.button>
                      <AnimatePresence initial={boot}>
                        {!collapsed.has(group.status)
                          ? group.items.map((idea) => (
                              <IdeaRow
                                key={idea.id}
                                idea={idea}
                                focused={focusId === idea.id}
                                selected={selected.has(idea.id)}
                                dragging={dragId === idea.id}
                                layoutMotion={!dragId}
                                enterDelay={listDelay()}
                                dropTarget={Boolean(
                                  drop &&
                                    drop.status === idea.status &&
                                    dragId !== idea.id &&
                                    (drop.beforeId === idea.id ||
                                      (drop.beforeId === null &&
                                        idea.id === group.items.find((item) => item.id !== dragId)?.id)),
                                )}
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
                                labels={labels}
                              />
                            ))
                          : null}
                      </AnimatePresence>
                    </motion.section>
                  ))}
                </LayoutGroup>
              )}
            </motion.div>
          </AnimatePresence>
          <AnimatePresence>
            {openIdea ? (
              <motion.div
                key="detail"
                className="detail-shell"
                initial={hidden(reduced, mobile ? { x: "100%" } : { x: 28 })}
                animate={shown(reduced)}
                exit={hidden(reduced, mobile ? { x: "100%" } : { x: 28 })}
                transition={reduced ? fadeQuick : panelSpring}
              >
                <Detail
                  idea={openIdea}
                  labels={labels}
                  onBack={() => {
                    setCanvasOpen(false);
                    setOpenId(null);
                  }}
                  onChange={(next) => void patch(openIdea.id, next)}
                  onRefresh={() => void reload()}
                  onDelete={() => void remove([openIdea.id])}
                  onOpenCanvas={() => setCanvasOpen(true)}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>

      {canvasOpen && openIdea ? (
        <IdeaCanvas
          idea={openIdea}
          ideas={ideas}
          onClose={() => setCanvasOpen(false)}
          onOpenIdea={(id) => {
            setCanvasOpen(false);
            setOpenId(id);
            setFocusId(id);
          }}
          onError={(message) => flash(message)}
        />
      ) : null}

      <AnimatePresence>
        {overlay === "command" ? (
          <CommandPalette
            key="command"
            ideas={ideas}
            labels={labels}
            onClose={() => setOverlay("none")}
            onCreate={() => {
              setOverlay("none");
              focusCapture();
            }}
            onOpen={(id) => {
              setOpenId(id);
              setOverlay("none");
            }}
            onSearch={(q) => {
              setQuery(q);
              setOverlay("none");
            }}
          />
        ) : null}
        {overlay === "search" ? (
          <SearchOverlay
            key="search"
            value={query}
            ideas={ideas}
            labels={labels}
            onChange={setQuery}
            onClose={() => setOverlay("none")}
            onOpen={(id) => {
              setOpenId(id);
              setOverlay("none");
            }}
          />
        ) : null}
        {statusMenu ? (
          <StatusMenu
            key="status-menu"
            x={statusMenu.x}
            y={statusMenu.y}
            current={ideas.find((i) => i.id === statusMenu.id)?.status ?? "inbox"}
            onClose={() => setStatusMenu(null)}
            onPick={(status) => {
              void patch(statusMenu.id, { status });
              setStatusMenu(null);
            }}
          />
        ) : null}
        {toast ? (
          <motion.div
            key="toast"
            className="toast"
            initial={reduced ? { opacity: 0, x: "-50%" } : { opacity: 0, y: 16, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, x: "-50%" }}
            transition={reduced ? fadeQuick : uiSpring}
          >
            <span>{toast.message}</span>
            {toast.undo ? (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
              >
                Deshacer
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
