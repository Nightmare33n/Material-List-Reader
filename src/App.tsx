import { useEffect, useMemo, useState } from "react";
import Dropzone from "./components/Dropzone";
import Toolbar, { type SortMode } from "./components/Toolbar";
import MaterialGrid from "./components/MaterialGrid";
import { getTextureManifest, formatBlockName } from "./textureResolver";
import type { MaterialList } from "./types";

export default function App() {
  const [list, setList] = useState<MaterialList | null>(null);
  const [manifest, setManifest] = useState<Map<string, string> | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("count-desc");

  useEffect(() => {
    getTextureManifest().then(setManifest);
  }, []);

  const filteredSorted = useMemo(() => {
    if (!list) return [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.items.filter(
          (it) => it.id.toLowerCase().includes(q) || formatBlockName(it.id).toLowerCase().includes(q)
        )
      : list.items;

    const sorted = [...filtered];
    if (sortMode === "count-desc") sorted.sort((a, b) => b.count - a.count);
    else if (sortMode === "count-asc") sorted.sort((a, b) => a.count - b.count);
    else sorted.sort((a, b) => formatBlockName(a.id).localeCompare(formatBlockName(b.id)));
    return sorted;
  }, [list, search, sortMode]);

  const totalCount = useMemo(
    () => (list ? list.items.reduce((sum, it) => sum + it.count, 0) : 0),
    [list]
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>Material List Reader</h1>
        <p>Visualiza tu lista de materiales de Litematica con iconos de bloques</p>
      </header>

      {!list ? (
        <Dropzone onLoaded={setList} />
      ) : (
        <div className="panel">
          <Toolbar
            name={list.name}
            search={search}
            onSearchChange={setSearch}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            totalUnique={list.items.length}
            totalCount={totalCount}
            onReset={() => {
              setList(null);
              setSearch("");
            }}
          />
          <MaterialGrid items={filteredSorted} manifest={manifest} />
        </div>
      )}
    </div>
  );
}
