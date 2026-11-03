/** Registry of Microsoft-published resources the knowledge base is derived from. */
export const SOURCES = {
  productTerms: { label: "Microsoft Licensing – Product Terms", url: "https://www.microsoft.com/licensing/terms" },
  licensingDocs: { label: "Microsoft Licensing Resources", url: "https://www.microsoft.com/licensing/docs" },
  m365Plans: { label: "Microsoft 365 plans & pricing", url: "https://www.microsoft.com/microsoft-365/enterprise/compare-office-365-plans" },
  skuNames: { label: "Product names & service plan identifiers (Entra/Graph)", url: "https://learn.microsoft.com/entra/identity/users/licensing-service-plan-reference" },
  unifiedSupport: { label: "Microsoft Unified Support", url: "https://www.microsoft.com/unifiedsupport" },
  azurePricing: { label: "Azure pricing & commitments", url: "https://azure.microsoft.com/pricing" },
  azureMacc: { label: "Microsoft Azure Consumption Commitment (MACC)", url: "https://learn.microsoft.com/marketplace/azure-consumption-commitment-benefit" },
  hybridBenefit: { label: "Azure Hybrid Benefit", url: "https://learn.microsoft.com/azure/azure-sql/azure-hybrid-benefit" },
  csp: { label: "Cloud Solution Provider program", url: "https://learn.microsoft.com/partner-center/" },
  graphSkus: { label: "Graph: subscribedSku", url: "https://learn.microsoft.com/graph/api/resources/subscribedsku" },
} as const;
export type SourceKey = keyof typeof SOURCES;
