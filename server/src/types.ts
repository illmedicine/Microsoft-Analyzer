// Browser-safe shared types (no Node imports).
export interface Profile {
  orgName?: string; industry?: string; employeeCount?: number;
  agreementType?: "EA" | "MCA-E" | "CSP" | "MPSA" | "Unknown";
  renewalDate?: string; annualMicrosoftSpendUsd?: number;
  primaryCloud?: "azure-first" | "multi-cloud" | "on-prem-heavy" | "m365-only";
  priorities: string[]; learnings: string[]; // free-text "what we've learned about our org"
}
export interface HistoryItem { id: string; kind: "product" | "advisor" | "waste"; label: string; params: unknown; at: string }
export interface TenantSku { skuId: string; skuPartNumber: string; productId?: string; name: string; purchased: number; assigned: number; suspended: number }
export interface TenantSnapshot { demo: boolean; tenantId: string; tenantName?: string; syncedAt: string; skus: TenantSku[] }
export interface TenantLink { tenantId: string; tenantName?: string; refreshTokenSealed?: string; linkedAt: string; demo: boolean }
