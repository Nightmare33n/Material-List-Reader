import { ASSETS_BASE, stripRef, stripNamespace } from "./constants";

export interface ModelFace {
  uv?: [number, number, number, number];
  texture: string;
  cullface?: string;
  rotation?: number;
  tintindex?: number;
}

export interface ModelElement {
  from: [number, number, number];
  to: [number, number, number];
  shade?: boolean;
  rotation?: {
    origin: [number, number, number];
    axis: "x" | "y" | "z";
    angle: number;
    rescale?: boolean;
  };
  faces: Partial<Record<"down" | "up" | "north" | "south" | "west" | "east", ModelFace>>;
}

interface RawModel {
  parent?: string;
  textures?: Record<string, string>;
  elements?: ModelElement[];
}

export interface ResolvedModel {
  textures: Record<string, string>;
  elements: ModelElement[];
}

type ModelIndex = Record<string, RawModel>;

let indexPromise: Promise<ModelIndex> | null = null;

/**
 * The model index is ~1.4 MB, well past what localStorage can reliably hold, so it is
 * fetched once per page load and left to the HTTP cache between sessions.
 */
export function getModelIndex(): Promise<ModelIndex> {
  if (!indexPromise) {
    indexPromise = fetch(`${ASSETS_BASE}/blocks_models.json`).then((r) => r.json());
  }
  return indexPromise;
}

/**
 * Blocks whose state determines the model name have no entry under the bare block id.
 * These suffixes pick the variant that best represents the block in an inventory.
 */
const MODEL_SUFFIXES = ["", "_inventory", "_bottom", "_post", "_1", "_top"];

function findModelKey(index: ModelIndex, id: string): string | null {
  const candidates = [id];
  if (id.startsWith("waxed_")) candidates.push(id.slice("waxed_".length));

  for (const candidate of candidates) {
    for (const suffix of MODEL_SUFFIXES) {
      const key = candidate + suffix;
      if (index[key]) return key;
    }
  }
  return null;
}

/** Walks the `parent` chain, merging texture maps and inheriting the nearest `elements`. */
function resolveChain(index: ModelIndex, key: string, depth = 0): ResolvedModel {
  const model = index[key];
  if (!model || depth > 16) return { textures: {}, elements: [] };

  const base = model.parent
    ? resolveChain(index, stripRef(model.parent), depth + 1)
    : { textures: {}, elements: [] };

  return {
    textures: { ...base.textures, ...(model.textures ?? {}) },
    elements: model.elements ?? base.elements,
  };
}

/** Follows `#ref` indirection in a model's texture map down to a real texture path. */
export function resolveTextureRef(
  textures: Record<string, string>,
  ref: string,
  depth = 0
): string | null {
  if (depth > 8) return null;
  if (!ref.startsWith("#")) return stripRef(ref);
  const next = textures[ref.slice(1)];
  if (!next) return null;
  return resolveTextureRef(textures, next, depth + 1);
}

export function textureUrl(path: string): string {
  return `${ASSETS_BASE}/blocks/${path}.png`;
}

/**
 * Returns null only when no model exists at all. A model with an empty `elements` list is
 * still returned: it carries no geometry (signs, statues and other entity-rendered
 * blocks) but its particle texture is the game's own stand-in image for the block.
 */
export async function resolveBlockModel(rawId: string): Promise<ResolvedModel | null> {
  const index = await getModelIndex();
  const key = findModelKey(index, stripNamespace(rawId));
  if (!key) return null;

  return resolveChain(index, key);
}

/** The texture Mojang picks to represent a block, used for break particles. */
export function particlePath(model: ResolvedModel): string | null {
  const particle = model.textures.particle;
  if (!particle) return null;

  const path = resolveTextureRef(model.textures, particle);
  return path ? `blocks/${path}` : null;
}
