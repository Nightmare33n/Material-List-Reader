const MC_VERSION = "1.21.11";
const CDN_BASE = `https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-assets@master/data/${MC_VERSION}`;
const MANIFEST_URL = `${CDN_BASE}/blocks_textures.json`;
const CACHE_KEY = `mc-block-textures-${MC_VERSION}`;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface TextureEntry {
  name: string;
  texture: string | null;
}

let manifestPromise: Promise<Map<string, string>> | null = null;

function stripNamespace(id: string): string {
  const idx = id.indexOf(":");
  return idx === -1 ? id : id.slice(idx + 1);
}

async function loadManifest(): Promise<Map<string, string>> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as { ts: number; entries: [string, string][] };
      if (Date.now() - parsed.ts < CACHE_TTL_MS) {
        return new Map(parsed.entries);
      }
    }
  } catch {
    // ignore malformed cache
  }

  const res = await fetch(MANIFEST_URL);
  const data = (await res.json()) as Record<string, TextureEntry>;
  const map = new Map<string, string>();
  for (const entry of Object.values(data)) {
    if (entry.texture) {
      map.set(entry.name, stripNamespace(entry.texture));
    }
  }

  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), entries: Array.from(map.entries()) })
    );
  } catch {
    // storage full or unavailable, skip caching
  }

  return map;
}

export function getTextureManifest(): Promise<Map<string, string>> {
  if (!manifestPromise) manifestPromise = loadManifest();
  return manifestPromise;
}

const SHAPE_SUFFIXES = [
  "_wall",
  "_stairs",
  "_slab",
  "_fence_gate",
  "_fence",
  "_pressure_plate",
  "_button",
  "_door",
];

export function buildCandidateUrls(rawId: string, manifest: Map<string, string> | null): string[] {
  const id = stripNamespace(rawId);
  const urls: string[] = [];

  const resolved = manifest?.get(id);
  if (resolved) urls.push(`${CDN_BASE}/${resolved}.png`);

  urls.push(`${CDN_BASE}/blocks/${id}.png`);
  urls.push(`${CDN_BASE}/items/${id}.png`);
  urls.push(`${CDN_BASE}/blocks/${id}_top.png`);

  for (const suffix of SHAPE_SUFFIXES) {
    if (id.endsWith(suffix)) {
      const base = id.slice(0, -suffix.length);
      const baseResolved = manifest?.get(base);
      if (baseResolved) urls.push(`${CDN_BASE}/${baseResolved}.png`);
      urls.push(`${CDN_BASE}/blocks/${base}.png`);
      urls.push(`${CDN_BASE}/blocks/${base}s.png`);
    }
  }

  return Array.from(new Set(urls));
}

export function formatBlockName(rawId: string): string {
  return stripNamespace(rawId)
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
