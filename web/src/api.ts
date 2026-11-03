export class ApiError extends Error { constructor(public status: number, public code: string) { super(code); } }
export const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(`${API_BASE}/api${path}`, {
    method: init.method ?? "GET", credentials: API_BASE ? "include" : "same-origin",
    headers: { "content-type": "application/json", "x-ma365": "1" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, (j as { error?: string }).error ?? "error");
  return j as T;
}
export const usd = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3).toLocaleString()}K` : `$${Math.round(n)}`;
export const usdFull = (n: number) => `$${Math.round(n).toLocaleString()}`;

export interface Product { id: string; name: string; family: string; summary: string; listPriceUsd?: number; includes?: string[]; overlaps?: string[]; verify?: boolean; maxUsers?: number }
export interface Insight { level: "info" | "warn" | "save"; title: string; detail: string; scope: "generic" | "personalized" }
export interface Profile { orgName?: string; industry?: string; employeeCount?: number; agreementType?: string; renewalDate?: string; annualMicrosoftSpendUsd?: number; primaryCloud?: string; priorities: string[]; learnings: string[] }
export interface Benchmarks { status: string; wasteShareOfLicenseSpend: { low: number; typical: number; high: number }; renewalSavingsShare: { low: number; typical: number; high: number }; note: string }
export interface Term { id: string; term: string; abbr?: string; category: string; plain: string; whyItMatters: string; lever: string; askFor: string[]; verify: boolean; source: string }
export interface WasteRow { name: string; productId?: string; purchased: number; assigned: number; active?: number; unitPriceUsd: number; unassigned: number; inactive: number; wastedSeats: number; annualCost: number; annualWaste: number; wastePct: number }
export interface WasteResult { rows: WasteRow[]; totalAnnualCost: number; totalAnnualWaste: number; wastePct: number; duplicates: { product: string; coveredBy: string }[]; caveat: string }
