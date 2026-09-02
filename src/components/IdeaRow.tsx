import { LABEL_COLORS, PRIORITIES, type Idea } from "../types";
import { formatTime, prFor } from "../format";
import { PriorityIcon, StatusIcon } from "../icons";
import { ownerFor } from "../owners";

export function IdeaRow({
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
  const priority = PRIORITIES.find((p) => p.id === idea.priority);
  const owner = ownerFor(idea.number);
  const pr = prFor(idea);

  return (
    <div
      id={`row-${idea.id}`}
      className={`row${focused ? " focused" : ""}${selected ? " selected" : ""}${dragging ? " dragging" : ""}${dropTarget ? " drop-target" : ""}`}
      draggable="true"
      onClick={onFocus}
      onDoubleClick={onOpen}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", idea.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop();
      }}
      onDragEnd={onDragEnd}
    >
      <span className="prio-slot" title={priority?.label}>
        <PriorityIcon priority={idea.priority} size={14} />
      </span>
      <span className="ident">{idea.identifier}</span>
      <button
        type="button"
        className="status-btn"
        draggable={false}
        aria-label="Change status"
        onClick={(e) => {
          e.stopPropagation();
          onStatus(e.currentTarget);
        }}
      >
        <StatusIcon status={idea.status} size={14} />
      </button>
      <span className="title" title={idea.title}>
        {idea.title}
      </span>
      <span className="labels">
        {pr ? <span className="pr">{pr}</span> : null}
        {idea.status === "in_progress" ? <span className="cycle">Working</span> : null}
        {idea.labels.map((label) => (
          <span className="label" key={label}>
            <span className="dot" style={{ background: LABEL_COLORS[label] ?? "#8a8f98" }} />
            {label}
          </span>
        ))}
      </span>
      <span className="owner" title={owner.name} style={{ background: owner.color }}>
        {owner.initials}
      </span>
      <span className="ident date">{formatTime(idea.updatedAt)}</span>
    </div>
  );
}
