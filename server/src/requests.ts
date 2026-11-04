import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "./auth.js";
import { sha256 } from "./crypto.js";
import { buildIssue, extractSummary, LABELS, MARKERS, parseStatus } from "./requests-core.js";

/**
 * Hosted Request-to-Release API. The GitHub token never leaves the server.
 * - Only allowlisted product-owner emails get `ai-request` (auto-build). Everyone else's requests get `needs-triage` (human first).
 * - A requester can read and act on ONLY their own requests (verified via a hashed owner marker in the issue).
 */
const REPO = process.env.REQUESTS_REPO ?? "illmedicine/Microsoft-Analyzer";
const OWNERS = new Set((process.env.PRODUCT_OWNER_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
export const requestsEnabled = () => Boolean(process.env.GITHUB_TOKEN);

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { ...init, headers: { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", authorization: `Bearer ${process.env.GITHUB_TOKEN}`, ...(init.body ? { "content-type": "application/json" } : {}) } });
  if (!r.ok) throw new Error(`github_${r.status}`);
  return (r.status === 204 ? undefined : await r.json()) as T;
}
interface GhIssue { number: number; title: string; body: string | null; state: "open" | "closed"; html_url: string; labels: { name: string }[] }

const hits = new Map<string, number[]>();
const limited = (uid: string) => { const now = Date.now(), a = (hits.get(uid) ?? []).filter((t) => now - t < 3600_000); a.push(now); hits.set(uid, a); return a.length > 10; };
const tag = (uid: string) => sha256(`ma365-req:${uid}`).slice(0, 32);

export const requestsRouter = Router();
requestsRouter.use(requireAuth, (_q, r, n) => (requestsEnabled() ? n() : void r.status(503).json({ error: "requests_not_configured" })));

const createSchema = z.object({ text: z.string().min(10).max(4000), ctx: z.object({ route: z.string().max(200), title: z.string().max(200).optional(), speech: z.boolean().optional() }) });
requestsRouter.post("/", async (q, r) => {
  const p = createSchema.safeParse(q.body); if (!p.success) return void r.status(400).json({ error: "invalid_input" });
  const u = q.me!.user; if (limited(u.id)) return void r.status(429).json({ error: "rate_limited" });
  try {
    const issue = buildIssue(p.data.text, p.data.ctx, { autoBuild: OWNERS.has(u.email.toLowerCase()), userTag: tag(u.id) });
    const created = await gh<GhIssue>("/issues", { method: "POST", body: JSON.stringify(issue) });
    r.json({ number: created.number, autoBuild: issue.labels[0] === LABELS.build });
  } catch (e) { r.status((e as Error).message === "too_short" ? 400 : 502).json({ error: "create_failed" }); }
});

async function mine(q: { params: { n?: string }; me?: { user: { id: string } } }) {
  const n = Number(q.params.n); if (!Number.isInteger(n) || n < 1) return;
  const i = await gh<GhIssue>(`/issues/${n}`);
  const b = i.body ?? "";
  return b.includes(MARKERS.request) && b.includes(`${MARKERS.user}${tag(q.me!.user.id)}`) ? i : undefined;
}
requestsRouter.get("/:n", async (q, r) => {
  try {
    const i = await mine(q); if (!i) return void r.status(404).json({ error: "not_found" });
    const c = await gh<{ body: string }[]>(`/issues/${i.number}/comments?per_page=100`);
    r.json({ number: i.number, title: i.title.replace(/^Request: /, ""), url: i.html_url, status: parseStatus(i.labels.map((l) => l.name), i.state), summary: extractSummary(c).summary });
  } catch { r.status(502).json({ error: "lookup_failed" }); }
});
requestsRouter.post("/:n/verdict", async (q, r) => {
  const v = z.enum(["keep", "revert"]).safeParse(q.body?.verdict); if (!v.success) return void r.status(400).json({ error: "invalid_input" });
  try {
    const i = await mine(q); if (!i) return void r.status(404).json({ error: "not_found" });
    if (parseStatus(i.labels.map((l) => l.name), i.state) !== "live") return void r.status(409).json({ error: "not_live" });
    await gh(`/issues/${i.number}/labels`, { method: "POST", body: JSON.stringify({ labels: [v.data === "keep" ? LABELS.keep : LABELS.revert] }) });
    if (v.data === "keep") await gh(`/issues/${i.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: "completed" }) });
    r.json({ ok: true });
  } catch { r.status(502).json({ error: "verdict_failed" }); }
});
