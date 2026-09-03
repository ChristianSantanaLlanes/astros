export type VideoEmbed =
  | { kind: "youtube"; src: string }
  | { kind: "vimeo"; src: string }
  | { kind: "file"; src: string };

function lastPathSegment(url: URL): string | undefined {
  return url.pathname.split("/").filter(Boolean).pop();
}

export function parseVideoUrl(raw: string): VideoEmbed | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (id) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const fromQuery = url.searchParams.get("v");
    const parts = url.pathname.split("/").filter(Boolean);
    const fromPath =
      parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" ? parts[1] : parts[0] === "watch" ? undefined : lastPathSegment(url);
    const id = fromQuery ?? fromPath;
    if (id) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[0] === "video" ? parts[1] : parts[parts.length - 1];
    if (id && /^\d+$/.test(id)) return { kind: "vimeo", src: `https://player.vimeo.com/video/${id}` };
  }
  return { kind: "file", src: url.href };
}

export function isHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
