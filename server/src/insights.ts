import { PRODUCTS, productById, productBySku, type Product } from "./knowledge/products.js";
import { SOURCES } from "./knowledge/sources.js";
import type { Profile, TenantSnapshot } from "./store.js";

/**
 * Modeled benchmarks. These are PLACEHOLDER planning assumptions, not measured customer results.
 * Replace with validated figures (and cite them) before using in marketing or customer-facing claims.
 */
export const BENCHMARKS = {
  status: "illustrative" as const,
  wasteShareOfLicenseSpend: { low: 0.2, typical: 0.27, high: 0.35 },
  renewalSavingsShare: { low: 0.08, typical: 0.14, high: 0.22 },
  note: "Modeled planning assumptions for illustration. Not a guarantee; your results depend on your estate and agreement.",
};

export interface Insight { level: "info" | "warn" | "save"; title: string; detail: string; scope: "generic" | "personalized" }

export function productInsights(p: Product, profile?: Profile): Insight[] {
  const out: Insight[] = [];
  for (const w of p.commonWaste) out.push({ level: "warn", title: "Common waste pattern", detail: w, scope: "generic" });
  for (const n of p.negotiation) out.push({ level: "save", title: "Negotiation lever", detail: n, scope: "generic" });
  if (p.overlaps.length) {
    const names = p.overlaps.map((id) => productById(id)?.name).filter(Boolean).join(", ");
    out.push({ level: "info", title: "Overlaps with", detail: `${names}. Check for duplicate assignment before buying or renewing.`, scope: "generic" });
  }
  if (!profile) return out;

  const personal: Insight[] = [];
  const emp = profile.employeeCount;
  if (p.maxUsers && emp && emp > p.maxUsers)
    personal.push({ level: "warn", title: `Seat cap vs your size`, detail: `${p.name} is capped at ${p.maxUsers} users per tenant; you reported ~${emp} employees — plan for an Enterprise SKU.`, scope: "personalized" });
  if (p.id === "m365-e5" && profile.priorities.some((x) => /cost|spend|saving/i.test(x)))
    personal.push({ level: "save", title: "Cost priority → right-size E5", detail: "You've flagged cost as a priority. Model E3 + targeted E5 Security/Compliance add-ons for the subset of users who need them instead of company-wide E5.", scope: "personalized" });
  if (p.id === "copilot-m365" && emp)
    personal.push({ level: "info", title: "Phase your Copilot rollout", detail: `For ~${emp} employees, start with a measured cohort (e.g. ${Math.max(10, Math.round(emp * 0.05))} seats), track weekly active use, and expand against adoption — not a flat org-wide commitment.`, scope: "personalized" });
  if (p.family === "Azure & Server" && profile.primaryCloud === "azure-first")
    personal.push({ level: "save", title: "Azure-first posture", detail: "With an Azure-first strategy, a MACC with Marketplace eligibility and Savings Plans usually carries more leverage than licence-line discounts.", scope: "personalized" });
  if (p.family === "Azure & Server" && profile.primaryCloud === "on-prem-heavy")
    personal.push({ level: "save", title: "On-prem heavy", detail: "Prioritise Software Assurance reconciliation and Hybrid Benefit claims; avoid renewing SA on retired servers.", scope: "personalized" });
  if (profile.agreementType === "CSP" && emp && emp > 1500)
    personal.push({ level: "info", title: "Agreement fit", detail: "At your size, price an EA/MCA-E quote against CSP — commitments can beat monthly flexibility on unit price.", scope: "personalized" });
  if (profile.renewalDate) {
    const days = Math.round((new Date(profile.renewalDate).getTime() - Date.now()) / 86400000);
    if (days > 0 && days < 270) personal.push({ level: "warn", title: `Renewal in ${days} days`, detail: "Start now: baseline usage, build the alternative scenario, and target the nearest Microsoft quarter-end for decisions.", scope: "personalized" });
  }
  for (const l of profile.learnings.slice(0, 3)) personal.push({ level: "info", title: "From your org notes", detail: l, scope: "personalized" });
  return [...personal, ...out];
}

