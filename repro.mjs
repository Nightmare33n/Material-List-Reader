// Drives the real app in a browser to reproduce the reported bugs.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const URL_BASE = process.env.APP_URL ?? "http://localhost:5173";
const OUT = "repro-out";
mkdirSync(OUT, { recursive: true });

// Includes the reported lantern, other animated textures, and deliberate duplicate ids.
const list = {
  name: "repro",
  items: [
    { id: "minecraft:lantern", count: 37 },
    { id: "minecraft:soul_lantern", count: 12 },
    { id: "minecraft:sea_lantern", count: 5 },
    { id: "minecraft:magma_block", count: 8 },
    { id: "minecraft:prismarine", count: 64 },
    { id: "minecraft:grass_block", count: 619 },
    { id: "minecraft:mangrove_stairs", count: 7 },
    { id: "minecraft:mangrove_slab", count: 94 },
    { id: "minecraft:dark_oak_trapdoor", count: 106 },
    { id: "minecraft:obsidian", count: 33 },
    { id: "minecraft:dirt", count: 11 },
    { id: "minecraft:netherrack", count: 34 },
    { id: "minecraft:short_grass", count: 62 },
    { id: "minecraft:mangrove_sign", count: 55 },
    { id: "minecraft:brown_banner", count: 7 },
    { id: "minecraft:pointed_dripstone", count: 1 },
    { id: "minecraft:red_nether_bricks", count: 8 },
    { id: "minecraft:deepslate_tiles", count: 32 },
    // Duplicates: the same block named twice, and once without the namespace.
    { id: "minecraft:lantern", count: 3 },
    { id: "minecraft:dirt", count: 5 },
    { id: "dirt", count: 2 },
  ],
};

const uniqueIds = new Set(list.items.map((i) => i.id.replace(/^minecraft:/, ""))).size;
writeFileSync(`${OUT}/list.json`, JSON.stringify(list));

const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto(URL_BASE, { waitUntil: "networkidle" });

await page.setInputFiles("input[type=file]", `${OUT}/list.json`);
await page.waitForSelector(".material-grid .slot");
// Give the model index and textures time to arrive.
await page.waitForTimeout(6000);

const countSlots = () => page.locator(".material-grid .slot").count();
const countAnchors = () =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll(".block-3d")).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }).length
  );

const snapshot = async (label) => {
  const slots = await countSlots();
  const anchors = await countAnchors();
  const icons = await page.locator(".block-2d").count();
  const missing = await page.locator(".block-missing").count();
  await page.screenshot({ path: `${OUT}/${label}.png` });
  console.log(
    `${label.padEnd(18)} slots=${slots} anchors3d=${anchors} icons2d=${icons} missing=${missing}`
  );
  return { slots, anchors, icons, missing };
};

console.log(`input rows=${list.items.length} unique ids=${uniqueIds}\n`);

const initial = await snapshot("1-initial");

await page.selectOption(".toolbar-sort", "count-asc");
await page.waitForTimeout(2500);
const asc = await snapshot("2-count-asc");

await page.selectOption(".toolbar-sort", "name-asc");
await page.waitForTimeout(2500);
const nameAsc = await snapshot("3-name-asc");

await page.selectOption(".toolbar-sort", "count-desc");
await page.waitForTimeout(2500);
const back = await snapshot("4-back-to-desc");

// Zoom in on the lantern to inspect its texture.
const lantern = page.locator(".slot").filter({ hasText: "37" }).first();
if (await lantern.count()) {
  await lantern.screenshot({ path: `${OUT}/5-lantern.png` });
  console.log("\nsaved lantern close-up");
}

console.log("\n--- assertions ---");
const failures = [];
const check = (c, m) => { if (!c) failures.push(m); };

check(initial.slots === uniqueIds, `initial slots ${initial.slots} != unique ids ${uniqueIds} (duplicates not merged)`);
for (const [label, s] of [["count-asc", asc], ["name-asc", nameAsc], ["back", back]]) {
  check(s.slots === initial.slots, `${label}: slot count changed ${initial.slots} -> ${s.slots}`);
  check(s.anchors === initial.anchors, `${label}: 3D anchors changed ${initial.anchors} -> ${s.anchors}`);
  check(s.missing === 0, `${label}: ${s.missing} slots show the missing-texture placeholder`);
}

if (errors.length) {
  console.log(`\nconsole output (${errors.length}):`);
  for (const e of errors.slice(0, 10)) console.log("  " + e);
}

if (failures.length) {
  console.log(`\nFAILURES (${failures.length}):`);
  for (const f of failures) console.log("  x " + f);
} else {
  console.log("\nAll assertions passed.");
}

await browser.close();
process.exit(failures.length ? 1 : 0);
