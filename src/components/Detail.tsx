import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { addComment, listComments } from "../db";
import { formatTime } from "../format";
import { CloseIcon, ForgeMark, PriorityIcon, StatusIcon } from "../icons";
import { ownerFor } from "../owners";
import {
  LABEL_COLORS,
  STATUSES,
  priorityLabel,
  statusLabel,
  type Comment,
  type Idea,
  type Priority,
} from "../types";

function cycleStatus(status: Idea["status"]): Idea["status"] {
  const i = STATUSES.findIndex((s) => s.id === status);
  return STATUSES[(i + 1) % STATUSES.length]!.id;
}

function cyclePriority(priority: Priority): Priority {
  return ((priority + 1) % 5) as Priority;
}

function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "0px";
  el.style.height = `${el.scrollHeight}px`;
}

export function Detail({
  idea,
  onBack,
  onChange,
  onDelete,
}: {
  idea: Idea;
  onBack: () => void;
  onChange: (patch: Partial<Pick<Idea, "title" | "description" | "status" | "priority" | "labels">>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const sending = useRef(false);

  useEffect(() => {
    setTitle(idea.title);
    setDescription(idea.description);
    void listComments(idea.id).then(setComments);
  }, [idea.id, idea.title, idea.description]);

  useLayoutEffect(() => {
    autosize(titleRef.current);
    autosize(bodyRef.current);
  }, [title, description]);

  const commitTitle = () => {
    const next = title.trim();
    if (!next) {
      setTitle(idea.title);
      return;
    }
    if (next !== idea.title) onChange({ title: next });
  };

  const commitDescription = () => {
    if (description !== idea.description) onChange({ description });
  };

  const sendComment = () => {
    const body = draft.trim();
    if (!body || sending.current) return;
    sending.current = true;
    void addComment(idea.id, body)
      .then((comment) => {
        setComments((list) => [...list, comment]);
        setDraft("");
      })
      .finally(() => {
        sending.current = false;
      });
  };

  const owner = ownerFor(idea.number);
  const statusActor = ownerFor(idea.number + 1);

  return (
    <div className="detail-shell">
      <div className="detail">
        <div className="detail-head">
          <button className="chip" type="button" onClick={onBack}>
            My issues
          </button>
          <StatusIcon status={idea.status} />
          <span className="ident">{idea.identifier}</span>
          <span className="spacer" />
          <button className="icon-btn" type="button" onClick={onDelete} aria-label="Delete">
            <CloseIcon />
          </button>
        </div>
        <textarea
          ref={titleRef}
          className="detail-title"
          aria-label="Title"
          placeholder="Issue title"
          rows={1}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
        <textarea
          ref={bodyRef}
          className="detail-body"
          aria-label="Description"
          placeholder="Add description…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitDescription}
        />
        <section className="activity">
          <h2 className="activity-label">Activity</h2>
          <div className="activity-item">
            <span className="activity-avatar" aria-hidden>
              <ForgeMark size={18} />
            </span>
            <div>
              <p>
                <strong>Forge</strong> created the issue
              </p>
              <time dateTime={new Date(idea.createdAt).toISOString()}>{formatTime(idea.createdAt)}</time>
            </div>
          </div>
          {idea.status !== "backlog" ? (
            <div className="activity-item">
              <span className="activity-avatar" aria-hidden style={{ background: statusActor.color }}>
                {statusActor.initials}
              </span>
              <div>
                <p>
                  <strong>{statusActor.name}</strong> set status to {statusLabel(idea.status)}
                </p>
                <time dateTime={new Date(idea.updatedAt).toISOString()}>{formatTime(idea.updatedAt)}</time>
              </div>
            </div>
          ) : null}
          {comments.map((comment) => (
            <div className="activity-item comment" key={comment.id}>
              <span className="activity-avatar you" aria-hidden>
                Y
              </span>
              <div>
                <p>
                  <strong>You</strong>
                </p>
                <time dateTime={new Date(comment.createdAt).toISOString()}>{formatTime(comment.createdAt)}</time>
                <div className="comment-body">{comment.body}</div>
              </div>
            </div>
          ))}
          <div className="activity-item compose">
            <span className="activity-avatar you" aria-hidden>
              Y
            </span>
            <input
              className="comment-input"
              placeholder="Leave a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                e.preventDefault();
                sendComment();
              }}
            />
          </div>
        </section>
      </div>
      <aside className="props">
        <div className="prop">
          <div className="k">Status</div>
          <button
            className="v"
            type="button"
            aria-label={`Status: ${statusLabel(idea.status)}. Click to cycle.`}
            onClick={() => onChange({ status: cycleStatus(idea.status) })}
          >
            <StatusIcon status={idea.status} />
            {statusLabel(idea.status)}
          </button>
        </div>
        <div className="prop">
          <div className="k">Priority</div>
          <button
            className="v"
            type="button"
            aria-label={`Priority: ${priorityLabel(idea.priority)}. Click to cycle.`}
            onClick={() => onChange({ priority: cyclePriority(idea.priority) })}
          >
            <PriorityIcon priority={idea.priority} />
            {priorityLabel(idea.priority)}
          </button>
        </div>
        <div className="prop">
          <div className="k">Assignee</div>
          <div className="v">
            <span className="owner" title={owner.name} style={{ background: owner.color }}>
              {owner.initials}
            </span>
            {owner.name}
          </div>
        </div>
        <div className="prop">
          <div className="k">Labels</div>
          <div className="v labels-v">
            {idea.labels.length === 0 ? (
              <span className="muted">No labels</span>
            ) : (
              idea.labels.map((label) => (
                <span className="label" key={label}>
                  <span className="dot" style={{ background: LABEL_COLORS[label] ?? "#8a8f98" }} />
                  {label}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="prop">
          <div className="k">Created</div>
          <div className="v">{formatTime(idea.createdAt)}</div>
        </div>
        <div className="prop">
          <div className="k">Updated</div>
          <div className="v">{formatTime(idea.updatedAt)}</div>
        </div>
      </aside>
    </div>
  );
}
