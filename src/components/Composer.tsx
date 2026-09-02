import { useEffect, useState, type ReactNode } from "react";
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

  useEffect(() => {
    const node = document.getElementById("forge-composer-title");
    node?.focus();
  }, []);

  const submit = () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    void onCreate(title, description, status, priority).finally(() => setBusy(false));
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
          id="forge-composer-title"
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
          <button
            className="chip"
            type="button"
            onClick={() => setStatus((s) => STATUSES[(STATUSES.findIndex((x) => x.id === s) + 1) % STATUSES.length]!.id)}
          >
            <StatusIcon status={status} />
            {statusLabel(status)}
          </button>
          <button className="chip" type="button" onClick={() => setPriority(((priority + 1) % 5) as Priority)}>
            <PriorityIcon priority={priority} />
            {PRIORITIES.find((p) => p.id === priority)?.label}
          </button>
          <span className="spacer" />
          <span style={{ color: "var(--text-4)", fontSize: 12 }}>
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd> create
          </span>
          <button className="primary" type="submit" disabled={!title.trim() || busy}>
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
