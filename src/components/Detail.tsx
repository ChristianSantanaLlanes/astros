import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { addComment, listComments } from "../db";
import { formatRelative, formatTime, prFor } from "../format";
import { CloseIcon, ForgeMark, GitPullIcon, PriorityIcon, StatusIcon } from "../icons";
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

function commentAuthor(comment: Comment) {
  return {
    name: comment.authorName ?? "You",
    initials: comment.authorInitials ?? "Y",
    color: comment.authorColor ?? "#3a3f4b",
    you: !comment.authorName,
  };
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
  const [now] = useState(() => Date.now());
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
  const labelActor = ownerFor(idea.number + 2);
  const pr = prFor(idea);
  const workSeconds = 8 + (idea.number % 7) * 3;
  const brief = idea.description.split("\n")[0]?.trim() ?? idea.title;

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
        <div className="detail-split">
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
                <time dateTime={new Date(idea.createdAt).toISOString()}>{formatRelative(idea.createdAt, now)}</time>
              </div>
            </div>
            {idea.labels.length > 0 ? (
              <div className="activity-item">
                <span className="activity-avatar" aria-hidden style={{ background: labelActor.color }}>
                  {labelActor.initials}
                </span>
                <div>
                  <p>
                    <strong>{labelActor.name}</strong> added the labels{" "}
                    {idea.labels.map((label, i) => (
                      <span key={label}>
                        {i > 0 ? " and " : null}
                        <span className="activity-label-chip">
                          <span className="dot" style={{ background: LABEL_COLORS[label] ?? "#8a8f98" }} />
                          {label}
                        </span>
                      </span>
                    ))}
                  </p>
                  <time dateTime={new Date(idea.createdAt + 120_000).toISOString()}>
                    {formatRelative(idea.createdAt + 120_000, now)}
                  </time>
                </div>
              </div>
            ) : null}
            {idea.status !== "backlog" ? (
              <div className="activity-item">
                <span className="activity-avatar" aria-hidden style={{ background: statusActor.color }}>
                  {statusActor.initials}
                </span>
                <div>
                  <p>
                    <strong>{statusActor.name}</strong> set status to {statusLabel(idea.status)}
                  </p>
                  <time dateTime={new Date(idea.updatedAt).toISOString()}>{formatRelative(idea.updatedAt, now)}</time>
                </div>
              </div>
            ) : null}
            {pr ? (
              <div className="activity-item">
                <span className="activity-avatar pr-avatar" aria-hidden>
                  <GitPullIcon size={12} />
                </span>
                <div>
                  <p>
                    <strong>{statusActor.name}</strong> opened pull request <span className="pr">{pr}</span>
                  </p>
                  <time dateTime={new Date(idea.updatedAt).toISOString()}>{formatRelative(idea.updatedAt, now)}</time>
                </div>
              </div>
            ) : null}
            {comments.map((comment) => {
              const author = commentAuthor(comment);
              return (
                <div className="activity-item comment" key={comment.id}>
                  <span
                    className={`activity-avatar${author.you ? " you" : ""}`}
                    aria-hidden
                    style={author.you ? undefined : { background: author.color }}
                  >
                    {author.initials}
                  </span>
                  <div>
                    <p>
                      <strong>{author.name}</strong>
                      <time dateTime={new Date(comment.createdAt).toISOString()}>
                        {formatRelative(comment.createdAt, now)}
                      </time>
                    </p>
                    <div className="comment-body">{comment.body}</div>
                  </div>
                </div>
              );
            })}
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
          <aside className="work-panel" aria-label="Agent work">
            <header className="work-head">
              <span className="work-mark">
                <ForgeMark size={16} />
              </span>
              <div>
                <strong>Forge</strong>
                <span>Composer</span>
              </div>
            </header>
            <p className="work-bubble">{brief}</p>
            <div className="work-meta">
              <StatusIcon status={idea.status} size={12} />
              <span className="ident">{idea.identifier}</span> added to context
            </div>
            {pr ? (
              <>
                <div className="work-meta work-timer">Worked for {workSeconds} sec</div>
                <p className="work-log">
                  Pushed and opened a draft PR. Capture is a list row with the same cells as every issue.
                  {idea.status === "in_progress" ? " Checks running." : " Merged."}
                </p>
                <div className="work-pr">
                  <GitPullIcon size={13} />
                  <span className="pr">{pr}</span>
                  {idea.status === "in_progress" ? <span className="cycle">Working</span> : <span className="cycle">Done</span>}
                </div>
              </>
            ) : (
              <p className="work-log">No pull request yet. Start work to open a draft PR from this issue.</p>
            )}
          </aside>
        </div>
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
          <div className="k">Pull request</div>
          <div className="v">
            {pr ? (
              <>
                <GitPullIcon size={13} />
                <span className="pr">{pr}</span>
              </>
            ) : (
              <span className="muted">None</span>
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
