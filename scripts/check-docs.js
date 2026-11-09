#!/usr/bin/env node
/*
 * check-docs.js — the real signal behind the Docs CI badge:
 *   1. all JSON artifacts parse (package/manifests/benchmark data)
 *   2. every local link in README.md / README_zh.md points at a file that exists
 *   3. the installer passes its selftest (copy + idempotent CLAUDE.md registration)
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
let failed = 0;

const jsons = [
  "package.json",
  "benchmarks/raw_results.json",
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
];
for (const f of jsons) {
  try {
    JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
    console.log("json ok:", f);
  } catch (e) {
    failed++;
    console.error("json FAIL:", f, "-", e.message);
  }
}

for (const rd of ["README.md", "README_zh.md"]) {
  const txt = fs.readFileSync(path.join(root, rd), "utf8");
  const re = /\]\(([^)\s]+)\)/g;
  let m;
  let checked = 0;
  while ((m = re.exec(txt))) {
    const link = m[1];
    if (/^(https?:|mailto:|#)/.test(link)) continue;
    if (link.startsWith("..")) continue; // GitHub-relative (e.g. ../../issues)
    const clean = decodeURIComponent(link.split("#")[0]);
    if (!clean) continue;
    checked++;
    if (!fs.existsSync(path.join(root, clean))) {
      failed++;
      console.error(`dead local link in ${rd}: ${link}`);
    }
  }
  console.log(`links ok: ${rd} (${checked} local checked)`);
}

const st = spawnSync(process.execPath, [path.join(root, "bin", "stride-install.js"), "--selftest"], {
  stdio: "inherit",
});
if (st.status !== 0) failed++;

console.log(failed ? `check-docs: ${failed} FAILURE(S)` : "check-docs: all green");
process.exit(failed ? 1 : 0);
