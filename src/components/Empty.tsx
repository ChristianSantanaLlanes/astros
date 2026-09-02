import { InboxIcon, Kbd } from "../icons";

export function Empty({ query, onCreate, onClear }: { query: string; onCreate: () => void; onClear: () => void }) {
  return (
    <div className="empty">
      <div className="empty-art">
        <InboxIcon size={28} />
      </div>
      {query ? (
        <>
          <h2>No ideas match “{query}”</h2>
          <p>Try another identifier, title fragment, or label. Search is instant and local.</p>
          <div className="hint-row">
            <button className="chip" type="button" onClick={onClear}>
              Clear search
            </button>
            <button className="primary" type="button" onClick={onCreate}>
              New idea
            </button>
          </div>
        </>
      ) : (
        <>
          <h2>No ideas yet</h2>
          <p>Capture the next one in a single keystroke. Title, then Cmd+Enter. Stay in flow.</p>
          <div className="hint-row">
            <button className="primary" type="button" onClick={onCreate}>
              New idea
            </button>
            <span>
              Press <Kbd>C</Kbd>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
