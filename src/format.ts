export function formatTime(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
