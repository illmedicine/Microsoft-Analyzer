import crypto from "node:crypto";
import { Router } from "express";
import { config, tenantConnectEnabled } from "./config.js";
import { open, randomToken, seal, sha256 } from "./crypto.js";
import { productBySku } from "./knowledge/products.js";
import { pending, scope, type TenantSnapshot, type TenantSku, type UserScope } from "./store.js";
import { requireAuth } from "./auth.js";

/**
 * TENANT ISOLATION MODEL
 *  1. A tenant link is created only inside a callback whose one-time `state` was minted for the CURRENT session's user,
 *     and the callback must arrive carrying that same session. A forged/replayed link cannot attach a tenant to someone else.
 *  2. A real (non-demo) tenantId can be owned by exactly ONE MA-365 account at a time (store.tenantOwners).
 *  3. Refresh tokens are AES-256-GCM sealed with the owning userId as AAD — a blob lifted onto another account won't decrypt.
 *  4. No route accepts a userId/tenantId from the client; all reads go through `req.me`.
 *  5. Read-only delegated scopes only (Organization.Read.All, offline_access).
 */
const AUTH = "https://login.microsoftonline.com/organizations/oauth2/v2.0";
const SCOPES = "openid profile offline_access https://graph.microsoft.com/Organization.Read.All";
const redirectUri = () => `${config.apiUrl}/api/tenant/callback`;

export const tenantRouter = Router();

tenantRouter.get("/status", requireAuth, (req, res) => {
  const u = req.me!.user;
  res.json({ enabled: tenantConnectEnabled(), linked: u.tenant ? { tenantId: u.tenant.tenantId, tenantName: u.tenant.tenantName, demo: u.tenant.demo, linkedAt: u.tenant.linkedAt } : null, snapshot: u.snapshot ?? null });
});

tenantRouter.post("/connect", requireAuth, (req, res) => {
  if (!tenantConnectEnabled()) return void res.status(503).json({ error: "ms_not_configured" });
  const state = randomToken(32), verifier = randomToken(48);
  pending.put({ stateHash: sha256(state), userId: req.me!.user.id, sessionHash: req.sid!, verifier, expiresAt: Date.now() + 10 * 60_000 });
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const q = new URLSearchParams({ client_id: config.msClientId, response_type: "code", redirect_uri: redirectUri(), response_mode: "query", scope: SCOPES, state, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account" });
  res.json({ url: `${AUTH}/authorize?${q}` });
});

// Browser navigation (GET). Authenticated by session cookie AND single-use state.
tenantRouter.get("/callback", async (req, res) => {
  const back = (s: string) => res.redirect(`${config.publicUrl}/workspace?tenant=${s}`);
  const { code, state, error } = req.query as Record<string, string | undefined>;
  if (error || !code || !state) return back("denied");
  const p = pending.take(sha256(state));                                  // single use
  if (!p) return back("expired");
  if (!req.me || req.me.user.id !== p.userId || req.sid !== p.sessionHash) return back("session_mismatch"); // bound to same user + session
  try {
    const tok = await fetch(`${AUTH}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: config.msClientId, client_secret: config.msClientSecret, grant_type: "authorization_code", code, redirect_uri: redirectUri(), code_verifier: p.verifier, scope: SCOPES }) });
    const j: any = await tok.json();
    if (!tok.ok || !j.id_token || !j.refresh_token) return back("token_error");
    const claims = JSON.parse(Buffer.from(String(j.id_token).split(".")[1]!, "base64url").toString());
    const tenantId = String(claims.tid ?? ""); if (!/^[0-9a-f-]{36}$/i.test(tenantId)) return back("bad_tenant");
    const me = req.me;
    const ok = me.linkTenant({ tenantId, linkedAt: new Date().toISOString(), demo: false, refreshTokenSealed: seal(j.refresh_token, me.user.id) });
    if (!ok) return back("tenant_owned_by_another_account");
    await syncSnapshot(me, j.access_token).catch(() => undefined);
    back("connected");
  } catch { back("error"); }
});

tenantRouter.post("/sync", requireAuth, async (req, res) => {
  const me = req.me!, link = me.user.tenant;
  if (!link || link.demo || !link.refreshTokenSealed) return void res.status(400).json({ error: "no_live_tenant" });
  try {
    const rt = open(link.refreshTokenSealed, me.user.id);
    const r = await fetch(`${AUTH}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: config.msClientId, client_secret: config.msClientSecret, grant_type: "refresh_token", refresh_token: rt, scope: SCOPES }) });
    const j: any = await r.json(); if (!r.ok) return void res.status(502).json({ error: "token_refresh_failed" });
    if (j.refresh_token) link.refreshTokenSealed = seal(j.refresh_token, me.user.id);
    res.json({ snapshot: await syncSnapshot(me, j.access_token) });
  } catch { res.status(502).json({ error: "sync_failed" }); }
});

