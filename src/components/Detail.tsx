import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { addComment, listComments } from "../db";
import { formatRelative, formatTime } from "../format";
import { CloseIcon, ForgeMark, PriorityIcon, StatusIcon } from "../icons";
import {
  LABEL_COLORS,
  priorityLabel,
  statusLabel,
  type Comment,
  type Idea,
} from "../types";
import { PriorityMenu } from "./PriorityMenu";
import { StatusMenu } from "./StatusMenu";

function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "0px";
  el.style.height = `${el.scrollHeight}px`;
}

function commentAuthor(comment: Comment) {
  return {
    name: comment.authorName ?? "Tú",
    initials: comment.authorInitials ?? "T",
    color: comment.authorColor ?? "#3a3f4b",
    you: !comment.authorName,
  };
}

export function Detail({
  idea,
  onBack,
  onChange,
  onDelete,
  onOpenCanvas,
}: {
  idea: Idea;
  onBack: () => void;
  onChange: (patch: Partial<Pick<Idea, "title" | "description" | "status" | "priority" | "labels">>) => void;
  onDelete: () => void;
  onOpenCanvas: () => void;
}) {
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [now] = useState(() => Date.now());
  const [propMenu, setPropMenu] = useState<{ kind: "status" | "priority"; x: number; y: number } | null>(null);
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

  return (
    <>
      <div className="detail">
        <div className="detail-head">
          <button className="chip" type="button" onClick={onBack}>
            Mis ideas
          </button>
          <StatusIcon status={idea.status} />
          <span className="ident">{idea.identifier}</span>
          <span className="spacer" />
          <button className="chip" type="button" onClick={onOpenCanvas}>
            Estructura
          </button>
          <button className="icon-btn" type="button" onClick={onBack} aria-label="Cerrar">

            <CloseIcon />
          </button>
        </div>
        <textarea
          ref={titleRef}
          className="detail-title"
          aria-label="Título"
          placeholder="Título de la idea"
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
          aria-label="Descripción"
          placeholder="Añade una descripción…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitDescription}
        />
        <section className="activity">
          <h2 className="activity-label">Actividad</h2>
          <div className="activity-item">
            <span className="activity-avatar" aria-hidden>
              <ForgeMark size={18} />
            </span>
            <div>
              <p>
                <strong>Forge</strong> creó la idea
              </p>
              <time dateTime={new Date(idea.createdAt).toISOString()}>{formatRelative(idea.createdAt, now)}</time>
            </div>
          </div>
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
              T
            </span>
            <input
              className="comment-input"
              placeholder="Escribe un comentario…"
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
          <div className="k">Estado</div>
          <button
            className="v"
            type="button"
            aria-haspopup="menu"
            aria-expanded={propMenu?.kind === "status"}
            aria-label={`Estado: ${statusLabel(idea.status)}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setPropMenu((current) =>
                current?.kind === "status" ? null : { kind: "status", x: r.left, y: r.bottom + 4 },
              );
            }}
          >
            <StatusIcon status={idea.status} />
            {statusLabel(idea.status)}
          </button>
        </div>
        <div className="prop">
          <div className="k">Prioridad</div>
          <button
            className="v"
            type="button"
            aria-haspopup="menu"
            aria-expanded={propMenu?.kind === "priority"}
            aria-label={`Prioridad: ${priorityLabel(idea.priority)}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setPropMenu((current) =>
                current?.kind === "priority" ? null : { kind: "priority", x: r.left, y: r.bottom + 4 },
              );
            }}
          >
            <PriorityIcon priority={idea.priority} />
            {priorityLabel(idea.priority)}
          </button>
        </div>
        <div className="prop">
          <div className="k">Etiquetas</div>
          <div className="v labels-v">
            {idea.labels.length === 0 ? (
              <span className="muted">Ninguna</span>
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
          <div className="k">Creada</div>
          <div className="v">{formatTime(idea.createdAt)}</div>
        </div>
        <div className="prop">
          <div className="k">Actualizada</div>
          <div className="v">{formatTime(idea.updatedAt)}</div>
        </div>
        <button className="danger-button" type="button" onClick={onDelete}>
          Eliminar idea
        </button>
      </aside>
      <AnimatePresence>
        {propMenu?.kind === "status" ? (
          <StatusMenu
            key="status"
            x={propMenu.x}
            y={propMenu.y}
            current={idea.status}
            onClose={() => setPropMenu(null)}
            onPick={(status) => {
              onChange({ status });
              setPropMenu(null);
            }}
          />
        ) : null}
        {propMenu?.kind === "priority" ? (
          <PriorityMenu
            key="priority"
            x={propMenu.x}
            y={propMenu.y}
            current={idea.priority}
            onClose={() => setPropMenu(null)}
            onPick={(priority) => {
              onChange({ priority });
              setPropMenu(null);
            }}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
