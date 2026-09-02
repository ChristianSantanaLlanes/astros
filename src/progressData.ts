export type PieceId =
  | "captura"
  | "lista"
  | "teclado"
  | "estados"
  | "detalle"
  | "busqueda"
  | "vacio"
  | "movimiento";

export type PieceStatus = "queued" | "building" | "review" | "won" | "lost";

export type Piece = {
  id: PieceId;
  title: string;
  brief: string;
  status: PieceStatus;
  winner: "ours" | "linear" | null;
  gap: string;
  round: number;
};

export const PIECES: Piece[] = [
  {
    id: "captura",
    title: "Captura rápida",
    brief: "C escribe en una fila de la lista, no en un diálogo.",
    status: "lost",
    winner: "linear",
    gap: "Ronda 1: diálogo flotante + CTA lila. Ronda 2: captura inline en la lista.",
    round: 2,
  },
  {
    id: "lista",
    title: "Lista",
    brief: "Filas 36px, prioridad · id · estado · título.",
    status: "review",
    winner: null,
    gap: "Crítica ciega de lista aún no consolidada.",
    round: 1,
  },
  {
    id: "teclado",
    title: "Teclado",
    brief: "j/k, x, Enter, Esc, ⌘K, /, Alt+1–5.",
    status: "review",
    winner: null,
    gap: "Pendiente de veredicto en vivo.",
    round: 1,
  },
  {
    id: "estados",
    title: "Estados",
    brief: "Backlog → Todo → In Progress → Done / Canceled.",
    status: "review",
    winner: null,
    gap: "Crítico de estados no llegó a lanzarse en la oleada 1.",
    round: 1,
  },
  {
    id: "detalle",
    title: "Detalle",
    brief: "Título, descripción, activity, propiedades.",
    status: "lost",
    winner: "linear",
    gap: "Ronda 1: vacío negro sin actividad. Ronda 2: feed Activity + created.",
    round: 2,
  },
  {
    id: "busqueda",
    title: "Búsqueda",
    brief: "⌘K y / sobre id, título y labels.",
    status: "review",
    winner: null,
    gap: "Crítica ciega en curso.",
    round: 1,
  },
  {
    id: "vacio",
    title: "Vacío",
    brief: "Inbox vacío y búsqueda sin hits.",
    status: "review",
    winner: null,
    gap: "Constructor listo; crítico de vacío no lanzado en oleada 1.",
    round: 1,
  },
  {
    id: "movimiento",
    title: "Movimiento",
    brief: "Drag entre grupos y Alt+↑/↓.",
    status: "review",
    winner: null,
    gap: "Pendiente de crítica en vivo.",
    round: 1,
  },
];
