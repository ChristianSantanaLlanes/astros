export type PieceId =
  | "captura"
  | "lista"
  | "teclado"
  | "estados"
  | "detalle"
  | "busqueda"
  | "vacio"
  | "movimiento"
  | "movil";

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
    gap: "Ronda 3 Linear: blobs punteados y sin celda de estado. Ronda 4: misma rejilla que el resto de filas.",
    round: 4,
  },
  {
    id: "lista",
    title: "Lista",
    brief: "Prioridad · id · estado · título · PR · labels · ciclo · avatar · fecha.",
    status: "won",
    winner: "ours",
    gap: "Filas con PR, Working, labels y assignee.",
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
    status: "won",
    winner: "ours",
    gap: "Grupos con conteo; el menú marca el estado actual con tick, Done ya no parece seleccionado.",
    round: 3,
  },
  {
    id: "detalle",
    title: "Detalle",
    brief: "Título, descripción, activity y propiedades.",
    status: "won",
    winner: "ours",
    gap: "Ronda 3 Forge. Activity con autores, PR y hilo Composer; Linear quedó como pozo vacío.",
    round: 3,
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
  {
    id: "movil",
    title: "Móvil",
    brief: "390px: CTA icono, sin fechas tapando el título, avatares.",
    status: "won",
    winner: "ours",
    gap: "Ronda 2 Forge. Títulos ahora en 2 líneas; se usa la mitad inferior.",
    round: 2,
  },
];
