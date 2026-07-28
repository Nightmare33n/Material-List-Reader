export interface MaterialItem {
  id: string;
  count: number;
}

export interface MaterialList {
  name: string;
  items: MaterialItem[];
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
