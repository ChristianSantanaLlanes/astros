import { useEffect, useState } from "react";
import { addComment, listComments } from "../db";
import { CloseIcon, PriorityIcon, StatusIcon } from "../icons";
import { LABEL_COLORS, PRIORITIES, STATUSES, statusLabel, type Comment, type Idea, type Priority } from "../types";

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

  useEffect(() => {
    setTitle(idea.title);
    setDescription(idea.description);
    void listComments(idea.id).then(setComments);
  }, [idea.id, idea.title, idea.description]);

  return (
    <div className="detail-shell">
      <div className="detail">
        <div className="detail-head">
          <button className="chip" type="button" onClick={onBack}>
            All ideas
          </button>
          <span className="ident">{idea.identifier}</span>
          <span className="spacer" />
          <button className="icon-btn" type="button" onClick={onDelete} aria-label="Delete">
            <CloseIcon />
          </button>
        </div>
        <input
          className="detail-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title !== idea.title) onChange({ title });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <textarea
          className="detail-body"
          placeholder="Write a description…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            if (description !== idea.description) onChange({ description });
          }}
        />
        <div className="comments">
          {comments.map((c) => (
            <div className="comment" key={c.id}>
              <time>{new Date(c.createdAt).toLocaleString()}</time>
              {c.body}
            </div>
          ))}
          <input
            className="comment-input"
            placeholder="Leave a comment…  Enter to send"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                void addComment(idea.id, draft).then((c) => {
                  setComments((list) => [...list, c]);
                  setDraft("");
                });
              }
            }}
          />
        </div>
      </div>
      <aside className="props">
        <div className="prop">
          <div className="k">Status</div>
          <button
            className="v"
            type="button"
            onClick={() => {
              const i = STATUSES.findIndex((s) => s.id === idea.status);
              onChange({ status: STATUSES[(i + 1) % STATUSES.length]!.id });
            }}
          >
            <StatusIcon status={idea.status} />
            {statusLabel(idea.status)}
          </button>
        </div>
        <div className="prop">
          <div className="k">Priority</div>
          <button className="v" type="button" onClick={() => onChange({ priority: (((idea.priority + 1) % 5) as Priority) })}>
            <PriorityIcon priority={idea.priority} />
            {PRIORITIES.find((p) => p.id === idea.priority)?.label}
          </button>
        </div>
        <div className="prop">
          <div className="k">Labels</div>
          <div className="v" style={{ height: "auto", padding: "6px 0", flexWrap: "wrap" }}>
            {idea.labels.map((label) => (
              <span className="label" key={label}>
                <span className="dot" style={{ background: LABEL_COLORS[label] ?? "#8a8f98" }} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="prop">
          <div className="k">Created</div>
          <div className="v">{new Date(idea.createdAt).toLocaleString()}</div>
        </div>
        <div className="prop">
          <div className="k">Updated</div>
          <div className="v">{new Date(idea.updatedAt).toLocaleString()}</div>
        </div>
      </aside>
    </div>
  );
}
