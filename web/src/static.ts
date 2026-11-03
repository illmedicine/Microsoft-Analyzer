/**
 * Static mode: the public (signed-out) API, executed in the browser using the SAME knowledge base and engines the server uses.
 * Used by the GitHub Pages build (no backend) and as a fallback if the hosted API is unreachable.
 * Anything that needs an account (sign-in, saved history, tenant data) is intentionally unavailable here.
 */
import { PRODUCTS, productById, searchProducts } from "../../server/src/knowledge/products";
import { searchTerms } from "../../server/src/knowledge/terms";
import { TRANSITIONS } from "../../server/src/knowledge/transitions";
import { SOURCES } from "../../server/src/knowledge/sources";
import { advise, analyzeWaste, BENCHMARKS, planFabric, productInsights, type AdvisorInput, type FabricInput, type WasteLine } from "../../server/src/insights";

const lite = (p: (typeof PRODUCTS)[number]) => ({ id: p.id, name: p.name, family: p.family, summary: p.summary, listPriceUsd: p.listPriceUsd });
const bad = (code = "invalid_input") => { throw Object.assign(new Error(code), { status: 400, code }); };
const num = (v: unknown, min: number, max: number, req = false): number | undefined => {
  if (v === undefined || v === null || v === "") { if (req) bad(); return undefined; }
  const n = Number(v); if (!Number.isFinite(n) || n < min || n > max) bad(); return n;
};

export function staticApi(path: string, method: string, body: any): unknown {
  const [route, qs = ""] = path.split("?");
  const q = new URLSearchParams(qs);
  const m = method.toUpperCase();

  if (route === "/config" && m === "GET") return { googleClientId: "", devLogin: false, tenantConnect: false, staticMode: true, benchmarks: BENCHMARKS };
  if (route === "/me" && m === "GET") return { user: null };
  if (route === "/products" && m === "GET") return { products: (q.get("all") === "1" ? PRODUCTS : searchProducts(q.get("q") ?? "")).map(lite), total: PRODUCTS.length };
  const pm = route?.match(/^\/products\/([\w-]+)$/);
  if (pm && m === "GET") {
    const p = productById(pm[1]!); if (!p) throw Object.assign(new Error("not_found"), { status: 404, code: "not_found" });
    return { product: p, personalized: false, insights: productInsights(p), source: SOURCES[p.source] };
  }
  if (route === "/terms" && m === "GET") return { terms: searchTerms(q.get("q") ?? ""), sources: SOURCES };
  if (route === "/transitions" && m === "GET") return { transitions: TRANSITIONS.map((t) => ({ ...t, affectsYou: null })), personalized: false };

  if (route === "/advisor" && m === "POST") {
    const b = body ?? {};
    if (!["EA", "MCA-E", "CSP", "MPSA", "Unknown"].includes(b.agreementType)) bad();
    const i: AdvisorInput = { agreementType: b.agreementType, seats: num(b.seats, 1, 5e6, true)!, annualSpendUsd: num(b.annualSpendUsd, 0, 1e10, true)!,
      renewalDate: typeof b.renewalDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.renewalDate) ? b.renewalDate : undefined,
      azureAnnualUsd: num(b.azureAnnualUsd, 0, 1e10), supportAnnualUsd: num(b.supportAnnualUsd, 0, 1e10), edeHours: num(b.edeHours, 0, 1e5),
      edeUtilizationPct: num(b.edeUtilizationPct, 0, 100), shelfwarePct: num(b.shelfwarePct, 0, 80), hasAlternative: !!b.hasAlternative };
    return advise(i);
  }
  if (route === "/waste" && m === "POST") {
    const ls = body?.lines; if (!Array.isArray(ls) || ls.length > 200) bad();
    const lines: WasteLine[] = ls.map((l: any) => ({ productId: typeof l.productId === "string" ? l.productId : undefined, name: String(l.name ?? "").slice(0, 120),
      purchased: num(l.purchased, 0, 5e6, true)!, assigned: num(l.assigned, 0, 5e6, true)!, active: num(l.active, 0, 5e6), unitPriceUsd: num(l.unitPriceUsd, 0, 5000) }));
    return analyzeWaste(lines);
  }
  if (route === "/fabric-plan" && m === "POST") {
    const b = body ?? {}; if (!["P1", "P2", "P3", "P4", "P5"].includes(b.premiumSku)) bad();
    const i: FabricInput = { premiumSku: b.premiumSku, viewers: num(b.viewers, 0, 5e6, true)!, creators: num(b.creators, 0, 5e6, true)!, proHeld: num(b.proHeld, 0, 5e6, true)!,
      peakUtilisationPct: num(b.peakUtilisationPct, 1, 100), growthPctPerYear: num(b.growthPctPerYear, 0, 300), termYears: num(b.termYears, 1, 5), overlapDays: num(b.overlapDays, 0, 1000),
      workspaces: num(b.workspaces, 0, 1e5), largeModels: num(b.largeModels, 0, 1e4), gatewayDependent: num(b.gatewayDependent, 0, 1e4), crossRegion: num(b.crossRegion, 0, 1e5) };
    return planFabric(i);
  }
  // Account-bound endpoints: not available without the hosted service.
  throw Object.assign(new Error("sign_in_required"), { status: 401, code: "sign_in_required" });
}
