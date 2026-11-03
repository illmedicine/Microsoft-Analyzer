import type { SourceKey } from "./sources.js";

export type Family = "Microsoft 365" | "Office 365" | "Security & Identity" | "Voice & Collaboration" | "Power Platform & BI" | "Copilot & AI" | "Windows & Endpoints" | "Dynamics 365" | "Azure & Server";

export interface Product {
  id: string; name: string; family: Family; aliases: string[];
  /** Graph skuPartNumber values that map to this product. */
  skuPartNumbers: string[];
  summary: string;
  includes: string[];
  /** USD / user / month, annual commitment. Indicative only — see `verify`. */
  listPriceUsd?: number;
  /** Users-cap or other hard limits that change recommendations. */
  maxUsers?: number;
  overlaps: string[];       // product ids whose capabilities it overlaps with
  commonWaste: string[];    // generic, org-agnostic waste patterns
  negotiation: string[];    // generic levers
  source: SourceKey;
  verify: boolean;          // true = seeded from curated knowledge, confirm against source before quoting
}

export const PRODUCTS: Product[] = [
  { id: "m365-e3", name: "Microsoft 365 E3", family: "Microsoft 365", aliases: ["e3", "m365 e3", "spe_e3", "microsoft 365 enterprise e3"], skuPartNumbers: ["SPE_E3"],
    summary: "Core enterprise bundle: Office apps, Exchange, SharePoint, Teams, Windows Enterprise E3, Entra ID P1, Intune, baseline compliance and information protection.",
    includes: ["Microsoft 365 Apps for enterprise", "Exchange Online Plan 2", "SharePoint & OneDrive", "Teams", "Windows 10/11 Enterprise E3", "Entra ID P1", "Intune", "Azure Information Protection P1"],
    listPriceUsd: 36, overlaps: ["o365-e3", "ems-e3", "entra-p1", "intune"], commonWaste: ["Frontline/shift workers assigned E3 instead of F3", "Leavers and shared mailboxes holding paid licences", "Standalone Entra P1/Intune purchased on top of E3"],
    negotiation: ["Mix E3 with F3 for frontline to cut per-seat cost", "Ask for price protection across the term", "Use true-down rights at anniversary where the agreement permits"], source: "m365Plans", verify: true },
  { id: "m365-e5", name: "Microsoft 365 E5", family: "Microsoft 365", aliases: ["e5", "m365 e5", "spe_e5"], skuPartNumbers: ["SPE_E5", "SPE_E5_CALLINGMINUTES", "SPE_E5_NOPSTNCONF"],
    summary: "E3 plus advanced security (Defender suite), Entra ID P2, Purview compliance, Power BI Pro and Teams Phone capabilities.",
    includes: ["Everything in E3", "Defender for Endpoint P2 / Office 365 P2 / Identity / Cloud Apps", "Entra ID P2", "Purview advanced compliance & eDiscovery", "Power BI Pro", "Teams Phone"],
    listPriceUsd: 57, overlaps: ["m365-e3", "defender-endpoint-p2", "entra-p2", "power-bi-pro", "teams-phone"], commonWaste: ["Whole-company E5 when only ~10–25% of users need the advanced features", "Paying for E5 security while a third-party EDR is still the active control", "Unused Power BI Pro / Teams Phone entitlements"],
    negotiation: ["Right-size: E3 baseline + E5 Security / E5 Compliance add-ons for the users who need them", "Quantify displaced third-party tools and trade that spend for a better E5 price", "Step-up pricing over the term instead of day-one full deployment"], source: "m365Plans", verify: true },
  { id: "m365-f3", name: "Microsoft 365 F3", family: "Microsoft 365", aliases: ["f3", "f1", "frontline", "spe_f1"], skuPartNumbers: ["SPE_F1", "M365_F1_COMM"],
    summary: "Frontline worker bundle: web/mobile Office, Teams, Exchange (small mailbox), Entra ID P1, Intune.",
    includes: ["Office web & mobile apps", "Teams", "Exchange Online Kiosk", "SharePoint", "Entra ID P1", "Intune"], listPriceUsd: 8,
    overlaps: ["m365-e3"], commonWaste: ["Knowledge workers parked on F3 then topped up with add-ons that cost more than E3"], negotiation: ["Count every frontline role and move them off E3 — often the single biggest per-seat saving"], source: "m365Plans", verify: true },
  { id: "m365-bp", name: "Microsoft 365 Business Premium", family: "Microsoft 365", aliases: ["business premium", "bp", "spb"], skuPartNumbers: ["SPB"],
    summary: "SMB bundle with desktop Office apps, Teams, Defender for Business, Intune and Entra ID P1. Capped at 300 users per tenant.",
    includes: ["Microsoft 365 Apps", "Exchange", "SharePoint", "Teams", "Defender for Business", "Intune", "Entra ID P1"], listPriceUsd: 22, maxUsers: 300,
    overlaps: ["m365-e3"], commonWaste: ["Stand-alone endpoint security or MDM bought on top of Business Premium"], negotiation: ["Through CSP: ask the partner for annual-billing discounts and monthly-billing flexibility"], source: "m365Plans", verify: true },
  { id: "m365-bs", name: "Microsoft 365 Business Standard", family: "Microsoft 365", aliases: ["business standard", "o365_business_premium", "smb_business_premium"], skuPartNumbers: ["O365_BUSINESS_PREMIUM", "SMB_BUSINESS_PREMIUM"],
    summary: "SMB productivity bundle with desktop Office apps and Teams, without advanced security/device management.", includes: ["Microsoft 365 Apps", "Exchange", "SharePoint", "Teams"], listPriceUsd: 12.5, maxUsers: 300,
    overlaps: ["m365-bp"], commonWaste: ["Users who need device security upgraded individually instead of moving to Premium"], negotiation: ["Compare Standard + add-ons vs Premium before renewal"], source: "m365Plans", verify: true },
  { id: "m365-bb", name: "Microsoft 365 Business Basic", family: "Microsoft 365", aliases: ["business basic", "o365_business_essentials"], skuPartNumbers: ["O365_BUSINESS_ESSENTIALS", "SMB_BUSINESS_ESSENTIALS"],
    summary: "Web/mobile Office, Exchange, SharePoint and Teams for small organisations.", includes: ["Office web apps", "Exchange", "SharePoint", "Teams"], listPriceUsd: 6, maxUsers: 300, overlaps: ["m365-f3"], commonWaste: [], negotiation: ["Good fit for light-use staff in SMBs"], source: "m365Plans", verify: true },
  { id: "o365-e3", name: "Office 365 E3", family: "Office 365", aliases: ["o365 e3", "enterprisepack"], skuPartNumbers: ["ENTERPRISEPACK"],
    summary: "Office apps and online services without Windows Enterprise, EMS, or advanced security. Often a legacy SKU.", includes: ["Microsoft 365 Apps", "Exchange Online Plan 2", "SharePoint", "Teams"], listPriceUsd: 23,
    overlaps: ["m365-e3"], commonWaste: ["O365 E3 + EMS E3 + Windows E3 bought separately when M365 E3 bundles them for less"], negotiation: ["Price a consolidated M365 E3 against the stacked components"], source: "m365Plans", verify: true },
  { id: "o365-e5", name: "Office 365 E5", family: "Office 365", aliases: ["o365 e5", "enterprisepremium"], skuPartNumbers: ["ENTERPRISEPREMIUM"],
    summary: "O365 E3 plus Defender for Office 365 P2, Power BI Pro, Teams Phone, advanced compliance & analytics.", includes: ["Everything in O365 E3", "Defender for Office 365 P2", "Power BI Pro", "Teams Phone", "Advanced eDiscovery"], listPriceUsd: 38,
    overlaps: ["m365-e5", "o365-e3"], commonWaste: ["O365 E5 layered with EMS E5 instead of M365 E5"], negotiation: ["Compare to M365 E5 with the same capabilities"], source: "m365Plans", verify: true },
  { id: "ems-e3", name: "Enterprise Mobility + Security E3", family: "Security & Identity", aliases: ["ems e3", "ems"], skuPartNumbers: ["EMS"],
    summary: "Entra ID P1, Intune, Azure Information Protection P1 and Advanced Threat Analytics rights.", includes: ["Entra ID P1", "Intune", "AIP P1"], listPriceUsd: 10.6,
    overlaps: ["m365-e3", "entra-p1", "intune"], commonWaste: ["Already included in Microsoft 365 E3/E5 — a classic duplicate"], negotiation: ["Remove at renewal if users are on M365 E3/E5"], source: "m365Plans", verify: true },
  { id: "ems-e5", name: "Enterprise Mobility + Security E5", family: "Security & Identity", aliases: ["ems e5", "emspremium"], skuPartNumbers: ["EMSPREMIUM"],
    summary: "EMS E3 plus Entra ID P2, Defender for Identity and Cloud Apps, AIP P2.", includes: ["Everything in EMS E3", "Entra ID P2", "Defender for Identity", "Defender for Cloud Apps"], listPriceUsd: 16.4,
    overlaps: ["m365-e5", "entra-p2"], commonWaste: ["Included in M365 E5"], negotiation: ["Remove duplicates before renewal"], source: "m365Plans", verify: true },
  { id: "entra-p1", name: "Microsoft Entra ID P1", family: "Security & Identity", aliases: ["entra p1", "aad p1", "azure ad premium p1", "aad_premium"], skuPartNumbers: ["AAD_PREMIUM"],
    summary: "Conditional Access, group-based licensing, self-service password reset with writeback, hybrid identity.", includes: ["Conditional Access", "Dynamic groups", "SSPR writeback", "App proxy"], listPriceUsd: 6,
    overlaps: ["m365-e3", "m365-e5", "ems-e3", "m365-bp", "m365-f3"], commonWaste: ["Standalone P1 on users already covered by M365 E3/E5/Business Premium/F3"], negotiation: ["Audit assignment overlap with a group-based licensing report"], source: "m365Plans", verify: true },
  { id: "entra-p2", name: "Microsoft Entra ID P2", family: "Security & Identity", aliases: ["entra p2", "aad p2", "aad_premium_p2"], skuPartNumbers: ["AAD_PREMIUM_P2"],
    summary: "P1 plus Identity Protection and Privileged Identity Management.", includes: ["Identity Protection", "PIM", "Access reviews"], listPriceUsd: 9,
    overlaps: ["m365-e5", "ems-e5"], commonWaste: ["Bought for all users when only admins/risk-based policies need it"], negotiation: ["Scope P2 to privileged and risk-policy users"], source: "m365Plans", verify: true },
  { id: "intune", name: "Microsoft Intune (Plan 1)", family: "Security & Identity", aliases: ["intune", "intune_a"], skuPartNumbers: ["INTUNE_A"],
    summary: "Cloud MDM/MAM for Windows, macOS, iOS, Android.", includes: ["Device management", "App protection"], listPriceUsd: 8, overlaps: ["m365-e3", "m365-bp", "ems-e3", "m365-f3"], commonWaste: ["Standalone Intune on top of M365 E3/E5 or Business Premium"], negotiation: ["Remove when covered by bundle"], source: "m365Plans", verify: true },
  { id: "defender-endpoint-p2", name: "Defender for Endpoint P2", family: "Security & Identity", aliases: ["mde", "defender endpoint", "wdatp"], skuPartNumbers: ["WIN_DEF_ATP"],
    summary: "EDR with advanced hunting, automated investigation and threat & vulnerability management.", includes: ["EDR", "Advanced hunting", "TVM"], listPriceUsd: 5.2, overlaps: ["m365-e5"], commonWaste: ["Bought alongside M365 E5 (already included)"], negotiation: ["Use as leverage against third-party EDR renewals"], source: "m365Plans", verify: true },
  { id: "teams-phone", name: "Teams Phone (Standard)", family: "Voice & Collaboration", aliases: ["teams phone", "mcoev", "phone system"], skuPartNumbers: ["MCOEV"],
    summary: "Cloud PBX capabilities in Teams; PSTN calling is licensed separately.", includes: ["Auto attendants", "Call queues", "Call routing"], listPriceUsd: 8, overlaps: ["m365-e5", "o365-e5"], commonWaste: ["Purchased for users who already hold it through E5", "Assigned to users who never place PSTN calls"], negotiation: ["Check calling-plan vs Direct Routing economics"], source: "m365Plans", verify: true },
  { id: "teams-premium", name: "Teams Premium", family: "Voice & Collaboration", aliases: ["teams premium"], skuPartNumbers: ["Microsoft_Teams_Premium"],
    summary: "Add-on for advanced meeting protection, branding, webinars and intelligent recap.", includes: ["Watermarking", "Advanced webinars", "Intelligent recap"], listPriceUsd: 10, overlaps: [], commonWaste: ["Broad rollout without usage proof"], negotiation: ["Pilot with the specific teams who run webinars/sensitive meetings"], source: "m365Plans", verify: true },
  { id: "copilot-m365", name: "Microsoft 365 Copilot", family: "Copilot & AI", aliases: ["copilot", "m365 copilot", "microsoft_365_copilot"], skuPartNumbers: ["Microsoft_365_Copilot"],
    summary: "AI assistant across Word, Excel, PowerPoint, Outlook, Teams grounded in tenant data. Requires a qualifying M365/O365 base licence.", includes: ["Copilot in M365 apps", "Copilot Chat with enterprise data protection", "Graph-grounded answers"], listPriceUsd: 30,
    overlaps: [], commonWaste: ["Licences assigned to users with no usage after 30–60 days", "Rolled out before data-governance clean-up, reducing value"], negotiation: ["Phase purchases against adoption milestones; ask for pilot pricing and reassignment rights", "Avoid committing a large Copilot quantity up-front in the first term"], source: "m365Plans", verify: true },
  { id: "power-bi-pro", name: "Power BI Pro", family: "Power Platform & BI", aliases: ["power bi pro", "pbi pro", "power_bi_pro"], skuPartNumbers: ["POWER_BI_PRO"],
    summary: "Author, share and consume Power BI content in shared capacity.", includes: ["Report authoring", "Sharing & collaboration"], listPriceUsd: 14, overlaps: ["m365-e5", "o365-e5"], commonWaste: ["Pro bought for users covered by E5", "Viewers licensed as Pro when Premium capacity would cover consumers"], negotiation: ["Model Pro vs Premium/Fabric capacity break-even"], source: "m365Plans", verify: true },
  { id: "power-bi-ppu", name: "Power BI Premium Per User", family: "Power Platform & BI", aliases: ["ppu", "premium per user", "power_bi_premium_per_user"], skuPartNumbers: ["PBI_PREMIUM_PER_USER"],
    summary: "Premium features licensed per user.", includes: ["Larger models", "Paginated reports", "AI features"], listPriceUsd: 24, overlaps: ["power-bi-pro"], commonWaste: ["PPU for casual users"], negotiation: ["Evaluate capacity-based licensing past ~hundreds of users"], source: "m365Plans", verify: true },
  { id: "fabric-capacity", name: "Microsoft Fabric capacity (F-SKUs)", family: "Power Platform & BI", aliases: ["fabric", "f64", "f sku", "fabric capacity", "p1", "power bi premium", "premium capacity"], skuPartNumbers: [],
    summary: "Capacity-based analytics platform that replaces Power BI Premium per-capacity (P-SKU). F64 and above lets free users view Power BI content; below F64 every viewer needs a Pro licence.",
    includes: ["Power BI Premium features", "Data engineering, warehouses, pipelines, real-time analytics", "Pause/resume and resize (pay-as-you-go)", "Reservation discounts"], overlaps: ["power-bi-pro", "power-bi-ppu", "m365-e5"],
    commonWaste: ["Capacity sized from P-SKU name instead of measured utilisation", "Running at F64+ for a small viewer base that Pro licences would cover more cheaply", "Reserving a 3-year size before workloads stabilise"],
    negotiation: ["Reserve the stable baseline and use pay-as-you-go for bursts", "Ask for an overlap window long enough for migration, in writing", "Ask whether size can change mid-term", "Count Pro licences already included in M365 E5"], source: "m365Plans", verify: true },
  { id: "win-e3", name: "Windows Enterprise E3", family: "Windows & Endpoints", aliases: ["windows e3", "win e3"], skuPartNumbers: ["WIN10_VDA_E3", "WIN_ENT_E3"], summary: "Windows subscription activation, enterprise management and security features.", includes: ["Subscription activation", "Credential Guard"], listPriceUsd: 7, overlaps: ["m365-e3"], commonWaste: ["Duplicate with M365 E3/E5"], negotiation: ["Remove if covered by M365"], source: "m365Plans", verify: true },
  { id: "d365-sales-ent", name: "Dynamics 365 Sales Enterprise", family: "Dynamics 365", aliases: ["d365 sales", "dynamics sales"], skuPartNumbers: ["DYN365_ENTERPRISE_SALES"], summary: "CRM sales application with AI-assisted selling.", includes: ["Sales automation", "Forecasting"], listPriceUsd: 95, overlaps: [], commonWaste: ["Full licences for light users who qualify for Team Member"], negotiation: ["Use Team Member/attach licences for occasional users"], source: "licensingDocs", verify: true },
  { id: "azure-consumption", name: "Azure (consumption / MACC)", family: "Azure & Server", aliases: ["azure", "macc", "azure consumption"], skuPartNumbers: [], summary: "Pay-as-you-go cloud services. A MACC trades a committed spend for discounts and Marketplace eligibility.", includes: ["IaaS/PaaS services", "Marketplace purchases may count toward MACC"], overlaps: [], commonWaste: ["Idle VMs and unattached disks", "Unused reservations", "Over-committing a MACC and paying a shortfall"], negotiation: ["Size MACC at a defensible P50 of forecast, not the optimistic case", "Confirm Marketplace-eligible spend counts toward the commitment", "Layer Savings Plans / Reservations and Hybrid Benefit"], source: "azureMacc", verify: true },
  { id: "windows-server-sa", name: "Windows Server (with Software Assurance)", family: "Azure & Server", aliases: ["windows server", "winsvr"], skuPartNumbers: [], summary: "Server licences by core; Software Assurance enables Azure Hybrid Benefit and license mobility.", includes: ["Core licences", "Azure Hybrid Benefit with SA"], overlaps: [], commonWaste: ["Hybrid Benefit not enabled on eligible Azure VMs", "SA renewed on decommissioned servers"], negotiation: ["Reconcile SA coverage to the current server estate before renewing"], source: "hybridBenefit", verify: true },
  { id: "sql-server-sa", name: "SQL Server (Enterprise/Standard + SA)", family: "Azure & Server", aliases: ["sql server", "sql"], skuPartNumbers: [], summary: "Core-based database licensing; SA gives Hybrid Benefit and passive failover rights.", includes: ["Core licences", "Hybrid Benefit with SA"], overlaps: [], commonWaste: ["Enterprise edition where Standard would do", "Hybrid Benefit unclaimed on Azure SQL"], negotiation: ["Audit edition use and consolidate; claim Hybrid Benefit"], source: "hybridBenefit", verify: true },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
export function searchProducts(q: string, limit = 12): Product[] {
  const n = norm(q);
  if (!n) return PRODUCTS.slice(0, limit);
  const toks = n.split(" ");
  return PRODUCTS.map((p) => {
    const hay = [p.name, ...p.aliases, ...p.skuPartNumbers, p.family].map(norm);
    let score = 0;
    for (const h of hay) { if (h === n) score += 100; else if (h.includes(n)) score += 40; }
    for (const t of toks) for (const h of hay) if (h.split(" ").includes(t)) score += 8; else if (h.includes(t)) score += 2;
    if (norm(p.summary).includes(n)) score += 3;
    return { p, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.p);
}
export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);
export const productBySku = (part: string) => PRODUCTS.find((p) => p.skuPartNumbers.some((s) => s.toLowerCase() === part.toLowerCase()));
