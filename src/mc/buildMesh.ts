import * as THREE from "three";
import type { ModelElement, ModelFace, ResolvedModel } from "./modelResolver";
import { resolveTextureRef, textureUrl } from "./modelResolver";

type FaceName = "down" | "up" | "north" | "south" | "west" | "east";

/**
 * Minecraft does not light blocks in the GUI; it multiplies each face by a fixed
 * brightness based on its direction. Reproducing that is both cheaper and more
 * faithful than adding real lights.
 */
const FACE_SHADE: Record<FaceName, number> = {
  up: 1.0,
  down: 0.5,
  north: 0.8,
  south: 0.8,
  west: 0.6,
  east: 0.6,
};

/**
 * Corner order is top-left, top-right, bottom-right, bottom-left as seen from outside
 * the face, matching how Minecraft maps `uv` = [u1, v1, u2, v2] onto it.
 */
function faceCorners(
  face: FaceName,
  [x1, y1, z1]: number[],
  [x2, y2, z2]: number[]
): [number, number, number][] {
  switch (face) {
    case "north":
      return [
        [x2, y2, z1],
        [x1, y2, z1],
        [x1, y1, z1],
        [x2, y1, z1],
      ];
    case "south":
      return [
        [x1, y2, z2],
        [x2, y2, z2],
        [x2, y1, z2],
        [x1, y1, z2],
      ];
    case "west":
      return [
        [x1, y2, z1],
        [x1, y2, z2],
        [x1, y1, z2],
        [x1, y1, z1],
      ];
    case "east":
      return [
        [x2, y2, z2],
        [x2, y2, z1],
        [x2, y1, z1],
        [x2, y1, z2],
      ];
    case "up":
      return [
        [x1, y2, z1],
        [x2, y2, z1],
        [x2, y2, z2],
        [x1, y2, z2],
      ];
    case "down":
      return [
        [x1, y1, z2],
        [x2, y1, z2],
        [x2, y1, z1],
        [x1, y1, z1],
      ];
  }
}

/** Mirrors Minecraft's automatic UV generation for faces that omit an explicit `uv`. */
function defaultUv(
  face: FaceName,
  [x1, y1, z1]: number[],
  [x2, y2, z2]: number[]
): [number, number, number, number] {
  switch (face) {
    case "north":
      return [16 - x2, 16 - y2, 16 - x1, 16 - y1];
    case "south":
      return [x1, 16 - y2, x2, 16 - y1];
    case "west":
      return [z1, 16 - y2, z2, 16 - y1];
    case "east":
      return [16 - z2, 16 - y2, 16 - z1, 16 - y1];
    case "up":
      return [x1, z1, x2, z2];
    case "down":
      return [x1, 16 - z2, x2, 16 - z1];
  }
}

function applyElementRotation(
  vertex: THREE.Vector3,
  rotation: NonNullable<ModelElement["rotation"]>
): void {
  const origin = new THREE.Vector3(...rotation.origin);
  const angle = THREE.MathUtils.degToRad(rotation.angle);

  vertex.sub(origin);

  if (rotation.rescale && rotation.angle !== 0) {
    // Minecraft grows the element so its rotated silhouette still spans the full block.
    const scale = 1 / Math.cos(angle);
    if (rotation.axis === "x") {
      vertex.y *= scale;
      vertex.z *= scale;
    } else if (rotation.axis === "y") {
      vertex.x *= scale;
      vertex.z *= scale;
    } else {
      vertex.x *= scale;
      vertex.y *= scale;
    }
  }

  if (rotation.axis === "x") vertex.applyAxisAngle(new THREE.Vector3(1, 0, 0), angle);
  else if (rotation.axis === "y") vertex.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
  else vertex.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);

  vertex.add(origin);
}

interface Accumulator {
  positions: number[];
  uvs: number[];
  colors: number[];
  indices: number[];
}

