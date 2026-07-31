export const MC_VERSION = "1.21.11";
export const ASSETS_BASE = `https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-assets@master/data/${MC_VERSION}`;
export const DATA_BASE = `https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-data@master/data/pc/${MC_VERSION}`;

export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Strips the `minecraft:` namespace and any `block/` or `blocks/` folder prefix. */
export function stripRef(ref: string): string {
  return String(ref)
    .replace(/^minecraft:/, "")
    .replace(/^blocks?\//, "");
}

export function stripNamespace(id: string): string {
  const idx = id.indexOf(":");
  return idx === -1 ? id : id.slice(idx + 1);
}

/** Reads a TTL-checked JSON blob from localStorage, returning null when stale or absent. */
export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: T };
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // storage full or unavailable; caching is best-effort
  }
}
