export interface MaterialItem {
  id: string;
  count: number;
}

export interface MaterialList {
  name: string;
  items: MaterialItem[];
}

/**
 * Collapses repeated ids into a single entry. A material list can name the same block
 * more than once, and duplicates would otherwise become duplicate React keys, which
 * makes rows vanish as soon as the list is reordered.
 */
export function mergeDuplicates(items: MaterialItem[]): MaterialItem[] {
  const merged = new Map<string, MaterialItem>();

  for (const item of items) {
    // `stone` and `minecraft:stone` are the same block.
    const key = item.id.includes(":") ? item.id.slice(item.id.indexOf(":") + 1) : item.id;
    const existing = merged.get(key);

    if (existing) existing.count += item.count;
    else merged.set(key, { ...item });
  }

  return Array.from(merged.values());
}

export function isMaterialList(value: unknown): value is MaterialList {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.name !== "string") return false;
  if (!Array.isArray(v.items)) return false;
  return v.items.every(
    (it) =>
      typeof it === "object" &&
      it !== null &&
      typeof (it as MaterialItem).id === "string" &&
      typeof (it as MaterialItem).count === "number"
  );
}
