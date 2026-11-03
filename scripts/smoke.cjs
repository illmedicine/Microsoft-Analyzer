// Browser smoke test: node scripts/smoke.cjs <base-url>   (needs `playwright` resolvable, e.g. NODE_PATH=$(npm root -g))
const { chromium } = require("playwright");
const base = (process.argv[2] || "http://localhost:4173/").replace(/\/?$/, "/");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  p.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(base) && !/\/(advisor|terms|explore|licenses|transitions|workspace)$/.test(r.url())) errs.push(`HTTP ${r.status()} ${r.url()}`); });
  const results = []; const step = async (name, fn) => { try { await fn(); results.push(["PASS", name]); } catch (e) { results.push(["FAIL", name + " — " + e.message.split("\n")[0]]); } };
  const go = async (path) => { await p.goto(base + path); await p.waitForLoadState("networkidle"); };
  const see = (t, o = {}) => p.getByText(t, { exact: false }).first().waitFor({ timeout: 8000, ...o });

  await step("landing renders hero + sections", async () => { await go(""); await see("Stop paying for"); await see("What is MA-365?"); await see("What could shelfware be costing you?"); });
  await step("landing calculator responds", async () => { await go(""); const before = await p.locator(".calc .out .big").first().innerText(); await p.locator('input[aria-label="Users"]').fill("10000"); const after = await p.locator(".calc .out .big").first().innerText(); if (before === after) throw new Error("calculator output unchanged"); });
  await step("slider next button works", async () => { await go(""); await p.getByLabel("Next slide").first().click(); });
  await step("products: search + insights", async () => { await go("explore"); await p.getByLabel("Search products").fill("copilot"); await see("Microsoft 365 Copilot"); await p.locator(".pitem", { hasText: "Microsoft 365 Copilot" }).first().click(); await see("Common waste pattern"); await see("Generic"); });
  await step("advisor: analyse renewal", async () => { await go("advisor"); await p.getByText("Analyse my renewal").click(); await see("Leverage score"); await see("Negotiation levers"); });
  await step("licence waste: calculate", async () => { await go("licenses"); await p.getByText("Calculate waste").click(); await see("Estimated annual waste"); });
  await step("contract terms: EDE present", async () => { await go("terms"); await see("Enhanced Designated Engineering"); await p.getByLabel("Search terms").fill("MACC"); await see("Microsoft Azure Consumption Commitment"); });
  await step("transitions: Fabric entry listed", async () => { await go("transitions"); await see("Power BI Premium (P-SKU)"); await see("Windows 10 end of support"); });
  await step("fabric planner: plan + F64 break-even", async () => { await go("transitions?tab=fabric"); await p.getByRole("button", { name: "Plan my migration" }).click(); await see("Sizing scenarios"); await see("Viewers where F64 beats F32"); });
  await step("workspace gate when signed out", async () => { await go("workspace"); await see("Your workspace is private to you"); });
  await step("deep link works (SPA fallback)", async () => { await p.goto(base + "advisor"); await see("Build the deal before they build it"); });
  await step("no console/page errors", async () => { if (errs.length) throw new Error(errs.slice(0, 3).join(" | ")); });
  for (const [s, n] of results) console.log(s, n);
  await b.close(); process.exit(results.some((r) => r[0] === "FAIL") ? 1 : 0);
})();
