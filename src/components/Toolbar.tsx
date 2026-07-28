export type SortMode = "count-desc" | "count-asc" | "name-asc";

interface ToolbarProps {
  name: string;
  search: string;
  onSearchChange: (v: string) => void;
  sortMode: SortMode;
  onSortModeChange: (v: SortMode) => void;
  totalUnique: number;
  totalCount: number;
  onReset: () => void;
}

export default function Toolbar({
  name,
  search,
  onSearchChange,
  sortMode,
  onSortModeChange,
  totalUnique,
  totalCount,
  onReset,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-title">
        <span className="toolbar-title-label">{name}</span>
        <span className="toolbar-title-stats">
          {totalUnique} tipos · {totalCount.toLocaleString()} bloques
        </span>
      </div>
      <div className="toolbar-controls">
        <input
          type="text"
          placeholder="Buscar bloque..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="toolbar-search"
        />
        <select
          value={sortMode}
          onChange={(e) => onSortModeChange(e.target.value as SortMode)}
          className="toolbar-sort"
        >
          <option value="count-desc">Mayor cantidad</option>
          <option value="count-asc">Menor cantidad</option>
          <option value="name-asc">Nombre A-Z</option>
        </select>
        <button className="toolbar-reset" onClick={onReset}>
          Cargar otro
        </button>
      </div>
    </div>
  );
}
