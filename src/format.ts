import type { Status } from "./types";

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatRelative(ts: number, now: number): string {
  const delta = Math.max(0, now - ts);
  const mins = Math.round(delta / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatTime(ts);
}

export function prFor(idea: { status: Status; number: number }): string | null {
  if (idea.status !== "in_progress" && idea.status !== "done") return null;
  return `#${54000 + idea.number * 17}`;
}

const NON_TEXT_INPUT = new Set([
  "button",
  "submit",
  "checkbox",
  "radio",
  "file",
  "reset",
  "hidden",
  "color",
  "range",
  "image",
]);

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  const field = el.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])");
  if (!field) return false;
  if (field instanceof HTMLInputElement) {
    if (NON_TEXT_INPUT.has(field.type)) return false;
    return !field.disabled;
  }
  if (field instanceof HTMLTextAreaElement) return !field.disabled;
  if (field instanceof HTMLSelectElement) return !field.disabled;
  return true;
}
