import type { Idea } from "./types";

const TEAM = "FOR";

export function seedIdeas(now: number): Idea[] {
  const rows: Array<Omit<Idea, "id" | "identifier" | "createdAt" | "updatedAt" | "order">> = [
    {
      number: 1,
      title: "Captura rápida de ideas desde cualquier vista",
      description:
        "Un atajo de una tecla debe abrir un composer vacío, con el cursor en el título. Cmd+Enter crea y deja el composer abierto para la siguiente.\n\nSin esto, las ideas se pierden entre reuniones.",
      status: "in_progress",
      priority: 1,
      labels: ["Growth"],
    },
    {
      number: 2,
      title: "Lista agrupada por estado con densidad de Issues",
      description:
        "Filas de 36px, identificador monoespaciado, título truncado, labels a la derecha. Hover sutil. Selección por teclado visible.",
      status: "in_progress",
      priority: 2,
      labels: ["Design"],
    },
    {
      number: 3,
      title: "Navegación completa por teclado",
      description:
        "j/k para moverse, x para seleccionar, c para crear, / para buscar, Enter para abrir, Esc para cerrar. Cmd+K paleta. Sin ratón, un flujo entero.",
      status: "todo",
      priority: 1,
      labels: ["Growth"],
    },
    {
      number: 4,
      title: "Ciclo de estados de punta a punta",
      description:
        "Backlog → Todo → In Progress → Done / Canceled. Cambiar con teclado, menú y drag. El estado se refleja en icono, grupo y detalle.",
      status: "todo",
      priority: 2,
      labels: ["API"],
    },
    {
      number: 5,
      title: "Panel de detalle con edición inline",
      description:
        "Título, descripción, propiedades, actividad. El detalle no es un mock: cada campo persiste al blur / Enter.",
      status: "todo",
      priority: 2,
      labels: ["Design"],
    },
    {
      number: 6,
      title: "Búsqueda instantánea por id, título y labels",
      description:
        "Cmd+K y / abren el mismo índice. Resultados agrupados. Enter abre. Las teclas no deben pelearse con inputs.",
      status: "todo",
      priority: 3,
      labels: ["Performance"],
    },
    {
      number: 7,
      title: "Estados vacíos que enseñan el siguiente paso",
      description:
        "Inbox vacío, búsqueda sin resultados, backlog filtrado. Cada uno con un CTA real, no un illustration pack genérico.",
      status: "backlog",
      priority: 3,
      labels: ["Design"],
    },
    {
      number: 8,
      title: "Mover ideas entre estados con drag y teclado",
      description:
        "Arrastrar a otro grupo cambia el estado y el orden. Alt+↑/↓ reordena dentro del grupo. Shift+S cambia estado.",
      status: "todo",
      priority: 2,
      labels: ["Growth"],
    },
    {
      number: 9,
      title: "Reducir el parpadeo al sincronizar estado del vehículo",
      description:
        "Renderizar UI mínima antes de que vehicle_state termine el sync, en lugar de bloquear el refresh completo en iOS.",
      status: "backlog",
      priority: 2,
      labels: ["iOS", "Performance"],
    },
    {
      number: 10,
      title: "Buffer para streams de eventos de autonomía",
      description:
        "Los eventos llegan en ráfagas. Un buffer corto evita re-renders por frame y suaviza el mapa.",
      status: "backlog",
      priority: 4,
      labels: ["Performance"],
    },
    {
      number: 11,
      title: "Quitar inconsistencias de UI entre iOS y web",
      description: "Tipografía, radios y densidad deben coincidir. Empezar por Issues y el composer.",
      status: "done",
      priority: 3,
      labels: ["Design", "iOS"],
    },
    {
      number: 12,
      title: "Limpiar APIs deprecadas del cliente",
      description: "Eliminar los wrappers de v1. No hay consumidores.",
      status: "done",
      priority: 4,
      labels: ["API"],
    },
    {
      number: 13,
      title: "Investigar fluctuaciones de ETA durante reroute",
      description: "El ETA salta ±40s en reroutes urbanos. Reproducir con traces de la semana pasada.",
      status: "canceled",
      priority: 4,
      labels: ["Research"],
    },
    {
      number: 14,
      title: "Permisos granulares por proyecto",
      description: "Invitados en un proyecto no deben ver el resto del workspace.",
      status: "backlog",
      priority: 3,
      labels: ["Infra"],
    },
    {
      number: 15,
      title: "Assets de la página de lanzamiento",
      description: "Exportar las capturas finales a 1x/2x y recortar el hero.",
      status: "todo",
      priority: 0,
      labels: ["Growth"],
    },
  ];

  return rows.map((row, index) => ({
    ...row,
    id: `seed-${row.number}`,
    identifier: `${TEAM}-${row.number}`,
    order: index,
    createdAt: now - (rows.length - index) * 36e5,
    updatedAt: now - (rows.length - index) * 18e5,
  }));
}
