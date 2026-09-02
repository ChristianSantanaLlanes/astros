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
    brief: "C abre el composer. Título primero, Cmd+Enter crea. Cursor listo.",
    status: "building",
    winner: null,
    gap: "Pendiente de crítica ciega contra Linear Issues.",
    round: 1,
  },
  {
    id: "lista",
    title: "Lista",
    brief: "Filas de 36px, FOR-n, labels, prioridad, grupos por estado.",
    status: "building",
    winner: null,
    gap: "Pendiente de crítica ciega contra Linear Issues.",
    round: 1,
  },
  {
    id: "teclado",
    title: "Teclado",
    brief: "j/k, x, Enter, Esc, ⌘K, /, Alt+1–5. Sin pelearse con inputs.",
    status: "queued",
    winner: null,
    gap: "Aún no comparado.",
    round: 0,
  },
  {
    id: "estados",
    title: "Estados",
    brief: "Backlog → Todo → In Progress → Done / Canceled, iconos y menú.",
    status: "queued",
    winner: null,
    gap: "Aún no comparado.",
    round: 0,
  },
  {
    id: "detalle",
    title: "Detalle",
    brief: "Título, descripción, propiedades, comentarios. Persistencia real.",
    status: "queued",
    winner: null,
    gap: "Aún no comparado.",
    round: 0,
  },
  {
    id: "busqueda",
    title: "Búsqueda",
    brief: "⌘K y / sobre id, título y labels. Enter abre.",
    status: "queued",
    winner: null,
    gap: "Aún no comparado.",
    round: 0,
  },
  {
    id: "vacio",
    title: "Vacío",
    brief: "Inbox vacío y búsqueda sin hits. CTA + atajo, no ilustración genérica.",
    status: "queued",
    winner: null,
    gap: "Aún no comparado.",
    round: 0,
  },
  {
    id: "movimiento",
    title: "Movimiento",
    brief: "Drag entre grupos, Alt+↑/↓ reordena, cambio de estado en sitio.",
    status: "queued",
    winner: null,
    gap: "Aún no comparado.",
    round: 0,
  },
];
