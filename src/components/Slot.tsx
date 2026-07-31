import type { MaterialItem } from "../types";
import type { ItemInfo } from "../mc/stacks";
import { breakdown, compactStacks, displayNameFor, stackSizeFor } from "../mc/stacks";
import Block3D from "./Block3D";

export type CountMode = "stacks" | "items";

interface SlotProps {
  item: MaterialItem;
  items: Map<string, ItemInfo> | null;
  mode: CountMode;
}

export default function Slot({ item, items, mode }: SlotProps) {
  const name = displayNameFor(item.id, items);
  const stackSize = stackSizeFor(item.id, items);
  const info = breakdown(item.count, stackSize);

  const label =
    mode === "stacks" ? compactStacks(item.count, stackSize) : item.count.toLocaleString();

  return (
    <div className="slot">
      <div className="slot-icon-wrap">
        <Block3D id={item.id} alt={name} />
      </div>
      <span className={`slot-count ${label.length > 7 ? "slot-count-xs" : label.length > 3 ? "slot-count-sm" : ""}`}>
        {label}
      </span>

      <div className="slot-tooltip">
        <div className="slot-tooltip-name">{name}</div>
        <div className="slot-tooltip-id">{item.id}</div>
        <div className="slot-tooltip-line">{item.count.toLocaleString()} items</div>
        {stackSize > 1 && info.stacks > 0 && (
          <div className="slot-tooltip-line">
            {info.stacks} stack{info.stacks === 1 ? "" : "s"} de {stackSize}
            {info.remainder > 0 ? ` + ${info.remainder}` : ""}
          </div>
        )}
        {stackSize > 1 && info.stacks === 0 && (
          <div className="slot-tooltip-line">menos de un stack ({stackSize})</div>
        )}
        {info.shulkers > 0 && (
          <div className="slot-tooltip-line">
            {info.shulkers} shulker{info.shulkers === 1 ? "" : "s"}
            {info.stacksAfterShulkers > 0 ? ` + ${info.stacksAfterShulkers} stacks` : ""}
          </div>
        )}
      </div>
    </div>
  );
}
