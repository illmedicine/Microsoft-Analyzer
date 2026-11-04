// usage: npx tsx server/src/guard-cli.ts <base-ref>   — exits 1 if the working tree + HEAD differ from base in disallowed ways
import { execFileSync } from "node:child_process";
import { checkChange } from "./guard.js";

const base = process.argv[2] ?? "origin/main";
const run = (...a: string[]) => execFileSync("git", a, { encoding: "utf8" });
run("add", "-A", "--", ".", ":(exclude)ai-summary.md");
const files = run("diff", "--cached", "--name-only", base).split("\n").filter(Boolean);
const stat = run("diff", "--cached", "--numstat", base).split("\n").filter(Boolean).reduce((n, l) => { const [a, d] = l.split("\t"); return n + (Number(a) || 0) + (Number(d) || 0); }, 0);
const r = checkChange(files, stat);
console.log(JSON.stringify({ files, changedLines: stat, ...r }, null, 2));
process.exit(r.ok ? 0 : 1);
