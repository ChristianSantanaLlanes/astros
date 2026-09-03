export function formatTime(ts: number): string {
  return new Date(ts).toLocaleDateString("es", { month: "short", day: "numeric" });
}

export function formatRelative(ts: number, now: number): string {
  const delta = Math.max(0, now - ts);
  const mins = Math.round(delta / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return formatTime(ts);
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