function pushFace(
  acc: Accumulator,
  element: ModelElement,
  faceName: FaceName,
  face: ModelFace,
  shadeColor: THREE.Color
): void {
  const corners = faceCorners(faceName, element.from, element.to);
  const uv = face.uv ?? defaultUv(faceName, element.from, element.to);

  // uv corners in the same TL, TR, BR, BL order as the geometry corners.
  let uvCorners: [number, number][] = [
    [uv[0], uv[1]],
    [uv[2], uv[1]],
    [uv[2], uv[3]],
    [uv[0], uv[3]],
  ];

  const steps = ((face.rotation ?? 0) / 90) % 4;
  for (let i = 0; i < steps; i++) {
    uvCorners = [uvCorners[3], uvCorners[0], uvCorners[1], uvCorners[2]];
  }

  const baseIndex = acc.positions.length / 3;

  for (let i = 0; i < 4; i++) {
    const vertex = new THREE.Vector3(...corners[i]);
    if (element.rotation) applyElementRotation(vertex, element.rotation);
    // Model space is a 16-unit cube with the origin at a corner; centre it on a unit cube.
    acc.positions.push(vertex.x / 16 - 0.5, vertex.y / 16 - 0.5, vertex.z / 16 - 0.5);
    acc.uvs.push(uvCorners[i][0] / 16, 1 - uvCorners[i][1] / 16);
    acc.colors.push(shadeColor.r, shadeColor.g, shadeColor.b);
  }

  acc.indices.push(
    baseIndex,
    baseIndex + 1,
    baseIndex + 2,
    baseIndex,
    baseIndex + 2,
    baseIndex + 3
  );
}

const textureCache = new Map<string, THREE.Texture>();
const materialCache = new Map<string, THREE.MeshBasicMaterial>();

/**
 * Animated textures ship as a vertical strip of square frames (a lantern is 16x48, three
 * frames; fire is 16x512, thirty-two). Mapping a face across the whole strip squashes
 * every frame into it, so the UV transform is narrowed to the first frame once the image
 * has loaded and its real proportions are known.
 */
function clampToFirstFrame(texture: THREE.Texture): void {
  const image = texture.image as { width?: number; height?: number } | undefined;
  const width = image?.width ?? 0;
  const height = image?.height ?? 0;

  if (width <= 0 || height <= width || height % width !== 0) return;

  const frames = height / width;
  texture.repeat.set(1, 1 / frames);
  // three's UV origin is the bottom-left, so the first frame sits at the top of the range.
  texture.offset.set(0, 1 - 1 / frames);
}

function loadTexture(path: string): THREE.Texture {
  const cached = textureCache.get(path);
  if (cached) return cached;

  const texture = new THREE.TextureLoader().load(textureUrl(path), clampToFirstFrame);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(path, texture);
  return texture;
}

/**
 * Shading and tint live in the vertex colours, so a material depends on nothing but its
 * texture and can be shared by every block that uses it.
 */
function getMaterial(path: string): THREE.MeshBasicMaterial {
  const cached = materialCache.get(path);
  if (cached) return cached;

  const material = new THREE.MeshBasicMaterial({
    map: loadTexture(path),
    vertexColors: true,
    transparent: true,
    // Cutout textures (grass, petals) must not blend their fully transparent pixels.
    alphaTest: 0.1,
    side: THREE.DoubleSide,
  });

  materialCache.set(path, material);
  return material;
}

/**
 * Builds one mesh per texture. Face brightness and biome tint are baked into vertex
 * colours so that every face sharing a texture can live in a single draw call.
 */
export function buildBlockMesh(model: ResolvedModel, tint: number): THREE.Group {
  const group = new THREE.Group();
  const byTexture = new Map<string, Accumulator>();
  const tintColor = new THREE.Color(tint);

  for (const element of model.elements) {
    for (const [name, face] of Object.entries(element.faces) as [FaceName, ModelFace][]) {
      if (!face) continue;

      const path = resolveTextureRef(model.textures, face.texture);
      if (!path) continue;

      const shade = element.shade === false ? 1 : FACE_SHADE[name];
      const color = new THREE.Color(shade, shade, shade);
      if (face.tintindex !== undefined) color.multiply(tintColor);

      let acc = byTexture.get(path);
      if (!acc) {
        acc = { positions: [], uvs: [], colors: [], indices: [] };
        byTexture.set(path, acc);
      }
      pushFace(acc, element, name, face, color);
    }
  }

  for (const [path, acc] of byTexture) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(acc.positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(acc.uvs, 2));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(acc.colors, 3));
    geometry.setIndex(acc.indices);
    geometry.computeVertexNormals();

    group.add(new THREE.Mesh(geometry, getMaterial(path)));
  }

  return group;
}

export const __testables = { clampToFirstFrame };

export function disposeGroup(group: THREE.Group): void {
  group.traverse((obj) => {
    // Only the geometry belongs to this block; materials and textures are shared caches.
    if (obj instanceof THREE.Mesh) obj.geometry.dispose();
  });
}
