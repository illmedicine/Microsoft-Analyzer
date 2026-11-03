import { useState } from "react";
import { Link } from "react-router-dom";
import { Slider, type SlideDef } from "../components/Slider";
import { useAuth } from "../auth";
import { usd } from "../api";

const AUDIENCES = ["IT Architects", "Solo IT pros & MSPs", "IT Managers", "Finance & FP&A", "Contracts & Procurement", "CFOs", "Licensing specialists", "Cloud FinOps", "Security leaders"];

const HERO_SLIDES: SlideDef[] = [
  { art: "licenses", kicker: "Licence waste", title: "Roughly a quarter of seats are paid for and never used.", body: "MA-365 finds unassigned, inactive and duplicated licences across Microsoft 365, Entra, Power BI, Teams and Copilot.", stat: { value: "~27%", label: "typical modeled licence waste" } },
  { art: "contracts", kicker: "Contract intelligence", title: "Read your EA like the people who wrote it.", body: "EDE hours, true-up, true-down, price protection, MACC, Software Assurance — decoded, with the exact asks to put on the table.", stat: { value: "15+", label: "contract terms explained" } },
  { art: "spend", kicker: "Renewal savings", title: "Rebuild the deal before you sign it.", body: "Model right-sizing, SKU mix, Azure commitments and support — and see a defensible savings range.", stat: { value: "–14%", label: "typical modeled renewal reduction" } },
  { art: "timeline", kicker: "Timing", title: "Microsoft's year ends June 30. Does your renewal plan?", body: "Know which quarter-end to target, when to start, and what to have papered before you commit." },
];

const FEATURE_SLIDES: SlideDef[] = [
  { art: "licenses", kicker: "Know every product", title: "Type any licence. Get the full picture.", body: "What it includes, what it overlaps with, where it's usually wasted, and how to negotiate it — for every major Microsoft product.", cta: <Link className="btn gold" to="/explore">Explore products →</Link> },
  { art: "contracts", kicker: "Negotiate", title: "Turn contract jargon into leverage.", body: "Use real Microsoft terms to build a proposal your account team has to take seriously.", cta: <Link className="btn gold" to="/advisor">Open renewal advisor →</Link> },
  { art: "azure", kicker: "Azure & cloud", title: "Commit to what you'll actually consume.", body: "Size a MACC with defensible forecasts, make Marketplace spend count, claim Hybrid Benefit." },
  { art: "security", kicker: "Walled-off by design", title: "Your tenant. Your account. Nobody else's.", body: "Connect tenant data read-only. It's bound to your authenticated MA-365 account and never shared across organisations.", cta: <Link className="btn gold" to="/workspace">Open my workspace →</Link> },
];

const PERSONAS = [
  { id: "arch", label: "IT Architect", h: "Design licensing into the architecture — not after it.", pts: ["See exactly what each SKU includes and overlaps with before you recommend it.", "Spot duplicate stacks (EMS + Windows + Intune under M365) at design time.", "Model E3 + targeted E5 add-ons against company-wide E5.", "Walk into reviews with evidence, not folklore."], out: "Fewer SKUs, cleaner design", sub: "Eliminate overlap before it's purchased." },
  { id: "pro", label: "Solo IT pro / MSP", h: "Be the person who saves the client six figures.", pts: ["Instantly answer 'do we need this licence?' for any product.", "Check the 300-user Business Premium cap and CSP vs EA break-evens.", "Produce a waste report in minutes — no sign-in needed.", "Save what you learn about each organisation when signed in."], out: "Minutes, not days", sub: "From question to defensible answer." },
  { id: "fin", label: "Finance & Contracts", h: "Understand what you're committing to — in plain English.", pts: ["True-up vs true-down: where the surprise bills come from.", "Price protection, co-terming and reduction rights, explained.", "EDE hours and Unified Support utilisation versus what you paid for.", "A negotiation checklist tied to each term."], out: "No more surprise true-ups", sub: "Quantities become choices, not accidents." },
  { id: "cfo", label: "CFO", h: "Cut the second-largest line in IT without cutting capability.", pts: ["A single view of licence, Azure and support spend.", "A modeled savings range with the assumptions on the table.", "Timing guidance aligned to Microsoft's fiscal calendar.", "Evidence you can defend to the board and the account team."], out: "A number you can defend", sub: "Ranges, assumptions and sources — not guesses." },
];

