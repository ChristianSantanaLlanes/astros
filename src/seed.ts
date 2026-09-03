import type { Idea } from "./types";

const TEAM = "IDEA";

export function seedIdeas(now: number): Idea[] {
  const rows: Array<Omit<Idea, "id" | "identifier" | "createdAt" | "updatedAt" | "order">> = [
    {
      number: 1,
      title: "Captura siempre a la vista, no detrás de un atajo",
      description:
        "Si hay que pulsar C para recordar que se puede capturar, la idea ya se fue. Un campo permanente en la lista: Enter crea y el cursor se queda listo para la siguiente.",
      status: "in_progress",
      priority: 1,
      labels: ["label-producto"],
    },
    {
      number: 2,
      title: "Un cuaderno de campo para las caminatas del domingo",
      description:
        "Notas de voz cortas, un título y un sitio donde aterrizan. Sin proyectos, sin sprints: solo el hábito de no perder lo que aparece al andar.",
      status: "inbox",
      priority: 3,
      labels: ["label-personal"],
    },
    {
      number: 3,
      title: "App de recetas con lo que hay en la nevera",
      description:
        "Fotos de lo que queda, sugerencias de tres platos, lista de la compra de lo que falta. Útil en semana, no otro recetario infinito.",
      status: "planned",
      priority: 2,
      labels: ["label-producto", "label-personal"],
    },
    {
      number: 4,
      title: "Taller de 15 minutos para vaciar la cabeza",
      description:
        "Al final del día: capturar todo lo que quedó a medias, priorizar una y aparcar el resto. El resto del sistema solo existe para que esto no dé miedo.",
      status: "planned",
      priority: 2,
      labels: ["label-personal"],
    },
    {
      number: 5,
      title: "El detalle no debe robarte la lista",
      description:
        "Abrir una idea es afilarla, no cambiar de sitio. Panel a un lado, lista intacta. En el teléfono, pantalla completa con una X que cierra, no que borra.",
      status: "in_progress",
      priority: 2,
      labels: ["label-diseno"],
    },
    {
      number: 6,
      title: "Búsqueda que también crea",
      description:
        "Si no hay coincidencias, el siguiente paso es capturar esa frase como idea. Cmd+K y / hablan el mismo idioma.",
      status: "planned",
      priority: 3,
      labels: ["label-producto"],
    },
    {
      number: 7,
      title: "Estados que se sienten de ideas, no de tickets",
      description:
        "Bandeja → Por hacer → En progreso → Completada. Nada de backlog ni canceled. Completar es haberla convertido en algo, no haber cerrado un issue.",
      status: "inbox",
      priority: 2,
      labels: ["label-producto"],
    },
    {
      number: 8,
      title: "Mover con drag y teclado sin teatro de assignees",
      description:
        "Arrastrar entre grupos cambia el estado. Alt+↑/↓ reordena. Prioridad sí; responsables ficticios, no.",
      status: "planned",
      priority: 3,
      labels: ["label-diseno"],
    },
    {
      number: 9,
      title: "Mapa de cafeterías buenas para pensar",
      description:
        "Sitios con enchufe, ruido bajo y café decente. Una nota por barrio, no un directorio.",
      status: "inbox",
      priority: 4,
      labels: ["label-personal"],
    },
    {
      number: 10,
      title: "Investigar por qué las ideas mueren en notas sueltas",
      description:
        "La captura sin un sitio al que volver es un cajón. ¿Falta prioridad, un recordatorio, o solo una lista que se pueda recorrer en un minuto?",
      status: "inbox",
      priority: 3,
      labels: ["label-investigacion"],
    },
    {
      number: 11,
      title: "Tipografía y densidad de una lista que se recorre a diario",
      description: "Filas compactas, identificador estable, título truncado. Que quepan muchas sin parecer un tracker.",
      status: "done",
      priority: 3,
      labels: ["label-diseno"],
    },
    {
      number: 12,
      title: "Deshacer al borrar, siempre",
      description: "Una idea mal borrada tiene que volver. Tres segundos de arrepentimiento valen más que un diálogo de confirmación.",
      status: "done",
      priority: 2,
      labels: ["label-producto"],
    },
    {
      number: 13,
      title: "Colección de aperturas para escribir a primera hora",
      description: "Frases que desbloquean. Nada de prompts genéricos: las que a mí me funcionan.",
      status: "inbox",
      priority: 4,
      labels: ["label-personal"],
    },
    {
      number: 14,
      title: "Un índice de analogías para explicar productos",
      description: "Cuando una analogía funciona en una reunión, guardarla. Título corto, contexto de una línea.",
      status: "planned",
      priority: 3,
      labels: ["label-investigacion"],
    },
    {
      number: 15,
      title: "Regalo: un kit mínimo para empezar un cuaderno",
      description: "Papel, un bolígrafo que guste y una regla de una línea al día. Más ritual que producto.",
      status: "planned",
      priority: 0,
      labels: ["label-personal"],
    },
  ];

  return rows.map((row, index) => {
    const daysAgo = [1, 2, 4, 5, 6, 7, 8, 9, 10, 12, 14, 18, 21, 24, 28][index] ?? index + 1;
    const updatedAt = now - daysAgo * 86400000;
    return {
      ...row,
      id: `seed-${row.number}`,
      identifier: `${TEAM}-${row.number}`,
      order: index,
      createdAt: updatedAt - 86400000 * 2,
      updatedAt,
    };
  });
}
