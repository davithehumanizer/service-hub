#!/usr/bin/env node
// get_descendant_ids.js
// Usage: node get_descendant_ids.js --parents 1,2,3 --flat ./categories_output_flat.json --out ./selected_ids.json

const fs = require("fs");
const path = require("path");

function usage() {
  console.log(
    "Usage: node get_descendant_ids.js --parents 1,2,3 --flat <path-to-flat-json> [--out <path>]"
  );
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--parents" && args[i + 1]) {
      out.parents = args[++i];
      continue;
    }
    if (a === "--flat" && args[i + 1]) {
      out.flat = args[++i];
      continue;
    }
    if (a === "--out" && args[i + 1]) {
      out.out = args[++i];
      continue;
    }
    if (a === "--help" || a === "-h") usage();
  }
  if (!out.parents || !out.flat) usage();
  return out;
}

function buildChildrenMap(categories) {
  const map = new Map();
  for (const c of categories) {
    const id = String(c.id ?? c.ID ?? c.Id ?? "").trim();
    if (!id) continue;
    const parent = String(
      c.parentId ?? c.ParentCategory ?? c.ParentId ?? ""
    ).trim();
    if (!map.has(parent)) map.set(parent, []);
    map.get(parent).push(id);
    // ensure child key exists so lookup for a child with no children returns []
    if (!map.has(id)) map.set(id, []);
  }
  return map;
}

function collectDescendants(startIds, childrenMap) {
  const seen = new Set();
  const stack = [];
  for (const s of startIds) {
    const sid = String(s).trim();
    if (sid === "") continue;
    if (!seen.has(sid)) {
      seen.add(sid);
      stack.push(sid);
    }
  }
  while (stack.length) {
    const cur = stack.pop();
    const children = childrenMap.get(cur) || [];
    for (const ch of children) {
      if (!seen.has(ch)) {
        seen.add(ch);
        stack.push(ch);
      }
    }
  }
  return Array.from(seen);
}

(async function main() {
  const argv = parseArgs();
  const flatPath = path.resolve(argv.flat);
  if (!fs.existsSync(flatPath)) {
    console.error("Flat categories file not found:", flatPath);
    process.exit(2);
  }
  let raw;
  try {
    raw = fs.readFileSync(flatPath, "utf8");
  } catch (err) {
    console.error("Failed to read flat categories file:", err.message);
    process.exit(3);
  }
  let categories;
  try {
    categories = JSON.parse(raw);
    if (!Array.isArray(categories)) throw new Error("Expected top-level array");
  } catch (err) {
    console.error(
      "Failed to parse JSON from flat categories file:",
      err.message
    );
    process.exit(4);
  }
  const childrenMap = buildChildrenMap(categories);
  const parentIds = argv.parents
    .split(",")
    .map((s) => String(s).trim())
    .filter(Boolean);
  const result = collectDescendants(parentIds, childrenMap);

  if (argv.out) {
    const outPath = path.resolve(argv.out);
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
    console.log(`Wrote ${result.length} ids to ${outPath}`);
  } else {
    console.log(JSON.stringify(result));
  }
})();
