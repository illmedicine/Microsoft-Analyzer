import type { SourceKey } from "./sources.js";

/**
 * Licensing mergers, sunsets, renames and pricing-policy changes that affect enterprise contracts.
 * Dates/claims are curated from memory of Microsoft announcements — every entry is `verify: true`.
 * Confirm against Microsoft's published notices and your own agreement before relying on them.
 */
export interface Transition {
  id: string; title: string; kind: "migration" | "sunset" | "rename" | "pricing" | "unbundling";
  status: "upcoming" | "in-progress" | "ended";
  timing: string;                 // human-readable; exact dates are agreement-specific for some entries
  affects: string[];              // product ids from products.ts
  summary: string; whyItMatters: string;
  actions: string[]; askMicrosoft: string[]; pitfalls: string[];
  claimsToVerify?: string[];      // specific statements that came from unverified guidance
  planner?: "fabric";             // links to an interactive planner
  source: SourceKey; verify: true;
}

export const TRANSITIONS: Transition[] = [
  { id: "pbi-premium-to-fabric", title: "Power BI Premium (P-SKU) → Microsoft Fabric (F-SKU)", kind: "migration", status: "in-progress",
    timing: "Existing P-SKU capacity moves to F-SKU at renewal. The exact switch date and overlap length are set by your agreement — get them in writing.",
    affects: ["power-bi-ppu", "power-bi-pro", "fabric-capacity", "m365-e5"], planner: "fabric",
    summary: "Power BI Premium per-capacity (P1–P5) is being replaced by Fabric capacity (F-SKUs). Microsoft generally ties the P→F switch to your renewal, and any period where you hold both is intended to be a short migration window.",
    whyItMatters: "A 3-year capacity commitment made under deadline pressure at the wrong size is the main financial risk. F64 is also a licensing threshold: below F64, everyone who views reports needs a Pro licence; at F64 and above, free viewers can consume content.",
    actions: [
      "Find out exactly how many days of overlap you get — and whether it can be extended in writing.",
      "Pull real usage from the Fabric Capacity Metrics app. Don't assume P1 automatically means F64.",
      "Run the viewer maths: F64+ with free viewers vs a smaller F-SKU plus Pro for every viewer (use the planner).",
      "Count Pro licences you already hold — many organisations get them through Microsoft 365 E5.",
      "Inventory and clean up now: archive dead reports and unused workspaces before the clock starts.",
      "Pick a pilot workspace and a rollback plan ahead of time; test large models, cross-region workspaces, gateways and tight refresh schedules first.",
      "Plan for growth: notebooks, pipelines and warehouses on the same capacity raise usage fast. Too small hurts for 3 years — so does too big.",
    ],
    askMicrosoft: [
      "How many days of overlap do we get, and can it be extended in writing if migration runs late?",
      "What happens to performance and content if we miss the window?",
      "Can we start on Fabric capacity before the renewal date so migration is complete when the clock starts?",
      "What is the price difference between reserved F capacity and pay-as-you-go, and can we adjust size partway through the term?",
    ],
    pitfalls: ["Signing a 3-year reservation at the wrong size because the deadline was rushing you.", "Workspaces in a different region from the new capacity.", "Forgetting that authors/creators still need Pro licences even on F64+."],
    claimsToVerify: ["Claim that Power BI workloads may slow if migration isn't finished within the first month of overlap — confirm what, if anything, Microsoft documents for your agreement.", "Exact price difference between reserved and pay-as-you-go F capacity."],
    source: "m365Plans", verify: true },
  { id: "win10-eos", title: "Windows 10 end of support", kind: "sunset", status: "ended", timing: "Support ended 14 Oct 2025 (Extended Security Updates available for a fee).",
    affects: ["win-e3", "m365-e3", "m365-e5"],
    summary: "Windows 10 no longer receives free security updates; Extended Security Updates (ESU) can be purchased for a limited period.",
    whyItMatters: "ESU is priced per device and typically escalates by year, so it can compete with hardware-refresh budgets and distort a renewal baseline.",
    actions: ["Inventory devices still on Windows 10 and classify: upgradeable, refresh, retire.", "Compare ESU cost against refresh cost per device.", "Make sure Microsoft 365 Apps support dates for those devices are understood.", "Use the refresh programme as leverage in the broader negotiation."],
    askMicrosoft: ["What are ESU prices by year for our device count and agreement type?", "Can ESU be co-termed to our renewal?"],
    pitfalls: ["Buying ESU for devices that will be retired before the year ends."], source: "licensingDocs", verify: true },
  { id: "onprem-2016-2019-eos", title: "Office / Exchange / SharePoint / Skype for Business Server 2016 & 2019 end of support", kind: "sunset", status: "ended", timing: "End of support: 14 Oct 2025.",
    affects: ["m365-e3", "m365-e5", "o365-e3", "o365-e5"],
    summary: "On-premises Office and server products from the 2016/2019 generation have reached end of support.",
    whyItMatters: "Remaining on-prem workloads create security exposure and unplanned migration projects that tend to land inside renewal windows.",
    actions: ["List remaining on-prem servers and owners.", "Decide migrate-to-cloud vs subscription-edition per workload.", "Check Software Assurance coverage so you don't renew SA on retired servers."],
    askMicrosoft: ["What migration benefits or credits apply to remaining workloads?"], pitfalls: ["Renewing SA on servers that are already decommissioned."], source: "licensingDocs", verify: true },
  { id: "sql2016-ws2016", title: "SQL Server 2016 and Windows Server 2016 lifecycle", kind: "sunset", status: "upcoming", timing: "SQL Server 2016 extended support ended Jul 2026; Windows Server 2016 extended support ends Jan 2027.",
    affects: ["sql-server-sa", "windows-server-sa", "azure-consumption"],
    summary: "Both reach the end of extended support, after which security updates require migration or a paid/cloud-based extended-security option.",
    whyItMatters: "These dates drive Azure migration and Software Assurance decisions, which are central to MACC sizing and Hybrid Benefit claims.",
    actions: ["Map every 2016-era instance and its replacement path.", "Evaluate Azure migration (extended security updates are often more favourable on Azure) vs in-place upgrade.", "Fold migration workloads into your MACC forecast.", "Claim Hybrid Benefit on migrated workloads."],
    askMicrosoft: ["What extended-security-update options and prices apply, on-prem vs Azure?", "Do migration workloads count toward our MACC?"],
    pitfalls: ["Under-forecasting Azure consumption, then missing MACC.", "Paying for SA and ESU on the same server."], source: "azureMacc", verify: true },
  { id: "azure-ad-to-entra", title: "Azure AD → Microsoft Entra ID rename", kind: "rename", status: "ended", timing: "Rename announced 2023; SKU part numbers such as AAD_PREMIUM remain.",
    affects: ["entra-p1", "entra-p2", "ems-e3", "ems-e5"],
    summary: "Azure Active Directory and its Premium plans are now Microsoft Entra ID; Entra also covers additional identity products.",
    whyItMatters: "Old contracts, quotes and internal inventories use legacy names, which makes overlap and entitlement checks easy to get wrong.",
    actions: ["Normalise product names in your entitlement register.", "Re-check that you don't hold Entra P1/P2 standalone on users whose suite already includes it."],
    askMicrosoft: ["Does anything in the order change with the new naming (SKU, bundle, price)?"], pitfalls: ["Treating renamed products as new ones and double-buying."], source: "skuNames", verify: true },
  { id: "ea-price-levels", title: "EA volume-discount level changes for online services", kind: "pricing", status: "in-progress",
    timing: "Policy changes began rolling out from Nov 2025; applicability depends on your agreement and region.",
    affects: ["m365-e3", "m365-e5", "o365-e3", "o365-e5", "entra-p1", "power-bi-pro"],
    summary: "Microsoft has been changing how volume-discount price levels apply to online services in Enterprise Agreements.",
    whyItMatters: "A like-for-like renewal can price differently from your last term. Comparing per-unit prices is the only reliable way to see it.",
    actions: ["Request the price-list basis for every SKU in the renewal quote.", "Compare each unit price against your current term.", "Ask which policy applies to your enrolment and when."],
    askMicrosoft: ["Show the price level and list price basis for each line.", "What protections apply for the term?"], pitfalls: ["Assuming last term's discount percentage carries over."],
    claimsToVerify: ["Exact effective dates, regions and affected levels."], source: "licensingDocs", verify: true },
  { id: "teams-unbundling", title: "Microsoft Teams unbundled from Microsoft 365 / Office 365 suites", kind: "unbundling", status: "ended",
    timing: "Introduced 2023–2024, starting in the EEA and Switzerland, then extended to other regions.",
    affects: ["m365-e3", "m365-e5", "o365-e3", "o365-e5", "teams-phone"],
    summary: "Suites are available with and without Teams, and Teams is also sold standalone.",
    whyItMatters: "Mixed-SKU estates can end up with Teams entitlements from two places, or assign no-Teams SKUs by mistake.",
    actions: ["Check which Teams-less SKUs you hold and why.", "Verify no user pays for Teams twice."],
    askMicrosoft: ["Which SKU variant applies to each of our regions and users?"], pitfalls: ["Moving users between variants without updating licence assignment policies."], source: "m365Plans", verify: true },
];

export const transitionById = (id: string) => TRANSITIONS.find((t) => t.id === id);