tenantRouter.post("/demo", requireAuth, (req, res) => {
  const me = req.me!;
  me.linkTenant({ tenantId: "demo", tenantName: "Contoso (sample data)", linkedAt: new Date().toISOString(), demo: true });
  const snap: TenantSnapshot = { demo: true, tenantId: "demo", tenantName: "Contoso (sample data)", syncedAt: new Date().toISOString(), skus: [
    sku("SPE_E5", "Microsoft 365 E5", 2500, 1710), sku("SPE_E3", "Microsoft 365 E3", 1200, 1004), sku("SPE_F1", "Microsoft 365 F3", 900, 622),
    sku("Microsoft_365_Copilot", "Microsoft 365 Copilot", 400, 138), sku("POWER_BI_PRO", "Power BI Pro", 600, 311), sku("AAD_PREMIUM", "Entra ID P1", 800, 790), sku("EMS", "EMS E3", 700, 698), sku("MCOEV", "Teams Phone (Standard)", 1500, 880),
  ] };
  me.setSnapshot(snap); res.json({ snapshot: snap });
});

tenantRouter.delete("/", requireAuth, (req, res) => { req.me!.unlinkTenant(); res.json({ ok: true }); });

const sku = (part: string, name: string, purchased: number, assigned: number): TenantSku => ({ skuId: part, skuPartNumber: part, productId: productBySku(part)?.id, name, purchased, assigned, suspended: 0 });

async function syncSnapshot(me: UserScope, accessToken: string): Promise<TenantSnapshot> {
  const link = me.user.tenant!;
  const [skuRes, orgRes] = await Promise.all([
    fetch("https://graph.microsoft.com/v1.0/subscribedSkus?$select=skuId,skuPartNumber,prepaidUnits,consumedUnits", { headers: { authorization: `Bearer ${accessToken}` } }),
    fetch("https://graph.microsoft.com/v1.0/organization?$select=id,displayName", { headers: { authorization: `Bearer ${accessToken}` } }),
  ]);
  if (!skuRes.ok) throw new Error("graph_error");
  const s: any = await skuRes.json(), o: any = orgRes.ok ? await orgRes.json() : {};
  const orgId = o.value?.[0]?.id;
  if (orgId && orgId !== link.tenantId) throw new Error("tenant_mismatch"); // Graph answered for a different tenant than we linked
  link.tenantName = o.value?.[0]?.displayName ?? link.tenantName;
  const snap: TenantSnapshot = { demo: false, tenantId: link.tenantId, tenantName: link.tenantName, syncedAt: new Date().toISOString(),
    skus: (s.value ?? []).map((k: any): TenantSku => { const prod = productBySku(k.skuPartNumber);
      return { skuId: k.skuId, skuPartNumber: k.skuPartNumber, productId: prod?.id, name: prod?.name ?? k.skuPartNumber, purchased: k.prepaidUnits?.enabled ?? 0, assigned: k.consumedUnits ?? 0, suspended: k.prepaidUnits?.suspended ?? 0 }; }) };
  me.setSnapshot(snap); return snap;
}
