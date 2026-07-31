const stubEl = () => ({
  addEventListener() {}, removeEventListener() {},
  set src(_v: string) {}, get src() { return ""; },
});
(globalThis as any).document = { createElementNS: stubEl, createElement: stubEl };

import * as THREE from "three";
import { mergeDuplicates } from "./src/types";
import { __testables } from "./src/mc/buildMesh";

const failures: string[] = [];
const check = (c: boolean, m: string) => { if (!c) failures.push(m); };

console.log("--- duplicate merging ---");
const merged = mergeDuplicates([
  { id: "minecraft:lantern", count: 37 },
  { id: "minecraft:dirt", count: 11 },
  { id: "minecraft:lantern", count: 3 },
  { id: "dirt", count: 5 },
  { id: "minecraft:obsidian", count: 33 },
]);
for (const m of merged) console.log(`  ${m.id.padEnd(22)} ${m.count}`);

check(merged.length === 3, `expected 3 unique entries, got ${merged.length}`);
check(merged.find((m) => m.id === "minecraft:lantern")!.count === 40, "lantern counts should sum to 40");
check(merged.find((m) => m.id === "minecraft:dirt")!.count === 16,
  "dirt should sum across namespaced and bare ids");

const keys = merged.map((m) => m.id);
check(new Set(keys).size === keys.length, "merged list still contains duplicate React keys");

// The original objects must not be mutated: App re-sorts copies of this array.
const source = [{ id: "a", count: 1 }, { id: "a", count: 2 }];
mergeDuplicates(source);
check(source[0].count === 1, "mergeDuplicates mutated its input");

console.log("\n--- animated texture frames ---");
const frameCase = (w: number, h: number) => {
  const tex = new THREE.Texture();
  (tex as any).image = { width: w, height: h };
  __testables.clampToFirstFrame(tex);
  return tex;
};

const cases: [string, number, number, number][] = [
  ["lantern", 16, 48, 1 / 3],
  ["sea_lantern", 16, 80, 1 / 5],
  ["fire", 16, 512, 1 / 32],
  ["dirt (static)", 16, 16, 1],
  ["wide (not a strip)", 32, 16, 1],
  ["ragged height", 16, 40, 1],
];
for (const [label, w, h, expectedRepeat] of cases) {
  const tex = frameCase(w, h);
  console.log(
    `  ${label.padEnd(20)} ${w}x${h} repeat.y=${tex.repeat.y.toFixed(4)} offset.y=${tex.offset.y.toFixed(4)}`
  );
  check(Math.abs(tex.repeat.y - expectedRepeat) < 1e-9,
    `${label}: repeat.y ${tex.repeat.y} != ${expectedRepeat}`);
  // The visible window must end exactly at the top of the image, where frame 0 lives.
  check(Math.abs(tex.offset.y + tex.repeat.y - 1) < 1e-9,
    `${label}: window does not end at the top of the texture`);
}

if (failures.length) {
  console.log(`\nFAILURES (${failures.length}):`);
  for (const f of failures) console.log("  x " + f);
  process.exit(1);
}
console.log("\nAll assertions passed.");
