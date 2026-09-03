import { InboxIcon, Kbd, SearchIcon } from "../icons";

function clip(query: string, max = 48): string {
  const text = query.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function Empty({
  query,
  onCreate,
  onClear,
}: {
  query: string;
  onCreate: () => void;
  onClear: () => void;
}) {
  const searching = query.trim().length > 0;

  return (
    <div className="empty">
      <div className="empty-art" aria-hidden>
        {searching ? <SearchIcon size={28} /> : <InboxIcon size={28} />}
      </div>
      {searching ? (
        <>
          <h2>No se encontraron ideas</h2>
          <p>No hay coincidencias para “{clip(query)}”.</p>
          <div className="hint-row">
            <button className="chip" type="button" onClick={onClear}>
              Limpiar búsqueda
            </button>
            <button className="primary" type="button" onClick={onCreate}>
              Nueva idea
            </button>
          </div>
        </>
      ) : (
        <>
          <h2>No hay ideas aquí</h2>
          <p>Captura lo que tienes en mente. Podrás priorizarlo, moverlo y convertirlo en algo concreto.</p>
          <div className="hint-row">
            <button className="primary" type="button" onClick={onCreate}>
              Crear primera idea
            </button>
            <span>
              Pulsa <Kbd>C</Kbd>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
