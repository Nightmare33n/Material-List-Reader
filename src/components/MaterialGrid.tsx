import { useEffect, useRef } from "react";
import type { MaterialItem } from "../types";
import type { ItemInfo } from "../mc/stacks";
import { initOverlay } from "../mc/renderPool";
import Slot, { type CountMode } from "./Slot";

interface MaterialGridProps {
  items: MaterialItem[];
  itemInfo: Map<string, ItemInfo> | null;
  mode: CountMode;
}

export default function MaterialGrid({ items, itemInfo, mode }: MaterialGridProps) {
  const overlayRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!overlayRef.current) return;
    return initOverlay(overlayRef.current);
  }, []);

  return (
    <>
      {/*
        One WebGL canvas pinned to the viewport draws every block. Each slot only
        reserves space; the overlay renders into that rectangle with a scissor box.
      */}
      <canvas ref={overlayRef} className="block-overlay" />

      {items.length === 0 ? (
        <p className="grid-empty">Sin resultados.</p>
      ) : (
        <div className="material-grid">
          {items.map((item) => (
            <Slot key={item.id} item={item} items={itemInfo} mode={mode} />
          ))}
        </div>
      )}
    </>
  );
}
