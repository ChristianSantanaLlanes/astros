import { PIECES } from "./progressData";

const badge: Record<string, string> = {
  queued: "wait",
  building: "go",
  review: "go",
  won: "win",
  lost: "lose",
};

const label: Record<string, string> = {
  queued: "en cola",
  building: "construyendo",
  review: "en crítica",
  won: "Forge gana",
  lost: "Linear gana",
};

export function ProgressPage() {
  const won = PIECES.filter((p) => p.status === "won").length;
  return (
    <div className="progress-page">
      <p style={{ color: "var(--text-4)", fontSize: 12, fontVariationSettings: '"wght" 510', letterSpacing: "0.08em" }}>
        FORGE · LIVE
      </p>
      <h1>Progreso contra Linear Issues</h1>
      <p className="lede">
        Cada pieza se construye y se juzga a ciegas frente a capturas reales de linear.app. {won}/{PIECES.length}{" "}
        ganadas. Esta página se actualiza en cada ronda.
      </p>
      <p style={{ marginBottom: 24 }}>
        <a href="/app" style={{ color: "#828fff" }}>
          Abrir Forge
        </a>
      </p>
      <div className="board">
        {PIECES.map((piece) => (
          <article className="piece" key={piece.id}>
            <div>
              <h3>{piece.title}</h3>
              <div style={{ color: "var(--text-4)", fontSize: 12, marginTop: 4 }}>ronda {piece.round}</div>
            </div>
            <span className={`badge ${badge[piece.status]}`}>{label[piece.status]}</span>
            <div>
              <p>{piece.brief}</p>
              <p style={{ marginTop: 8, color: piece.winner === "linear" ? "#f87171" : "var(--text-2)" }}>
                {piece.gap}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
