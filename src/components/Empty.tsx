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
          <h2>No matching ideas</h2>
          <p>No identifier, title, or label matches “{clip(query)}”.</p>
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
          <h2>No ideas</h2>
          <p>There are no ideas in this view.</p>
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
