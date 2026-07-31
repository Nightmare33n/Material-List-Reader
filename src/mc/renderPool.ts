import * as THREE from "three";

const TILT_DEG = 30;
const SPIN_RADIANS_PER_SECOND = 0.6;
const TARGET_FPS = 30;

/**
 * Half-extent that exactly frames a spinning full block, plus margin. Every block is
 * rendered at this scale so a slab reads as half-height and a chain as thin, the way
 * Minecraft's own inventory shows them.
 */
const BASE_HALF = 0.9;

interface Entry {
  /** The slot element the block is drawn over; its position is read back each frame. */
  anchor: HTMLElement;
  /** Outer pivot spun around Y; the model sits inside it, offset so it spins about its centre. */
  pivot: THREE.Group;
  model: THREE.Group;
  half: number;
}

/**
 * All blocks share a single WebGL canvas stretched over the viewport. Each frame the
 * renderer walks the visible slots and draws straight into each slot's rectangle using
 * the scissor box, so nothing is ever copied back through the CPU.
 */
let renderer: THREE.WebGLRenderer | null = null;
let camera: THREE.OrthographicCamera | null = null;
let scene: THREE.Scene | null = null;
let frameId = 0;
let lastFrameTime = 0;
let webglFailed = false;

const entries = new Set<Entry>();

/** False when the browser cannot give us a WebGL context, so callers can show flat icons. */
export function isWebglAvailable(): boolean {
  return !webglFailed;
}

export function initOverlay(canvas: HTMLCanvasElement): () => void {
  // A canvas only ever hands out one WebGL context, so an existing renderer bound to the
  // same element is reused rather than disposed and rebuilt (which React does in dev).
  if (renderer && renderer.domElement === canvas) {
    start();
    return stop;
  }
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      // Ask for the discrete GPU on machines that have one.
      powerPreference: "high-performance",
    });
  } catch {
    webglFailed = true;
    return () => {};
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.setScissorTest(true);

  scene = new THREE.Scene();

  const tilt = THREE.MathUtils.degToRad(TILT_DEG);
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  // Matches the downward tilt Minecraft uses to show blocks in the inventory.
  camera.position.set(0, Math.sin(tilt), Math.cos(tilt));
  camera.lookAt(0, 0, 0);

  start();
  return stop;
}

/**
 * Centres the model inside its pivot and returns the orthographic half-extent to render
 * it at. Computed once, since neither the geometry nor the camera angle changes after.
 * Normally this is the shared BASE_HALF; models larger than a block get just enough
 * extra room to avoid clipping mid-spin.
 */
function fitModel(pivot: THREE.Group, model: THREE.Group): number {
  const box = new THREE.Box3().setFromObject(model);
  if (box.isEmpty()) return BASE_HALF;

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  model.position.set(-center.x, -center.y, -center.z);
  pivot.updateMatrixWorld(true);

  // Spinning around Y sweeps the footprint's diagonal, so use that as the horizontal reach.
  const radiusXZ = Math.hypot(size.x / 2, size.z / 2);
  const tilt = THREE.MathUtils.degToRad(TILT_DEG);
  const projectedHalfHeight = (size.y / 2) * Math.cos(tilt) + radiusXZ * Math.sin(tilt);

  return Math.max(BASE_HALF, radiusXZ * 1.08, projectedHalfHeight * 1.08);
}

/**
 * Converts a slot's viewport rectangle into WebGL viewport coordinates, whose origin is
 * the bottom-left of the canvas. Returns null when the slot is scrolled out of sight.
 */
export function rectToViewport(
  rect: { left: number; top: number; width: number; height: number },
  viewportHeight: number,
  viewportWidth: number
): { x: number; y: number; width: number; height: number } | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  if (rect.top >= viewportHeight || rect.top + rect.height <= 0) return null;
  if (rect.left >= viewportWidth || rect.left + rect.width <= 0) return null;

  return {
    x: rect.left,
    y: viewportHeight - (rect.top + rect.height),
    width: rect.width,
    height: rect.height,
  };
}

function loop(time: number): void {
  frameId = requestAnimationFrame(loop);
  if (!renderer || !scene || !camera) return;

  // Rotation is smooth well below display refresh, and halving the frame rate halves
  // the per-block draw calls.
  if (time - lastFrameTime < 1000 / TARGET_FPS) return;
  lastFrameTime = time;

  const width = window.innerWidth;
  const height = window.innerHeight;

  const canvasSize = renderer.getSize(new THREE.Vector2());
  if (canvasSize.x !== width || canvasSize.y !== height) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
  }

  // Wipe the whole canvas once, then let each block clear and draw inside its own box.
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);

  const angle = (time / 1000) * SPIN_RADIANS_PER_SECOND;

  for (const entry of entries) {
    const view = rectToViewport(entry.anchor.getBoundingClientRect(), height, width);
    if (!view) continue;

    entry.pivot.rotation.y = angle;

    camera.left = -entry.half;
    camera.right = entry.half;
    camera.top = entry.half;
    camera.bottom = -entry.half;
    camera.updateProjectionMatrix();

    renderer.setViewport(view.x, view.y, view.width, view.height);
    renderer.setScissor(view.x, view.y, view.width, view.height);

    scene.clear();
    scene.add(entry.pivot);
    renderer.render(scene, camera);
  }
}

function start(): void {
  if (!frameId) frameId = requestAnimationFrame(loop);
}

function stop(): void {
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = 0;
  }
}

export function registerBlock(model: THREE.Group, anchor: HTMLElement): () => void {
  const pivot = new THREE.Group();
  pivot.add(model);

  const entry: Entry = { anchor, pivot, model, half: fitModel(pivot, model) };
  entries.add(entry);

  return () => {
    entries.delete(entry);
    pivot.remove(model);
  };
}
