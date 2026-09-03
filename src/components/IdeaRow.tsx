import type { DragEvent } from "react";
import { forwardRef } from "react";
import { motion } from "motion/react";
import { PRIORITIES, resolveLabels, type Idea, type Label } from "../types";
import { formatTime } from "../format";
import { PriorityIcon, StatusIcon } from "../icons";
import { exitEase, fadeQuick, hidden, shown, uiSpring, useMotionPreference } from "../motion";

export const IdeaRow = forwardRef<
  HTMLDivElement,
  {
    idea: Idea;
    labels: Label[];
    focused: boolean;
    selected: boolean;
    dragging: boolean;
    dropTarget: boolean;
    enterDelay?: number;
    layoutMotion?: boolean;
    onFocus: () => void;
    onOpen: () => void;
    onStatus: (el: HTMLElement) => void;
    onDragStart: () => void;
    onDragOver: () => void;
    onDrop: () => void;
    onDragEnd: () => void;
  }
>(function IdeaRow(
  {
    idea,
    labels,
    focused,
    selected,
    dragging,
    dropTarget,
    enterDelay = 0,
    layoutMotion = true,
    onFocus,
    onOpen,
    onStatus,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  },
  ref,
) {
  const priority = PRIORITIES.find((p) => p.id === idea.priority);
  const reduced = useMotionPreference();
  const assigned = resolveLabels(idea.labels, labels);

  const startDrag = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", idea.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart();
  };

  return (
    <motion.div
      ref={ref}
      layout={layoutMotion}
      initial={hidden(reduced, { y: -10, scale: 0.98 })}
      animate={shown(reduced)}
      exit={
        reduced
          ? { opacity: 0, transition: fadeQuick }
          : { opacity: 0, height: 0, transition: exitEase }
      }
      transition={
        reduced
          ? fadeQuick
          : {
              ...uiSpring,
              delay: enterDelay,
              layout: { ...uiSpring, delay: 0 },
            }
      }
      style={{ overflow: "hidden", width: "100%" }}
    >
      <div
        id={`row-${idea.id}`}
        className={`row${focused ? " focused" : ""}${selected ? " selected" : ""}${dragging ? " dragging" : ""}${dropTarget ? " drop-target" : ""}`}
        draggable="true"
        onClick={onFocus}
        onDoubleClick={onOpen}
        onDragStart={startDrag}
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
          aria-label="Cambiar estado"
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
          {assigned.map((label) => (
            <span className="label" key={label.id}>
              <span className="dot" style={{ background: label.color }} />
              {label.name}
            </span>
          ))}
        </span>
        <span className="ident date">{formatTime(idea.updatedAt)}</span>
      </div>
    </motion.div>
  );
});
