import { useEffect, useMemo, useState } from "react";
import Dropzone from "./components/Dropzone";
import Toolbar, { type SortMode } from "./components/Toolbar";
import MaterialGrid from "./components/MaterialGrid";
import type { CountMode } from "./components/Slot";
import { getItemInfo, displayNameFor, type ItemInfo } from "./mc/stacks";
import { getModelIndex } from "./mc/modelResolver";
import type { MaterialList } from "./types";

export default function App() {
  const [list, setList] = useState<MaterialList | null>(null);
  const [itemInfo, setItemInfo] = useState<Map<string, ItemInfo> | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("count-desc");
  const [countMode, setCountMode] = useState<CountMode>("stacks");

  useEffect(() => {
    getItemInfo().then(setItemInfo).catch(() => setItemInfo(null));
    // Warms the model index so the first rendered grid does not stall on it.
    getModelIndex().catch(() => {});
  }, []);

  const filteredSorted = useMemo(() => {
    if (!list) return [];

    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.items.filter(
          (it) =>
            it.id.toLowerCase().includes(q) ||
            displayNameFor(it.id, itemInfo).toLowerCase().includes(q)
        )
      : list.items;

    const sorted = [...filtered];
    if (sortMode === "count-desc") sorted.sort((a, b) => b.count - a.count);
    else if (sortMode === "count-asc") sorted.sort((a, b) => a.count - b.count);
    else
      sorted.sort((a, b) =>
        displayNameFor(a.id, itemInfo).localeCompare(displayNameFor(b.id, itemInfo))
      );

    return sorted;
  }, [list, search, sortMode, itemInfo]);

  const totalCount = useMemo(
    () => (list ? list.items.reduce((sum, it) => sum + it.count, 0) : 0),
    [list]
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>Material List Reader</h1>
        <p>Visualiza tu lista de materiales de Litematica con modelos 3D de bloques</p>
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
            countMode={countMode}
            onCountModeChange={setCountMode}
            totalUnique={list.items.length}
            totalCount={totalCount}
            onReset={() => {
              setList(null);
              setSearch("");
            }}
          />
          <MaterialGrid items={filteredSorted} itemInfo={itemInfo} mode={countMode} />
        </div>
      )}
    </div>
  );
}
