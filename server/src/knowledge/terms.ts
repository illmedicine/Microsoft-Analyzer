import type { SourceKey } from "./sources.js";

export interface ContractTerm {
  id: string; term: string; abbr?: string; category: "Agreement" | "Pricing" | "Rights" | "Support" | "Azure" | "Timing";
  plain: string;       // plain-English meaning
  whyItMatters: string;
  lever: string;       // negotiation angle
  askFor: string[];    // concrete asks
  source: SourceKey; verify: boolean;
}

export const TERMS: ContractTerm[] = [
  { id: "ede", term: "Enhanced Designated Engineering", abbr: "EDE", category: "Support",
    plain: "A Unified Support add-on that gives you a named Microsoft engineer working on your environment for a block of annual hours — proactive design, reviews and escalations rather than break/fix tickets.",
    whyItMatters: "EDE hours are usually sold as a fixed annual allocation. Unused hours rarely roll over, and price per hour varies widely by commitment size and bundle.",
    lever: "Right-size hours to your real project calendar and negotiate flexibility to convert unused hours into other proactive services.",
    askFor: ["Written hours-to-deliverables plan agreed up front", "Ability to convert unused EDE hours to other Unified Support proactive credits", "Rate card for incremental hours at the contracted price", "Quarterly utilisation reporting"], source: "unifiedSupport", verify: true },
  { id: "unified-support", term: "Unified Support", category: "Support",
    plain: "Microsoft's enterprise support offering, typically priced as a percentage of licence + cloud spend, with tiers (Core / Advanced / Performance) and proactive service credits.",
    whyItMatters: "Support is frequently 5–10%+ of total Microsoft spend and is renegotiable independently of licences. It's often attached to the same renewal calendar.",
    lever: "Decouple support from licence renewal; benchmark proactive credit usage and downgrade tiers you're not exercising.",
    askFor: ["Itemised pricing (not a blended percentage)", "Credit roll-over or conversion", "Named Customer Success contacts and SLAs"], source: "unifiedSupport", verify: true },
  { id: "ea", term: "Enterprise Agreement", abbr: "EA", category: "Agreement",
    plain: "A three-year volume licensing agreement for larger organisations, with enrolment-level commitments, price protection and annual true-ups.",
    whyItMatters: "Pricing is locked for the term, but quantities are commitments. Over-ordering at signature locks in spend; under-ordering triggers true-up cost.",
    lever: "Negotiate the starting quantity conservatively, preserve true-down rights, and make growth additions price-protected.",
    askFor: ["Price protection for the full term on all SKUs including future adds", "Annual reduction (true-down) rights where permitted", "Co-terming of mid-term purchases"], source: "licensingDocs", verify: true },
  { id: "mca-e", term: "Microsoft Customer Agreement for Enterprise", abbr: "MCA-E", category: "Agreement",
    plain: "The modern commercial agreement framework replacing the EA for many customers, with a lighter contractual structure and online-first purchasing.",
    whyItMatters: "Commercial mechanics (pricing, commitments, renewal flow) differ from the EA — assumptions carried over can cost money.",
    lever: "Confirm which discounts, price protections and rights carry across, and have them written into the order, not just verbally promised.",
    askFor: ["Written confirmation of price protection", "Clarity on term length and renewal pricing basis"], source: "licensingDocs", verify: true },
  { id: "csp", term: "Cloud Solution Provider", abbr: "CSP", category: "Agreement",
    plain: "Buying Microsoft cloud subscriptions through a partner, usually with monthly or annual billing and flexibility to adjust seat counts.",
    whyItMatters: "Flexibility trades off against pricing: monthly terms cost more than annual. The partner's margin and services are negotiable.",
    lever: "Compare annual-prepaid CSP with EA pricing at your size; negotiate partner services and billing terms.",
    askFor: ["Annual billing for committed seats, monthly for variable", "Partner support SLAs in writing"], source: "csp", verify: true },
  { id: "price-levels", term: "Price levels (A–D) / volume tiers", category: "Pricing",
    plain: "Volume-based pricing tiers historically used in EA pricing. Microsoft has been changing how online-service discounts are applied.",
    whyItMatters: "Your effective price depends on the tier you qualify for and the policy in force at renewal.",
    lever: "Ask your account team to show the price-list basis for every line item and the policy applicable to your renewal date.",
    askFor: ["Price-list basis for each SKU", "Written confirmation of the discount policy applied"], source: "licensingDocs", verify: true },
  { id: "true-up", term: "True-up", category: "Rights",
    plain: "An annual reconciliation where you pay for licences consumed above your committed quantity.",
    whyItMatters: "Uncontrolled growth shows up as a surprise bill; the same mechanism is why over-committing is costly.",
    lever: "Track consumption monthly and pre-price growth at the contracted rate.",
    askFor: ["Pre-agreed unit price for true-up quantities", "Quarterly consumption review"], source: "licensingDocs", verify: true },
  { id: "true-down", term: "True-down / reduction rights", category: "Rights",
    plain: "The right to reduce subscription quantities at an anniversary, within limits set by the agreement.",
    whyItMatters: "Without it you carry shelfware for the rest of the term.",
    lever: "Make reduction rights explicit and tie to named SKUs.",
    askFor: ["Reduction rights on the highest-risk SKUs (E5, Copilot, add-ons)", "Ability to swap SKUs at anniversary"], source: "licensingDocs", verify: true },
  { id: "price-protection", term: "Price protection", category: "Pricing",
    plain: "A guarantee that the price for a product stays fixed for a defined period — typically the agreement term.",
    whyItMatters: "Microsoft periodically announces list-price changes; protection determines whether they hit you mid-term.",
    lever: "Ask for coverage of every SKU you might add, not only the day-one list.",
    askFor: ["Protection for additions mid-term", "Protection across renewal cycles when possible"], source: "licensingDocs", verify: true },
  { id: "sa", term: "Software Assurance", abbr: "SA", category: "Rights",
    plain: "A benefits package attached to licences: version upgrades, Hybrid Benefit, license mobility, failover rights, training/planning services.",
    whyItMatters: "SA is often renewed by default on servers that no longer exist.",
    lever: "Reconcile SA to the live estate and drop the dead weight.",
    askFor: ["Itemised SA by product", "Drop-and-replace options for retired workloads"], source: "hybridBenefit", verify: true },
  { id: "macc", term: "Microsoft Azure Consumption Commitment", abbr: "MACC", category: "Azure",
    plain: "A commitment to consume a fixed amount of Azure (and eligible Marketplace) spend over a term in exchange for discounts.",
    whyItMatters: "A shortfall is billed; an oversized MACC is a costly forecasting error. Marketplace eligibility can make it work harder.",
    lever: "Commit at a defensible forecast, and negotiate shortfall handling and Marketplace eligibility.",
    askFor: ["Marketplace spend counts toward MACC (eligible offers)", "Shortfall carry-over or extension", "Discount tiers tied to consumption bands"], source: "azureMacc", verify: true },
  { id: "hybrid-benefit", term: "Azure Hybrid Benefit", category: "Azure",
    plain: "Use existing Windows Server / SQL Server licences with SA (and certain subscriptions) to reduce Azure compute cost.",
    whyItMatters: "Frequently unclaimed — free money if you hold the entitlements.",
    lever: "Make claiming it a condition of any Azure review and renew SA only where used.",
    askFor: ["Entitlement review as part of the renewal"], source: "hybridBenefit", verify: true },
  { id: "fiscal-year", term: "Microsoft fiscal calendar", category: "Timing",
    plain: "Microsoft's fiscal year ends June 30 (half-year ends December 31). Sales teams are measured on quarter and year-end targets.",
    whyItMatters: "Deal timing changes how much flexibility the account team has.",
    lever: "Align decision milestones to quarter-end (Mar, Jun, Sep, Dec), with June the strongest, while keeping a credible alternative path.",
    askFor: ["Start negotiations 6–9 months before expiry so you can walk through a quarter-end"], source: "licensingDocs", verify: true },
  { id: "co-term", term: "Co-terming", category: "Rights",
    plain: "Aligning mid-term additions so they end with the main agreement's term.",
    whyItMatters: "Prevents paying full-term cost for part-term use and keeps renewal events aligned.",
    lever: "Ask for pro-rated, co-termed additions at contracted unit prices.", askFor: ["Pro-rated co-termed adds"], source: "licensingDocs", verify: true },
];
export const termById = (id: string) => TERMS.find((t) => t.id === id);
export function searchTerms(q: string) {
  const n = q.toLowerCase().trim();
  if (!n) return TERMS;
  return TERMS.filter((t) => [t.term, t.abbr ?? "", t.plain, t.category].join(" ").toLowerCase().includes(n));
}
