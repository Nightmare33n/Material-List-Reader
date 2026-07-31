import { DATA_BASE, readCache, writeCache, stripNamespace } from "./constants";

export interface ItemInfo {
  stackSize: number;
  displayName: string;
}

const CACHE_KEY = "mc-item-info";
const STACKS_PER_SHULKER = 27;

let itemsPromise: Promise<Map<string, ItemInfo>> | null = null;

async function loadItems(): Promise<Map<string, ItemInfo>> {
  const cached = readCache<[string, ItemInfo][]>(CACHE_KEY);
  if (cached) return new Map(cached);

  const res = await fetch(`${DATA_BASE}/items.json`);
  const raw = (await res.json()) as { name: string; stackSize: number; displayName: string }[];

  const map = new Map<string, ItemInfo>();
  for (const item of raw) {
    map.set(item.name, { stackSize: item.stackSize, displayName: item.displayName });
  }

  writeCache(CACHE_KEY, Array.from(map.entries()));
  return map;
}

export function getItemInfo(): Promise<Map<string, ItemInfo>> {
  if (!itemsPromise) itemsPromise = loadItems();
  return itemsPromise;
}

export function stackSizeFor(rawId: string, items: Map<string, ItemInfo> | null): number {
  return items?.get(stripNamespace(rawId))?.stackSize ?? 64;
}

export function displayNameFor(rawId: string, items: Map<string, ItemInfo> | null): string {
  const id = stripNamespace(rawId);
  const known = items?.get(id)?.displayName;
  if (known) return known;

  return id
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface StackBreakdown {
  stackSize: number;
  stacks: number;
  remainder: number;
  shulkers: number;
  stacksAfterShulkers: number;
}

export function breakdown(count: number, stackSize: number): StackBreakdown {
  const stacks = Math.floor(count / stackSize);
  return {
    stackSize,
    stacks,
    remainder: count % stackSize,
    shulkers: Math.floor(stacks / STACKS_PER_SHULKER),
    stacksAfterShulkers: stacks % STACKS_PER_SHULKER,
  };
}

/** Label for the corner of an inventory slot, e.g. `9x64+43`. */
export function compactStacks(count: number, stackSize: number): string {
  if (stackSize <= 1) return String(count);

  const { stacks, remainder } = breakdown(count, stackSize);
  if (stacks === 0) return String(remainder);
  if (remainder === 0) return `${stacks}x${stackSize}`;
  return `${stacks}x${stackSize}+${remainder}`;
}
