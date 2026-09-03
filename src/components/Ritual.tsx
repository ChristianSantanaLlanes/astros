import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { isTypingTarget } from "../format";
import { CheckIcon, CloseIcon, InboxIcon, Kbd, StatusIcon } from "../icons";
import { exitEase, fadeQuick, hidden, uiSpring, useMotionPreference } from "../motion";
import type { Idea } from "../types";

type Step = "dump" | "choose" | "park" | "summary";

type ParkAction = "planned" | "inbox";

export function Ritual({
  ideas,
  lastCompletedAt,
  onClose,
  onCreate,
  onPrioritize,
  onPark,
  onComplete,
}: {
  ideas: Idea[];
  lastCompletedAt: number | null;
  onClose: () => void;
  onCreate: (title: string) => Promise<void>;
  onPrioritize: (id: string) => Promise<void>;
  onPark: (ids: string[], action: ParkAction) => Promise<void>;
  onComplete: () => Promise<void>;
}) {
  const reduced = useMotionPreference();
  const captureRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("dump");
  const [capture, setCapture] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [parkAction, setParkAction] = useState<ParkAction>("planned");
  const [busy, setBusy] = useState(false);
  const [dumpedCount, setDumpedCount] = useState(0);
  const [parkedCount, setParkedCount] = useState(0);
  const [inboxAfter, setInboxAfter] = useState(0);

  const inbox = useMemo(
    () => ideas.filter((idea) => idea.status === "inbox").sort((a, b) => a.order - b.order || a.number - b.number),
    [ideas],
  );

  const remaining = useMemo(
    () => inbox.filter((idea) => idea.id !== chosenId),
    [chosenId, inbox],
  );

  const chosen = ideas.find((idea) => idea.id === chosenId) ?? null;

  useEffect(() => {
    if (step === "dump") captureRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== "choose") return;
    if (!focusId || !inbox.some((idea) => idea.id === focusId)) {
      setFocusId(inbox[0]?.id ?? null);
    }
  }, [focusId, inbox, step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (busy || e.isComposing) return;

      if (step === "choose" && !isTypingTarget(e.target)) {
        const ids = inbox.map((idea) => idea.id);
        if (!ids.length) return;
        if (e.key === "j" || e.key === "ArrowDown") {
          e.preventDefault();
          const i = focusId ? ids.indexOf(focusId) : -1;
          setFocusId(ids[Math.min(ids.length - 1, Math.max(0, i) + 1)] ?? ids[0]!);
          return;
        }
        if (e.key === "k" || e.key === "ArrowUp") {
          e.preventDefault();
          const i = focusId ? ids.indexOf(focusId) : ids.length;
          setFocusId(ids[Math.max(0, i - 1)] ?? ids[0]!);
          return;
        }
        if (e.key === "Enter" && focusId) {
          e.preventDefault();
          void pickIdea(focusId);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const submitCapture = async () => {
    const title = capture.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await onCreate(title);
      setCapture("");
      setDumpedCount((n) => n + 1);
      captureRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const pickIdea = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await onPrioritize(id);
      setChosenId(id);
      setStep("park");
    } finally {
      setBusy(false);
    }
  };

  const finishPark = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ids = remaining.map((idea) => idea.id);
      const moved = parkAction === "planned" ? ids.length : 0;
      if (ids.length && parkAction === "planned") {
        await onPark(ids, "planned");
      }
      await onComplete();
      setParkedCount(moved);
      setInboxAfter(parkAction === "inbox" ? ids.length : 0);
      setStep("summary");
    } finally {
      setBusy(false);
    }
  };

  const finishEmpty = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onComplete();
      setParkedCount(0);
      setInboxAfter(0);
      setStep("summary");
    } finally {
      setBusy(false);
    }
  };

  const lastLabel = lastCompletedAt
    ? `Último ritual: ${new Date(lastCompletedAt).toLocaleString("es", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "Primera vez en el ritual";

  return (
    <motion.div
      className="ritual-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ritual-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduced ? fadeQuick : exitEase}
    >
      <motion.div
        className="ritual-panel"
        initial={hidden(reduced, { y: 16, scale: 0.98 })}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={hidden(reduced, { y: 12, scale: 0.98 })}
        transition={reduced ? fadeQuick : uiSpring}
      >
        <header className="ritual-head">
          <div>
            <p className="ritual-kicker">15 minutos</p>
            <h2 id="ritual-title">Vaciar la cabeza</h2>
            <p className="ritual-sub">{lastLabel}</p>
          </div>
          <button className="icon-btn" type="button" aria-label="Cerrar ritual" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <ol className="ritual-steps" aria-label="Pasos del ritual">
          {(
            [
              ["dump", "Capturar"],
              ["choose", "Elegir una"],
              ["park", "Aparcar"],
              ["summary", "Cerrar"],
            ] as const
          ).map(([id, label]) => (
            <li key={id} className={step === id ? "active" : ""} data-done={stepOrder(step) > stepOrder(id) ? "true" : undefined}>
              {label}
            </li>
          ))}
        </ol>

        {step === "dump" ? (
          <div className="ritual-body">
            <p className="ritual-copy">
              Vuelca todo lo que quedó a medias. No priorices todavía: solo captura.
            </p>
            <form
              className="ritual-capture"
              onSubmit={(e) => {
                e.preventDefault();
                void submitCapture();
              }}
            >
              <InboxIcon size={16} />
              <input
                ref={captureRef}
                value={capture}
                onChange={(e) => setCapture(e.target.value)}
                placeholder="¿Qué quedó en la cabeza?"
                aria-label="Capturar idea"
                disabled={busy}
              />
              <Kbd>Enter</Kbd>
            </form>
            <div className="ritual-meta-row">
              <span>
                {inbox.length} en bandeja
                {dumpedCount > 0 ? ` · ${dumpedCount} nuevas` : ""}
              </span>
            </div>
            <ul className="ritual-list compact">
              {inbox.slice(0, 8).map((idea) => (
                <li key={idea.id}>
                  <StatusIcon status={idea.status} />
                  <span className="ident">{idea.identifier}</span>
                  <span className="title">{idea.title}</span>
                </li>
              ))}
              {inbox.length > 8 ? <li className="ritual-more">+{inbox.length - 8} más</li> : null}
              {inbox.length === 0 ? <li className="ritual-empty">Bandeja vacía — captura al menos una idea o continúa.</li> : null}
            </ul>
            <div className="ritual-actions">
              <button className="ghost" type="button" onClick={onClose}>
                Salir
              </button>
              <button
                className="primary"
                type="button"
                disabled={busy}
                onClick={() => {
                  if (inbox.length) setStep("choose");
                  else void finishEmpty();
                }}
              >
                {inbox.length ? "Ya capturé" : "Cerrar sin ideas"}
              </button>
            </div>
          </div>
        ) : null}

        {step === "choose" ? (
          <div className="ritual-body">
            <p className="ritual-copy">
              Elige <strong>una</strong> idea para hoy. Entrará en progreso. El resto se aparca después.
            </p>
            <ul className="ritual-list" role="listbox" aria-label="Ideas de la bandeja">
              {inbox.map((idea) => {
                const active = idea.id === focusId;
                return (
                  <li key={idea.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`ritual-pick${active ? " active" : ""}`}
                      disabled={busy}
                      onMouseEnter={() => setFocusId(idea.id)}
                      onClick={() => void pickIdea(idea.id)}
                    >
                      <StatusIcon status={idea.status} />
                      <span className="ident">{idea.identifier}</span>
                      <span className="title">{idea.title}</span>
                      {active ? <Kbd>Enter</Kbd> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="ritual-actions">
              <button className="ghost" type="button" onClick={() => setStep("dump")}>
                Atrás
              </button>
              <span className="ritual-hint">
                <Kbd>J</Kbd>/<Kbd>K</Kbd> mover
              </span>
            </div>
          </div>
        ) : null}

        {step === "park" ? (
          <div className="ritual-body">
            <p className="ritual-copy">
              Prioridad lista. ¿Qué hacemos con las {remaining.length} ideas que quedan en bandeja?
            </p>
            {chosen ? (
              <div className="ritual-chosen">
                <CheckIcon size={14} />
                <span>
                  Hoy: <strong>{chosen.title}</strong>
                </span>
              </div>
            ) : null}
            <div className="ritual-park-options">
              <button
                type="button"
                className={`ritual-option${parkAction === "planned" ? " active" : ""}`}
                onClick={() => setParkAction("planned")}
              >
                <StatusIcon status="planned" />
                <span>
                  <strong>Aparcar a Por hacer</strong>
                  <small>Salen de la bandeja; las revisas cuando quieras.</small>
                </span>
              </button>
              <button
                type="button"
                className={`ritual-option${parkAction === "inbox" ? " active" : ""}`}
                onClick={() => setParkAction("inbox")}
              >
                <StatusIcon status="inbox" />
                <span>
                  <strong>Dejar en bandeja</strong>
                  <small>Siguen ahí para otra pasada.</small>
                </span>
              </button>
            </div>
            {remaining.length > 0 ? (
              <ul className="ritual-list compact">
                {remaining.slice(0, 6).map((idea) => (
                  <li key={idea.id}>
                    <StatusIcon status={idea.status} />
                    <span className="ident">{idea.identifier}</span>
                    <span className="title">{idea.title}</span>
                  </li>
                ))}
                {remaining.length > 6 ? <li className="ritual-more">+{remaining.length - 6} más</li> : null}
              </ul>
            ) : (
              <p className="ritual-empty">No queda nada que aparcar.</p>
            )}
            <div className="ritual-actions">
              <button className="ghost" type="button" onClick={() => setStep("choose")} disabled={busy}>
                Atrás
              </button>
              <button className="primary" type="button" disabled={busy} onClick={() => void finishPark()}>
                Cerrar ritual
              </button>
            </div>
          </div>
        ) : null}

        {step === "summary" ? (
          <div className="ritual-body">
            <p className="ritual-copy">Listo. La cabeza más ligera, una idea clara.</p>
            <div className="ritual-summary">
              {chosen ? (
                <div className="ritual-summary-card">
                  <span className="label">Foco de hoy</span>
                  <strong>{chosen.title}</strong>
                  <span className="meta">{chosen.identifier} · En progreso</span>
                </div>
              ) : (
                <div className="ritual-summary-card">
                  <span className="label">Sin foco</span>
                  <strong>No elegiste una idea</strong>
                  <span className="meta">Vuelve cuando la bandeja tenga algo.</span>
                </div>
              )}
              <div className="ritual-summary-stats">
                <div>
                  <strong>{dumpedCount}</strong>
                  <span>capturadas</span>
                </div>
                <div>
                  <strong>{parkedCount}</strong>
                  <span>aparcadas</span>
                </div>
                <div>
                  <strong>{inboxAfter}</strong>
                  <span>en bandeja</span>
                </div>
              </div>
            </div>
            <div className="ritual-actions">
              <button className="primary" type="button" onClick={onClose}>
                Volver a Forge
              </button>
            </div>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

function stepOrder(step: Step): number {
  if (step === "dump") return 0;
  if (step === "choose") return 1;
  if (step === "park") return 2;
  return 3;
}
