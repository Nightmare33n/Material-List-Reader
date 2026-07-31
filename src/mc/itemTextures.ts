import { ASSETS_BASE, readCache, writeCache, stripNamespace } from "./constants";

const CACHE_KEY = "mc-item-textures";

interface RawEntry {
  name: string;
  texture?: string;
}

/**
 * Texture refs come in as `minecraft:block/foo` or `minecraft:items/bar`, while the asset
 * repo lays them out under `blocks/` and `items/`. Returns null for refs with no folder
 * (`missingno`, `none`), which have no real file behind them.
 */
function normalizePath(ref: string | undefined): string | null {
  if (!ref) return null;
  const path = stripNamespace(ref);

  if (path.startsWith("items/")) return path;
  if (path.startsWith("item/")) return `items/${path.slice("item/".length)}`;
  if (path.startsWith("blocks/")) return path;
  if (path.startsWith("block/")) return `blocks/${path.slice("block/".length)}`;
  return null;
}

/**
 * Banners declare `oak_planks` as their icon texture because the real one is composited
 * from patterns at runtime. Wool of the matching colour is a far better stand-in.
 */
function override(name: string): string | null {
  if (name.endsWith("_banner")) {
    return `blocks/${name.slice(0, -"_banner".length)}_wool`;
  }
  return null;
}

let mapPromise: Promise<Map<string, string>> | null = null;

async function load(): Promise<Map<string, string>> {
  const cached = readCache<[string, string][]>(CACHE_KEY);
  if (cached) return new Map(cached);

  const res = await fetch(`${ASSETS_BASE}/items_textures.json`);
  const raw = (await res.json()) as Record<string, RawEntry>;

  const map = new Map<string, string>();
  for (const entry of Object.values(raw)) {
    const path = override(entry.name) ?? normalizePath(entry.texture);
    if (path) map.set(entry.name, path);
  }

  writeCache(CACHE_KEY, Array.from(map.entries()));
  return map;
}

export function getItemTextures(): Promise<Map<string, string>> {
  if (!mapPromise) mapPromise = load();
  return mapPromise;
}

/**
 * Candidate icon URLs, best first: the texture Mojang declares for the item, the block
 * model's particle texture, then naive guesses. The `_00` guess covers animated items
 * such as the compass and clock, which ship one PNG per frame.
 */
export function iconCandidates(
  rawId: string,
  map: Map<string, string> | null,
  particle?: string | null
): string[] {
  const name = stripNamespace(rawId);

  const paths = [map?.get(name), particle, `items/${name}`, `blocks/${name}`, `items/${name}_00`];

  return Array.from(new Set(paths.filter((p): p is string => Boolean(p)))).map(
    (p) => `${ASSETS_BASE}/${p}.png`
  );
}
