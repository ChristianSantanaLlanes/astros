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
    gap: "Ronda 2: parecía un filtro. Ronda 3: FOR-n + barras de prioridad + título escrito.",
    round: 2,
  },
  {
    id: "lista",
    title: "Lista",
    brief: "Prioridad · id · estado · título · PR · labels · ciclo · avatar · fecha.",
    status: "lost",
    winner: "linear",
    gap: "Ronda 1: filas huecas. Ronda 2: avatares, PR, Working y fechas reales.",
    round: 2,
  },
  {
    id: "teclado",
    title: "Teclado",
    brief: "C, ⌘K, /, j/k, Enter, Esc, x, Alt+1–5, Alt+↑/↓.",
    status: "won",
    winner: "ours",
    gap: "Forge responde a C/j/k/⌘K; el embed de Linear no es teclado.",
    round: 1,
  },
  {
    id: "estados",
    title: "Estados",
    brief: "Grupos In Progress / Todo / Backlog con conteo e icono.",
    status: "lost",
    winner: "linear",
    gap: "Ronda 1: jerarquía de grupos más débil. Ronda 2: grupos abiertos + Working.",
    round: 2,
  },
  {
    id: "detalle",
    title: "Detalle",
    brief: "Título, descripción, activity y propiedades.",
    status: "lost",
    winner: "linear",
    gap: "Ronda 2: Activity hueca. Ronda 3: created + cambio de estado + comentarios + assignee.",
    round: 2,
  },
  {
    id: "busqueda",
    title: "Búsqueda",
    brief: "⌘K secciona Commands / Issues; / filtra.",
    status: "won",
    winner: "ours",
    gap: "Filtro en vivo y empty state accionable.",
    round: 1,
  },
  {
    id: "vacio",
    title: "Vacío",
    brief: "Inbox vacío y búsqueda sin hits.",
    status: "won",
    winner: "ours",
    gap: "Empty quieto con CTA real; Linear embed no tiene vacío.",
    round: 1,
  },
  {
    id: "movimiento",
    title: "Movimiento",
    brief: "Drag entre grupos y Alt+↑/↓.",
    status: "won",
    winner: "ours",
    gap: "Drop persiste status/order; línea índigo inset. Linear embed es read-only.",
    round: 1,
  },
];
