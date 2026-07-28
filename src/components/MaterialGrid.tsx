import type { MaterialItem } from "../types";
import Slot from "./Slot";

interface MaterialGridProps {
  items: MaterialItem[];
  manifest: Map<string, string> | null;
}

export default function MaterialGrid({ items, manifest }: MaterialGridProps) {
  if (items.length === 0) {
    return <p className="grid-empty">Sin resultados.</p>;
  }

  return (
    <div className="material-grid">
      {items.map((item) => (
        <Slot key={item.id} item={item} manifest={manifest} />
      ))}
    </div>
  );
}
