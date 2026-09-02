import { useEffect, useRef, useState, type ReactNode } from "react";
import { Kbd, PriorityIcon, StatusIcon } from "../icons";
import { PRIORITIES, STATUSES, statusLabel, type Priority, type Status } from "../types";

export function Composer({
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
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const node = titleRef.current ?? document.getElementById("forge-composer-title");
    if (node instanceof HTMLElement) node.focus();
  }, []);

  const submit = () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    void onCreate(title, description, status, priority).finally(() => setBusy(false));
  };

  const cycleStatus = () => {
    setStatus((s) => STATUSES[(STATUSES.findIndex((x) => x.id === s) + 1) % STATUSES.length]!.id);
  };

  const cyclePriority = () => {
    setPriority(((priority + 1) % 5) as Priority);
  };

  const growBody = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.max(128, Math.min(el.scrollHeight, 280))}px`;
  };

  const canCreate = Boolean(title.trim()) && !busy;
  const priorityName = PRIORITIES.find((p) => p.id === priority)?.label;

  return (
    <div className="overlay" onMouseDown={onClose}>
      <form
        className="composer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forge-composer-title"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      >
        <input
          ref={titleRef}
          id="forge-composer-title"
          className="composer-title"
          placeholder="Idea title"
          value={title}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="composer-body"
          placeholder="Add description…"
          value={description}
          rows={3}
          onChange={(e) => {
            setDescription(e.target.value);
            growBody(e.target);
          }}
        />
        <div className="composer-bar">
          <button className="chip" type="button" aria-label={`Status ${statusLabel(status)}`} onClick={cycleStatus}>
            <StatusIcon status={status} />
            {statusLabel(status)}
          </button>
          <button className="chip" type="button" aria-label={`Priority ${priorityName}`} onClick={cyclePriority}>
            <PriorityIcon priority={priority} />
            {priorityName}
          </button>
          <span className="spacer" />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#62666d", fontSize: 12 }}>
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd>
          </span>
          <button className="primary" type="submit" disabled={!canCreate}>
            Create idea
          </button>
        </div>
      </form>
    </div>
  );
}

export function NavItem({
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
