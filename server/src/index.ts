import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import { config, tenantConnectEnabled } from "./config.js";
import { csrfGuard, clearSessionCookie, devLogin, googleLogin, loadSession, publicUser, requireAuth } from "./auth.js";
import { tenantRouter } from "./tenant.js";
import { PRODUCTS, productById, searchProducts } from "./knowledge/products.js";
import { TERMS, searchTerms } from "./knowledge/terms.js";
import { SOURCES } from "./knowledge/sources.js";
import { TRANSITIONS } from "./knowledge/transitions.js";
import { advise, planFabric, analyzeWaste, BENCHMARKS, productInsights, snapshotToWasteLines } from "./insights.js";
import { sessions } from "./store.js";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'", "https://accounts.google.com"], frameSrc: ["https://accounts.google.com"],
  connectSrc: ["'self'", "https://accounts.google.com"], imgSrc: ["'self'", "data:", "https://*.googleusercontent.com"],
  styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"], fontSrc: ["'self'", "https://fonts.gstatic.com"],
}}, crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, crossOriginResourcePolicy: { policy: "cross-origin" } }));
// CORS: only for explicitly allowed origins (credentials => never "*")
app.use("/api", (q, r, n) => {
  const o = q.headers.origin;
  if (o && config.allowedOrigins.includes(o)) {
    r.setHeader("Access-Control-Allow-Origin", o); r.setHeader("Access-Control-Allow-Credentials", "true"); r.setHeader("Vary", "Origin");
    r.setHeader("Access-Control-Allow-Headers", "content-type, x-ma365"); r.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    if (q.method === "OPTIONS") return void r.sendStatus(204);
  }
  n();
});
app.use(express.json({ limit: "100kb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: true, legacyHeaders: false }));
app.use("/api", loadSession, csrfGuard);

// ---- public (works signed-out: generic insights)
app.get("/api/config", (_q, r) => r.json({ googleClientId: config.googleClientId, devLogin: config.allowDevLogin, tenantConnect: tenantConnectEnabled(), benchmarks: BENCHMARKS }));
app.get("/api/products", (q, r) => r.json({ products: (q.query.all === "1" ? PRODUCTS : searchProducts(String(q.query.q ?? ""))).map(lite), total: PRODUCTS.length }));
app.get("/api/products/:id", (q, r) => {
  const p = productById(String(q.params.id)); if (!p) return void r.status(404).json({ error: "not_found" });
  const profile = q.me?.user.profile;
  if (q.me) q.me.addHistory({ kind: "product", label: p.name, params: { id: p.id } });
  r.json({ product: p, personalized: Boolean(profile && hasProfile(profile)), insights: productInsights(p, profile && hasProfile(profile) ? profile : undefined), source: SOURCES[p.source] });
});
app.get("/api/terms", (q, r) => r.json({ terms: searchTerms(String(q.query.q ?? "")), sources: SOURCES }));

const advisorSchema = z.object({
  agreementType: z.enum(["EA", "MCA-E", "CSP", "MPSA", "Unknown"]), seats: z.number().int().min(1).max(5_000_000), annualSpendUsd: z.number().min(0).max(1e10),
  renewalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), termYears: z.number().int().min(1).max(5).optional(),
  azureAnnualUsd: z.number().min(0).max(1e10).optional(), supportAnnualUsd: z.number().min(0).max(1e10).optional(),
  edeHours: z.number().min(0).max(100000).optional(), edeUtilizationPct: z.number().min(0).max(100).optional(),
  hasAlternative: z.boolean().optional(), shelfwarePct: z.number().min(0).max(80).optional(),
});
app.post("/api/advisor", (q, r) => {
  const p = advisorSchema.safeParse(q.body); if (!p.success) return void r.status(400).json({ error: "invalid_input", issues: p.error.issues });
  if (q.me) q.me.addHistory({ kind: "advisor", label: `${p.data.agreementType} · ${p.data.seats} seats`, params: p.data });
  r.json(advise(p.data));
});
app.get("/api/transitions", (q, r) => {
  const snap = q.me?.user.snapshot; const held = new Set(snap?.skus.map((k) => k.productId).filter(Boolean));
  r.json({ transitions: TRANSITIONS.map((t) => ({ ...t, affectsYou: held.size ? t.affects.some((a) => held.has(a)) : null })), personalized: held.size > 0 });
});
const fabricSchema = z.object({
  premiumSku: z.enum(["P1", "P2", "P3", "P4", "P5"]), viewers: z.number().int().min(0).max(5e6), creators: z.number().int().min(0).max(5e6), proHeld: z.number().int().min(0).max(5e6),
  peakUtilisationPct: z.number().min(1).max(100).optional(), growthPctPerYear: z.number().min(0).max(300).optional(), termYears: z.number().int().min(1).max(5).optional(), currentAnnualCostUsd: z.number().min(0).max(1e10).optional(),
  overlapDays: z.number().int().min(0).max(1000).optional(), workspaces: z.number().int().min(0).max(1e5).optional(), largeModels: z.number().int().min(0).max(1e4).optional(), gatewayDependent: z.number().int().min(0).max(1e4).optional(), crossRegion: z.number().int().min(0).max(1e5).optional(),
});
app.post("/api/fabric-plan", (q, r) => {
  const p = fabricSchema.safeParse(q.body); if (!p.success) return void r.status(400).json({ error: "invalid_input" });
  if (q.me) q.me.addHistory({ kind: "advisor", label: `Fabric plan · ${p.data.premiumSku}, ${p.data.viewers} viewers`, params: p.data });
  r.json(planFabric(p.data));
});
const wasteSchema = z.object({ lines: z.array(z.object({ productId: z.string().max(60).optional(), name: z.string().max(120), purchased: z.number().int().min(0).max(5e6), assigned: z.number().int().min(0).max(5e6), active: z.number().int().min(0).max(5e6).optional(), unitPriceUsd: z.number().min(0).max(5000).optional() })).max(200) });
app.post("/api/waste", (q, r) => {
  const p = wasteSchema.safeParse(q.body); if (!p.success) return void r.status(400).json({ error: "invalid_input" });
  r.json(analyzeWaste(p.data.lines));
});

// ---- auth
app.post("/api/auth/google", googleLogin);
if (config.allowDevLogin) app.post("/api/auth/dev", devLogin);
app.post("/api/auth/logout", (q, r) => { if (q.sid) sessions.destroy(q.sid); clearSessionCookie(r); r.json({ ok: true }); });
app.get("/api/me", (q, r) => r.json({ user: q.me ? publicUser(q.me) : null }));

// ---- signed-in: workspace (scoped to req.me only)
const profileSchema = z.object({
  orgName: z.string().max(120).optional(), industry: z.string().max(80).optional(), employeeCount: z.number().int().min(1).max(5e6).optional(),
  agreementType: z.enum(["EA", "MCA-E", "CSP", "MPSA", "Unknown"]).optional(), renewalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  annualMicrosoftSpendUsd: z.number().min(0).max(1e10).optional(), primaryCloud: z.enum(["azure-first", "multi-cloud", "on-prem-heavy", "m365-only"]).optional(),
  priorities: z.array(z.string().max(80)).max(12), learnings: z.array(z.string().max(500)).max(50),
});
app.get("/api/workspace", requireAuth, (q, r) => { const u = q.me!.user; r.json({ profile: u.profile, history: u.history, user: publicUser(q.me!) }); });
app.put("/api/profile", requireAuth, (q, r) => {
  const p = profileSchema.safeParse(q.body); if (!p.success) return void r.status(400).json({ error: "invalid_input" });
  q.me!.setProfile({ ...p.data, renewalDate: p.data.renewalDate || undefined }); r.json({ ok: true });
});
app.delete("/api/history", requireAuth, (q, r) => { q.me!.clearHistory(); r.json({ ok: true }); });
app.get("/api/tenant-waste", requireAuth, (q, r) => {
  const s = q.me!.user.snapshot; if (!s) return void r.status(404).json({ error: "no_tenant_data" });
  r.json({ snapshot: { tenantName: s.tenantName, demo: s.demo, syncedAt: s.syncedAt }, analysis: analyzeWaste(snapshotToWasteLines(s)) });
});
app.delete("/api/account", requireAuth, (q, r) => { q.me!.deleteAccount(); clearSessionCookie(r); r.json({ ok: true }); });
app.use("/api/tenant", tenantRouter);
app.use("/api", (_q, r) => r.status(404).json({ error: "not_found" }));

app.get("/healthz", (_q, r) => void r.type("text").send("ok"));
// ---- static SPA (production)
const dist = path.resolve(import.meta.dirname, "../../web/dist");
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get(/^\/(?!api).*/, (_q, r) => r.sendFile(path.join(dist, "index.html"))); }

const hasProfile = (p: { orgName?: string; employeeCount?: number; priorities: string[]; learnings: string[]; agreementType?: string }) => Boolean(p.orgName || p.employeeCount || p.priorities.length || p.learnings.length || p.agreementType);
const lite = (p: (typeof PRODUCTS)[number]) => ({ id: p.id, name: p.name, family: p.family, summary: p.summary, listPriceUsd: p.listPriceUsd });

if (process.argv[1] && import.meta.filename === process.argv[1] || process.env.MA365_START === "1") {
  app.listen(config.port, () => console.log(`MA-365 API on :${config.port}`));
}

