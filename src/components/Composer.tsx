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
  const [openBody, setOpenBody] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
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

  const priorityName = PRIORITIES.find((p) => p.id === priority)?.label ?? "No priority";

  return (
    <form
      className="inline-capture"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      }}
    >
      <div className="row inline-capture-row focused">
        <span className="prio-slot">
          <button type="button" className="icon-btn" aria-label={`Priority ${priorityName}`} onClick={cyclePriority}>
            <PriorityIcon priority={priority} size={14} />
          </button>
        </span>
        <span className="ident">FOR</span>
        <button type="button" className="status-btn" aria-label={`Status ${statusLabel(status)}`} onClick={cycleStatus}>
          <StatusIcon status={status} size={14} />
        </button>
        <input
          ref={titleRef}
          className="inline-capture-title"
          placeholder="Issue title"
          value={title}
          autoComplete="off"
          spellCheck
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (title.trim()) submit();
              else setOpenBody(true);
            }
            if (e.key === "Tab" && !e.shiftKey) {
              e.preventDefault();
              setOpenBody(true);
            }
          }}
        />
        <span className="inline-capture-hint">
          <Kbd>↵</Kbd>
        </span>
      </div>
      {openBody ? (
        <textarea
          className="inline-capture-body"
          placeholder="Add description…"
          value={description}
          autoFocus
          onChange={(e) => setDescription(e.target.value)}
        />
      ) : null}
    </form>
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
