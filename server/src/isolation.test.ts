import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import type { Server } from "node:http";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ma365-"));
process.env.DATA_DIR = dir; process.env.ALLOW_DEV_LOGIN = "1"; process.env.PUBLIC_URL = "http://localhost:5173";
process.env.MS_CLIENT_ID = "x"; process.env.MS_CLIENT_SECRET = "y";

let srv: Server; let base = "";
before(async () => {
  const { app } = await import("./index.js");
  await new Promise<void>((ok) => { srv = app.listen(0, () => ok()); });
  base = `http://127.0.0.1:${(srv.address() as any).port}`;
});
after(() => { srv.close(); fs.rmSync(dir, { recursive: true, force: true }); });

const H = { "content-type": "application/json", "x-ma365": "1" };
async function login(email: string) {
  const r = await fetch(`${base}/api/auth/dev`, { method: "POST", headers: H, body: JSON.stringify({ email }) });
  return r.headers.get("set-cookie")!.split(";")[0]!;
}
const api = (cookie: string, p: string, init: RequestInit = {}) => fetch(base + p, { ...init, headers: { ...H, cookie, ...(init.headers as object) } });

test("signed-out users get generic insights, no workspace", async () => {
  const r = await fetch(`${base}/api/products/m365-e5`); const j: any = await r.json();
  assert.equal(r.status, 200); assert.equal(j.personalized, false);
  assert.equal((await fetch(`${base}/api/workspace`)).status, 401);
});

test("profile data personalises insights for that user only", async () => {
  const a = await login("a@orga.com"), b = await login("b@orgb.com");
  await api(a, "/api/profile", { method: "PUT", body: JSON.stringify({ orgName: "A Corp", employeeCount: 900, priorities: ["cost"], learnings: ["A-SECRET-NOTE"] }) });
  const ja: any = await (await api(a, "/api/products/m365-e5")).json();
  const jb: any = await (await api(b, "/api/products/m365-e5")).json();
  assert.equal(ja.personalized, true); assert.ok(JSON.stringify(ja).includes("A-SECRET-NOTE"));
  assert.equal(jb.personalized, false); assert.ok(!JSON.stringify(jb).includes("A-SECRET-NOTE"));
  assert.ok(!JSON.stringify(await (await api(b, "/api/workspace")).json()).includes("A-SECRET-NOTE"));
});

test("tenant snapshots are walled off per account", async () => {
  const a = await login("c@orga.com"), b = await login("d@orgb.com");
  assert.equal((await api(a, "/api/tenant/demo", { method: "POST" })).status, 200);
  assert.equal((await api(a, "/api/tenant-waste")).status, 200);
  assert.equal((await api(b, "/api/tenant-waste")).status, 404);
  assert.equal((await api(b, "/api/tenant/status").then((r) => r.json()) as any).snapshot, null);
});

test("client-supplied user/tenant identifiers are ignored", async () => {
  const a = await login("e@orga.com"), b = await login("f@orgb.com");
  await api(a, "/api/tenant/demo", { method: "POST" });
  const r = await api(b, "/api/tenant-waste?userId=anything&tenantId=demo", { headers: { "x-user-id": "anything" } });
  assert.equal(r.status, 404);
});

test("OAuth callback with a state minted for another user/session is rejected and consumed", async () => {
  const a = await login("g@orga.com"), b = await login("h@orgb.com");
  const { url } = (await (await api(a, "/api/tenant/connect", { method: "POST" })).json()) as any;
  const state = new URL(url).searchParams.get("state")!;
  // attacker (b) tricks victim flow: b hits callback carrying a's state
  const bad = await fetch(`${base}/api/tenant/callback?code=c&state=${state}`, { headers: { cookie: b }, redirect: "manual" });
  assert.match(bad.headers.get("location")!, /session_mismatch/);
  // state is single-use: even the rightful owner can't replay it
  const replay = await fetch(`${base}/api/tenant/callback?code=c&state=${state}`, { headers: { cookie: a }, redirect: "manual" });
  assert.match(replay.headers.get("location")!, /expired/);
  // and no cookie at all
  const { url: u2 } = (await (await api(a, "/api/tenant/connect", { method: "POST" })).json()) as any;
  const anon = await fetch(`${base}/api/tenant/callback?code=c&state=${new URL(u2).searchParams.get("state")}`, { redirect: "manual" });
  assert.match(anon.headers.get("location")!, /session_mismatch/);
});

test("one real tenant can only belong to one account", async () => {
  const { scope, upsertGoogleUser } = await import("./store.js");
  const u1 = upsertGoogleUser({ sub: "s1", email: "1@x.com", name: "1" }), u2 = upsertGoogleUser({ sub: "s2", email: "2@x.com", name: "2" });
  const tid = "11111111-2222-3333-4444-555555555555";
  assert.equal(scope(u1.id).linkTenant({ tenantId: tid, linkedAt: "", demo: false }), true);
  assert.equal(scope(u2.id).linkTenant({ tenantId: tid, linkedAt: "", demo: false }), false);
  scope(u1.id).unlinkTenant();
  assert.equal(scope(u2.id).linkTenant({ tenantId: tid, linkedAt: "", demo: false }), true);
});

test("sealed tokens are bound to their owner", async () => {
  const { seal, open } = await import("./crypto.js");
  const blob = seal("refresh-token", "user-1");
  assert.equal(open(blob, "user-1"), "refresh-token");
  assert.throws(() => open(blob, "user-2"));
});

test("CSRF: state-changing calls need the custom header and matching origin", async () => {
  const a = await login("i@orga.com");
  const noHdr = await fetch(`${base}/api/profile`, { method: "PUT", headers: { "content-type": "application/json", cookie: a }, body: "{}" });
  assert.equal(noHdr.status, 403);
  const badOrigin = await fetch(`${base}/api/profile`, { method: "PUT", headers: { ...H, cookie: a, origin: "https://evil.example" }, body: "{}" });
  assert.equal(badOrigin.status, 403);
});

test("advisor + waste engines", async () => {
  const r: any = await (await fetch(`${base}/api/advisor`, { method: "POST", headers: H, body: JSON.stringify({ agreementType: "EA", seats: 2000, annualSpendUsd: 2_000_000, supportAnnualUsd: 200_000, edeUtilizationPct: 40, edeHours: 500 }) })).json();
  assert.ok(r.totalSavingsUsd.high > r.totalSavingsUsd.low && r.levers.some((l: any) => l.id === "support"));
  const w: any = await (await fetch(`${base}/api/waste`, { method: "POST", headers: H, body: JSON.stringify({ lines: [{ productId: "m365-e5", name: "E5", purchased: 100, assigned: 60 }] }) })).json();
  assert.equal(w.rows[0].unassigned, 40);
});
