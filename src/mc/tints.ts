import { stripNamespace } from "./constants";

/**
 * Minecraft stores grass/foliage textures in greyscale and multiplies them by a biome
 * colour at render time, which is why an untinted `grass_block_top` looks grey.
 * We approximate the plains biome, plus the handful of blocks Mojang hardcodes.
 */
const GRASS = 0x91bd59;
const FOLIAGE = 0x77ab2f;

const EXACT_TINTS: Record<string, number> = {
  spruce_leaves: 0x619961,
  birch_leaves: 0x80a755,
  lily_pad: 0x71c35c,
  water: 0x3f76e4,
  water_cauldron: 0x3f76e4,
  bubble_column: 0x3f76e4,
  redstone_wire: 0xff0000,
  melon_stem: 0x00ff00,
  pumpkin_stem: 0x00ff00,
  attached_melon_stem: 0xe0c71c,
  attached_pumpkin_stem: 0xe0c71c,
};

export function tintForBlock(rawId: string): number {
  const id = stripNamespace(rawId);
  if (id in EXACT_TINTS) return EXACT_TINTS[id];
  if (id.endsWith("_leaves") || id.startsWith("vine") || id.endsWith("_vines")) return FOLIAGE;
  return GRASS;
}