// ---------------------------------------------------------------- waste
export interface WasteLine { productId?: string; name: string; purchased: number; assigned: number; active?: number; unitPriceUsd?: number }
export function analyzeWaste(lines: WasteLine[]) {
  const rows = lines.map((l) => {
    const prod = l.productId ? productById(l.productId) : undefined;
    const unit = l.unitPriceUsd ?? prod?.listPriceUsd ?? 0;
    const unassigned = Math.max(0, l.purchased - l.assigned);
    const inactive = l.active != null ? Math.max(0, Math.min(l.assigned, l.assigned - l.active)) : 0;
    const wastedSeats = unassigned + inactive;
    const annualCost = l.purchased * unit * 12;
    const annualWaste = wastedSeats * unit * 12;
    return { ...l, name: prod?.name ?? l.name, unitPriceUsd: unit, unassigned, inactive, wastedSeats, annualCost, annualWaste, wastePct: l.purchased ? wastedSeats / l.purchased : 0 };
  });
  const totalCost = rows.reduce((a, r) => a + r.annualCost, 0);
  const totalWaste = rows.reduce((a, r) => a + r.annualWaste, 0);
  const dupes = duplicateCoverage(lines.map((l) => l.productId).filter((x): x is string => !!x));
  return { rows, totalAnnualCost: totalCost, totalAnnualWaste: totalWaste, wastePct: totalCost ? totalWaste / totalCost : 0, duplicates: dupes,
    caveat: "Priced at indicative list prices unless a unit price is supplied. Excludes discounts and bundled-value effects." };
}
function duplicateCoverage(ids: string[]) {
  const set = new Set(ids), out: { product: string; coveredBy: string }[] = [];
  for (const id of set) { const p = productById(id); if (!p) continue;
    for (const o of p.overlaps) if (set.has(o) && /^(m365|o365)/.test(o) && !/^(m365|o365)/.test(id))
      out.push({ product: p.name, coveredBy: productById(o)!.name }); }
  return out;
}
export function snapshotToWasteLines(s: TenantSnapshot): WasteLine[] {
  return s.skus.filter((k) => k.purchased > 0 && k.purchased < 1_000_000).map((k) => ({ productId: k.productId, name: k.name, purchased: k.purchased, assigned: k.assigned }));
}

