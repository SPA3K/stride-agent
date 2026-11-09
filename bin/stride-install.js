#!/usr/bin/env node
/*
 * stride-install — install the Stride skill into a Claude Code skills dir.
 * Cross-platform (no bash required). Idempotent: CLAUDE.md block added once.
 *
 *   stride-install                     -> ~/.claude/skills/stride + ./CLAUDE.md
 *   stride-install --dry-run           -> print the plan, write nothing
 *   stride-install --target <dir>      -> custom skill target
 *   stride-install --claude-md <file>  -> custom CLAUDE.md to register in
 *   stride-install --selftest          -> run assertions in a temp dir (CI)
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const SRC = path.resolve(__dirname, "..");
const FILES = ["SKILL.md"];
const DIRS = ["agents", "prompts"];

function blockFor(target) {
  const t = target.replace(/\\/g, "/");
  return [
    "## Stride Mode",
    "",
    "For multi-file changes or complex refactors, use Stride mode:",
    `- Read ${t}/SKILL.md and follow its rules strictly`,
    "- Or prefix your prompt with /stride",
  ].join("\n");
}

function install(target, claudeMd, dry) {
  const log = [];
  const plan = [...DIRS.map((d) => path.join(target, d)), path.join(target, "SKILL.md")];
  if (dry) return plan.map((p) => "[dry-run] would write " + p);

  fs.mkdirSync(target, { recursive: true });
  for (const d of DIRS) {
    fs.cpSync(path.join(SRC, d), path.join(target, d), { recursive: true });
  }
  for (const f of FILES) {
    fs.copyFileSync(path.join(SRC, f), path.join(target, f));
  }
  log.push("installed skill -> " + target);

  if (claudeMd) {
    let cur = "";
    try {
      cur = fs.readFileSync(claudeMd, "utf8");
    } catch (_) {}
    if (cur.includes("## Stride Mode")) {
      log.push("claude.md already registered: " + claudeMd);
    } else {
      fs.appendFileSync(claudeMd, "\n\n" + blockFor(target) + "\n");
      log.push("registered stride mode in: " + claudeMd);
    }
  }
  return log;
}

function selftest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stride-selftest-"));
  try {
    const target = path.join(tmp, "skills", "stride");
    const md = path.join(tmp, "CLAUDE.md");
    install(target, md, false);
    install(target, md, false); // second run must be idempotent
    const filesOk = ["SKILL.md", "agents", "prompts"].every((p) =>
      fs.existsSync(path.join(target, p))
    );
    const mdCount = fs.readFileSync(md, "utf8").split("## Stride Mode").length - 1;
    const ok = filesOk && mdCount === 1;
    console.log(ok ? "selftest OK (files copied, CLAUDE.md block exactly once)" : "selftest FAILED");
    return ok ? 0 : 1;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (has("--selftest")) {
  process.exit(selftest());
}

const target = opt("--target", path.join(os.homedir(), ".claude", "skills", "stride"));
const claudeMd = opt("--claude-md", path.join(process.cwd(), "CLAUDE.md"));
const dry = has("--dry-run");
console.log((dry ? "[dry-run] " : "") + "target: " + target);
for (const line of install(target, claudeMd, dry)) console.log("  " + line);
if (!dry) console.log("done. Restart Claude Code (or start a new session) to pick up /stride.");