export function Landing({ onSignIn }: { onSignIn: () => void }) {
  const { user } = useAuth();
  const [p, setP] = useState("arch");
  const persona = PERSONAS.find((x) => x.id === p)!;
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="kicker" style={{ color: "var(--mustard)", marginBottom: 20 }}>MA-365 · The people's advocate for Microsoft licensing</div>
          <h1>Stop paying for <em>what you don't use.</em></h1>
          <p className="lede">MA-365 is an AI insights tool for Microsoft licences, spend, contracts and renewals. It finds shelfware, decodes your agreement — EDE hours, true-ups, MACC — and helps you build a renewal proposal that saves real money.</p>
          <div className="cta">
            <Link className="btn gold" to="/explore">Try it now — no sign-in</Link>
            {!user && <button className="btn ghost" onClick={onSignIn}>Sign in with Google</button>}
            {user && <Link className="btn ghost" to="/workspace">Go to my workspace</Link>}
          </div>
          <div className="meta"><span>Works instantly with generic insights</span><span>Sign in for insights tailored to your organisation</span><span>Tenant data walled off per account</span></div>
        </div>
      </section>
      <div className="audience" aria-hidden><div className="row">{[...AUDIENCES, ...AUDIENCES].map((a, i) => <span key={i}>◆ {a}</span>)}</div></div>

      <Slider slides={HERO_SLIDES} label="What MA-365 does" tall />

      <section className="block white">
        <div className="wrap">
          <div className="kicker">What is MA-365?</div>
          <h2 style={{ marginTop: 16 }}>One place to understand, trim and renegotiate Microsoft.</h2>
          <p className="sub">Most organisations buy Microsoft on autopilot: renew the same quantities, accept the same bundles, and discover the shelfware at the next true-up. MA-365 puts the licence data, the contract mechanics and the negotiating playbook in one tool.</p>
          <div className="grid3">
            <div><div className="num">01</div><h3>Understand</h3><p>Every major Microsoft product explained: what's in it, what it overlaps with, what it usually costs and where it's typically wasted.</p></div>
            <div><div className="num">02</div><h3>Optimise</h3><p>Compare assigned versus purchased, find duplicates, and quantify the annual cost of seats nobody uses — from your own tenant data.</p></div>
            <div><div className="num">03</div><h3>Negotiate</h3><p>Translate real Microsoft contract terms into concrete asks, a timeline and a savings range for your next renewal.</p></div>
          </div>
        </div>
      </section>

      <section className="block" style={{ paddingTop: 0 }}>
        <div className="statband" role="list" aria-label="Key benchmarks">
          <div role="listitem"><b>~27%</b><span>of licence spend is typically unassigned or inactive*</span></div>
          <div role="listitem"><b>8–22%</b><span>modeled reduction from rebuilding contract terms at renewal*</span></div>
          <div role="listitem"><b>3 yrs</b><span>the term you're locked to when quantities are over-committed</span></div>
          <div role="listitem"><b>Jun 30</b><span>Microsoft's fiscal year-end — your strongest leverage window</span></div>
        </div>
        <div className="wrap"><p className="fine">*Illustrative modeled benchmarks for planning, not a guarantee or a statement about any specific customer. Your results depend on your estate, agreement and negotiation. Use the calculator below with your own numbers.</p></div>
      </section>

      <section className="block gold">
        <div className="wrap">
          <div className="kicker">Built for you</div>
          <h2 style={{ marginTop: 16 }}>If you touch Microsoft spend, this is for you.</h2>
          <div className="persona-tabs" role="tablist" aria-label="Audience">
            {PERSONAS.map((x) => <button key={x.id} role="tab" aria-selected={x.id === p} onClick={() => setP(x.id)}>{x.label}</button>)}
          </div>
          <div className="persona" role="tabpanel">
            <div><h3>{persona.h}</h3><ul>{persona.pts.map((t) => <li key={t}>{t}</li>)}</ul></div>
            <div className="outcome"><div className="kicker" style={{ color: "var(--mustard)" }}>The outcome</div><b>{persona.out}</b><p style={{ margin: "12px 0 0" }}>{persona.sub}</p></div>
          </div>
        </div>
      </section>

      <Slider slides={FEATURE_SLIDES} label="Capabilities" />

      <section className="block oxblood">
        <div className="wrap">
          <div className="kicker" style={{ color: "var(--mustard)" }}>How a renewal gets rebuilt</div>
          <h2 style={{ marginTop: 16 }}>Four moves between you and a better deal.</h2>
          <div className="steps" style={{ borderTopColor: "var(--paper)" }}>
            <div><div className="num">1</div><h3>Baseline</h3><p>Connect tenant data (read-only) or enter quantities. See purchased vs assigned vs active.</p></div>
            <div><div className="num">2</div><h3>Scenarios</h3><p>As-is, right-sized, and alternative. Right-sizing first — discounts apply to a smaller number.</p></div>
            <div><div className="num">3</div><h3>Negotiate</h3><p>Use contract terms as levers: EDE conversion, price protection, MACC shortfall, reduction rights.</p></div>
            <div><div className="num">4</div><h3>Paper it</h3><p>Get it in the order or amendment. Verbal promises don't survive the next account manager.</p></div>
          </div>
          <div className="chips">{["EDE hours", "True-up", "True-down", "Price protection", "MACC", "Hybrid Benefit", "Co-terming", "Software Assurance", "Unified Support"].map((c) => <Link key={c} to="/terms">{c}</Link>)}</div>
        </div>
      </section>

      <Calculator />

      <section className="block dark">
        <div className="wrap">
          <div className="kicker" style={{ color: "var(--mustard)" }}>Security you can explain to your CISO</div>
          <h2 style={{ marginTop: 16 }}>Many organisations. Zero crossover.</h2>
          <p className="sub">MA-365 is multi-tenant SaaS, so isolation isn't a feature — it's the architecture.</p>
          <div className="grid3">
            <div><div className="num">◼</div><h3>Bound to your account</h3><p>A tenant is attached only through a one-time, session-bound sign-in flow. A link can't be completed from another user's session or replayed.</p></div>
            <div><div className="num">◼</div><h3>One tenant, one owner</h3><p>A real Microsoft tenant can be linked to a single MA-365 account at a time. Nobody else can attach it.</p></div>
            <div><div className="num">◼</div><h3>Read-only & encrypted</h3><p>Read-only organisation scopes. Refresh tokens are encrypted at rest and cryptographically bound to your account. Disconnect any time to delete them.</p></div>
          </div>
        </div>
      </section>

      <section className="block white">
        <div className="wrap">
          <div className="kicker">Two ways to use it</div>
          <h2 style={{ marginTop: 16 }}>Instant. Or personal.</h2>
          <table className="compare" style={{ color: "var(--ink)" }}>
            <thead><tr><th></th><th>Without signing in</th><th>Signed in with Google</th></tr></thead>
            <tbody style={{ borderColor: "#ddd" }}>
              <tr><td><b>Product & licence insights</b></td><td>Generic best-practice insights</td><td>Tailored to your size, agreement, cloud posture and priorities</td></tr>
              <tr><td><b>History</b></td><td>Not saved</td><td>Search & parameter history saved to your account</td></tr>
              <tr><td><b>Organisation learnings</b></td><td>—</td><td>Notes about your organisation shape every insight</td></tr>
              <tr><td><b>Tenant data</b></td><td>—</td><td>Connect read-only; walled off to your account</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="block forest" style={{ textAlign: "center" }}>
        <div className="wrap">
          <h2 style={{ margin: "0 auto", maxWidth: "18ch" }}>Your next renewal is already on the calendar.</h2>
          <p className="sub" style={{ margin: "24px auto 36px" }}>Start with a product, a number, or a contract term. Get an answer in seconds.</p>
          <div className="cta" style={{ justifyContent: "center", display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link className="btn gold" to="/advisor">Plan my renewal</Link>
            <Link className="btn light" to="/licenses">Find my shelfware</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Calculator() {
  const { cfg } = useAuth();
  const b = cfg?.benchmarks ?? { wasteShareOfLicenseSpend: { low: 0.2, typical: 0.27, high: 0.35 }, renewalSavingsShare: { low: 0.08, typical: 0.14, high: 0.22 } };
  const [users, setUsers] = useState(2500);
  const [perUser, setPerUser] = useState(38);
  const annual = users * perUser * 12;
  return (
    <section className="block" id="calculator">
      <div className="wrap">
        <div className="kicker">Estimate it yourself</div>
        <h2 style={{ marginTop: 16 }}>What could shelfware be costing you?</h2>
        <div className="calc">
          <div className="in">
            <label>Microsoft-licensed users<div className="rng"><span>{users.toLocaleString()}</span></div><input type="range" min={25} max={50000} step={25} value={users} onChange={(e) => setUsers(+e.target.value)} aria-label="Users" /></label>
            <label>Average licence cost per user / month<div className="rng"><span>${perUser}</span></div><input type="range" min={5} max={90} value={perUser} onChange={(e) => setPerUser(+e.target.value)} aria-label="Cost per user per month" /></label>
            <div className="lbl" style={{ color: "#555" }}>Annual licence spend</div><div className="big">{usd(annual)}</div>
            <Link className="btn" to="/licenses" style={{ justifySelf: "start" }}>Use my real numbers →</Link>
          </div>
          <div className="out">
            <div><div className="lbl">Estimated annual spend on licences you don't use</div><div className="big" style={{ color: "var(--mustard)" }}>{usd(annual * b.wasteShareOfLicenseSpend.low)} – {usd(annual * b.wasteShareOfLicenseSpend.high)}</div><div className="lbl" style={{ marginTop: 6 }}>typical: {usd(annual * b.wasteShareOfLicenseSpend.typical)}</div></div>
            <div><div className="lbl">Modeled reduction from rebuilding terms at renewal</div><div className="big">{usd(annual * b.renewalSavingsShare.low)} – {usd(annual * b.renewalSavingsShare.high)}</div><div className="lbl" style={{ marginTop: 6 }}>typical: {usd(annual * b.renewalSavingsShare.typical)} / year</div></div>
            <div className="lbl" style={{ textTransform: "none", letterSpacing: 0, lineHeight: 1.5 }}>Over a 3-year agreement, the typical case is {usd(annual * b.renewalSavingsShare.typical * 3)}. Modeled from planning assumptions — not a promise. Run the advisor to adapt it to your agreement.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