// ---------------------------------------------------------------- advisor
export interface AdvisorInput {
  agreementType: "EA" | "MCA-E" | "CSP" | "MPSA" | "Unknown"; seats: number; annualSpendUsd: number;
  renewalDate?: string; termYears?: number; azureAnnualUsd?: number; supportAnnualUsd?: number;
  edeHours?: number; edeUtilizationPct?: number; hasAlternative?: boolean; shelfwarePct?: number;
}
export function advise(i: AdvisorInput) {
  const levers: { id: string; title: string; why: string; lowPct: number; highPct: number; basis: "licence" | "azure" | "support"; asks: string[] }[] = [];
  const shelf = (i.shelfwarePct ?? BENCHMARKS.wasteShareOfLicenseSpend.typical * 100) / 100;
  levers.push({ id: "rightsize", title: "Right-size before you renew", why: `Estimated ${(shelf * 100).toFixed(0)}% of licence spend is unassigned or inactive. Remove it from the baseline — every later discount applies to a smaller number.`, lowPct: shelf * 0.4, highPct: shelf * 0.8, basis: "licence", asks: ["Tenant-verified usage baseline", "Reduction rights on high-risk SKUs"] });
  levers.push({ id: "mix", title: "Optimise the SKU mix", why: "Move frontline staff to F3, scope E5 to users who need it, retire duplicate stacks (EMS/Windows/Intune under M365).", lowPct: 0.03, highPct: 0.09, basis: "licence", asks: ["Per-persona licence plan", "Step-up pricing for E5"] });
  if (i.azureAnnualUsd) levers.push({ id: "azure", title: "Azure commitment structure", why: "Size the MACC to a defensible forecast; claim Hybrid Benefit; confirm Marketplace eligibility.", lowPct: 0.02, highPct: 0.08, basis: "azure", asks: ["MACC shortfall protection", "Marketplace eligibility", "Hybrid Benefit review"] });
  if (i.supportAnnualUsd) {
    const util = i.edeUtilizationPct ?? 100;
    const under = util < 70;
    levers.push({ id: "support", title: under ? `Support: EDE utilisation is only ${util}%` : "Support: itemise and benchmark", why: under ? `You consumed ${util}% of ${i.edeHours ?? "your"} EDE hours. Resize the allocation or negotiate conversion of unused hours into proactive credits.` : "Unified Support is negotiable independently of licences — ask for itemised pricing and credit roll-over.", lowPct: under ? 0.12 : 0.04, highPct: under ? 0.3 : 0.12, basis: "support", asks: ["Hours-to-deliverables plan", "Unused-hour conversion", "Itemised tiers and credits"] });
  }
  const pp = ["EA", "MCA-E", "MPSA"].includes(i.agreementType);
  levers.push({ id: "protect", title: "Lock price protection & flexibility", why: pp ? "Price protection and reduction rights are worth more than a headline discount if list prices change mid-term." : "Annual-billed CSP gives protection against monthly premiums; price an EA/MCA-E for comparison.", lowPct: 0, highPct: 0.04, basis: "licence", asks: ["Protection on mid-term additions", "Co-terming at contracted unit prices"] });

  const licence = Math.max(0, i.annualSpendUsd - (i.azureAnnualUsd ?? 0) - (i.supportAnnualUsd ?? 0));
  const base = { licence, azure: i.azureAnnualUsd ?? 0, support: i.supportAnnualUsd ?? 0 };
  const priced = levers.map((l) => ({ ...l, lowUsd: Math.round(base[l.basis] * l.lowPct), highUsd: Math.round(base[l.basis] * l.highPct) }));
  const lowTotal = priced.reduce((a, l) => a + l.lowUsd, 0), highTotal = priced.reduce((a, l) => a + l.highUsd, 0);

  // leverage score 0-100
  let leverage = 40;
  if (i.hasAlternative) leverage += 15;
  if (i.annualSpendUsd > 1_000_000) leverage += 10;
  if (i.azureAnnualUsd && i.azureAnnualUsd > 250_000) leverage += 8;
  const days = i.renewalDate ? Math.round((new Date(i.renewalDate).getTime() - Date.now()) / 86400000) : undefined;
  if (days != null) { if (days > 180) leverage += 12; else if (days < 60) leverage -= 15; }
  leverage = Math.max(5, Math.min(95, leverage));

  const timeline: { when: string; what: string }[] = [];
  if (days != null) {
    timeline.push({ when: "T-270 → T-180 days", what: "Baseline usage from tenant data; classify users by persona; map duplicates." });
    timeline.push({ when: "T-180 → T-90 days", what: "Build 3 scenarios (as-is, right-sized, alternative); request itemised quotes." });
    timeline.push({ when: "T-90 → T-30 days", what: "Negotiate against a Microsoft quarter-end (Mar/Jun/Sep/Dec; June is fiscal year-end)." });
    timeline.push({ when: "T-30 → T-0", what: "Paper the terms: price protection, reduction rights, co-terming. Verbal promises don't count." });
  }
  const warnings: string[] = [];
  if (days != null && days < 60) warnings.push(`Only ${days} days to renewal — leverage is reduced. Request a short extension or co-termed bridge to buy time.`);
  if (i.edeUtilizationPct != null && i.edeUtilizationPct < 70) warnings.push("EDE under-utilisation is a concrete, factual argument — document hours delivered vs purchased.");
  if (i.agreementType === "Unknown") warnings.push("Confirm your agreement type; many rights differ between EA, MCA-E and CSP.");
  return { leverageScore: leverage, daysToRenewal: days, levers: priced, totalSavingsUsd: { low: lowTotal, high: highTotal },
    timeline, warnings, sources: [SOURCES.licensingDocs, SOURCES.productTerms, SOURCES.unifiedSupport],
    caveat: "Modeled ranges from planning assumptions — not a quote or a guarantee. Validate against your actual agreement." };
}

export { PRODUCTS, productBySku };
