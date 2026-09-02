import { LABEL_COLORS, PRIORITIES, type Idea } from "../types";
import { formatTime } from "../format";
import { PriorityIcon, StatusIcon } from "../icons";

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
