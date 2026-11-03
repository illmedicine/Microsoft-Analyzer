import { useEffect, useState } from "react";
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Button, Field, Input, MessageBar, MessageBarBody, Select, Tab, TabList } from "@fluentui/react-components";
import { api, usdFull } from "../api";
import { useAuth } from "../auth";

interface Transition { id: string; title: string; kind: string; status: string; timing: string; summary: string; whyItMatters: string; actions: string[]; askMicrosoft: string[]; pitfalls: string[]; claimsToVerify?: string[]; planner?: string; affectsYou: boolean | null }
interface Scenario { id: string; label: string; fSku: string; freeViewers: boolean; proLicencesNeeded: number; annualReservedUsd: number; annualPaygUsd: number; annualProUsd: number; totalReservedUsd: number; termTotalReservedUsd: number; note: string }
interface Plan { equivalentFSku: string; requiredCuNow: number; requiredCuEndOfTerm: number; scenarios: Scenario[]; cheapestScenario: string; f64BreakEvenViewers: number; migration: { estimatedDays: number; overlapDays: number | null; risk: string }; warnings: string[]; pricing: { note: string }; caveat: string }

export function Transitions() {
  const [tab, setTab] = useState(new URLSearchParams(location.search).get("tab") ?? "sunsets");
  return (
    <div className="page"><div className="wrap">
      <div className="kicker">Sunsets, mergers & migrations</div>
      <h1 style={{ marginTop: 10 }}>See the licensing changes before they hit your contract.</h1>
      <p className="lede">Product retirements, renames, bundling changes and pricing-policy shifts quietly rewrite your renewal. Track what's changing, what it means, and what to ask Microsoft in writing.</p>
      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(String(d.value))} size="large" style={{ marginBottom: 24 }}>
        <Tab value="sunsets">What's changing</Tab><Tab value="fabric">Premium → Fabric planner</Tab>
      </TabList>
      {tab === "sunsets" ? <Sunsets onPlanner={() => setTab("fabric")} /> : <FabricPlanner />}
    </div></div>
  );
}

function Sunsets({ onPlanner }: { onPlanner: () => void }) {
  const { user } = useAuth();
  const [list, setList] = useState<Transition[]>([]);
  const [pers, setPers] = useState(false);
  const [kind, setKind] = useState("all");
  useEffect(() => { api<{ transitions: Transition[]; personalized: boolean }>("/transitions").then((r) => { setList(r.transitions); setPers(r.personalized); }); }, [user?.id]);
  const shown = list.filter((t) => kind === "all" || t.kind === kind).sort((a, b) => Number(!!b.affectsYou) - Number(!!a.affectsYou));
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <Select value={kind} onChange={(_, d) => setKind(d.value)} aria-label="Filter by type"><option value="all">All changes</option>{["migration", "sunset", "rename", "pricing", "unbundling"].map((k) => <option key={k} value={k}>{k}</option>)}</Select>
        {pers ? <span className="tag pers">Highlighting changes that hit your connected tenant</span> : <small style={{ color: "#555" }}>Connect a tenant in your workspace to highlight the changes that affect your licences.</small>}
      </div>
      <Accordion collapsible multiple defaultOpenItems={["pbi-premium-to-fabric"]}>
        {shown.map((t) => (
          <AccordionItem key={t.id} value={t.id}>
            <AccordionHeader size="large"><b>{t.title}</b><span className="tag" style={{ marginLeft: 10 }}>{t.kind}</span><span className={`tag ${t.status === "upcoming" || t.status === "in-progress" ? "warn" : ""}`} style={{ marginLeft: 8 }}>{t.status}</span>{t.affectsYou && <span className="tag pers" style={{ marginLeft: 8 }}>Affects you</span>}</AccordionHeader>
            <AccordionPanel>
              <div className="stack" style={{ padding: "8px 0 20px", maxWidth: 920 }}>
                <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6 }}>{t.summary}</p>
                <small style={{ color: "#555" }}><b>Timing:</b> {t.timing}</small>
                <div className="ins warn"><i /><div><h4>Why it matters</h4><p>{t.whyItMatters}</p></div></div>
                <div><b>What to do</b><ul style={{ lineHeight: 1.7 }}>{t.actions.map((a) => <li key={a}>{a}</li>)}</ul></div>
                <div className="ins save"><i /><div><h4>Ask Microsoft (get answers in writing)</h4><ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>{t.askMicrosoft.map((a) => <li key={a}>{a}</li>)}</ul></div></div>
                <div className="ins info"><i /><div><h4>Pitfalls</h4><ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>{t.pitfalls.map((a) => <li key={a}>{a}</li>)}</ul></div></div>
                {t.planner === "fabric" && <div><Button appearance="primary" onClick={onPlanner}>Open the Premium → Fabric planner</Button></div>}
                <small style={{ color: "#555" }}><span className="tag warn">Verify</span> Dates and details are curated from Microsoft announcements and may change. Confirm with Microsoft or your licensing partner before acting.{t.claimsToVerify && <> Specifically unverified: {t.claimsToVerify.join(" ")}</>}</small>
              </div>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
}

function FabricPlanner() {
  const [f, setF] = useState({ premiumSku: "P1", viewers: "400", creators: "25", proHeld: "0", peakUtilisationPct: "60", growthPctPerYear: "20", termYears: "3", overlapDays: "", workspaces: "60", largeModels: "4", gatewayDependent: "8", crossRegion: "2" });
  const [plan, setPlan] = useState<Plan | null>(null);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (_: unknown, d: { value: string }) => setF((p) => ({ ...p, [k]: d.value }));
  const n = (s: string) => (s.trim() === "" ? undefined : Number(s));
  async function run() {
    setErr("");
    try { setPlan(await api<Plan>("/fabric-plan", { method: "POST", body: { premiumSku: f.premiumSku, viewers: n(f.viewers) ?? 0, creators: n(f.creators) ?? 0, proHeld: n(f.proHeld) ?? 0, peakUtilisationPct: n(f.peakUtilisationPct), growthPctPerYear: n(f.growthPctPerYear), termYears: n(f.termYears), overlapDays: n(f.overlapDays), workspaces: n(f.workspaces), largeModels: n(f.largeModels), gatewayDependent: n(f.gatewayDependent), crossRegion: n(f.crossRegion) } })); }
    catch { setErr("Check your inputs: whole numbers, utilisation 1–100%."); }
  }
  return (
    <div className="cols">
      <div className="panel stack">
        <h3 style={{ margin: 0 }}>Your Premium estate</h3>
        <Field label="Current Premium SKU"><Select value={f.premiumSku} onChange={(_, d) => setF({ ...f, premiumSku: d.value })}>{["P1", "P2", "P3", "P4", "P5"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="People who view reports"><Input type="number" value={f.viewers} onChange={set("viewers")} /></Field>
        <div className="row"><Field label="Creators / authors" style={{ flex: 1 }}><Input type="number" value={f.creators} onChange={set("creators")} /></Field><Field label="Pro licences already held" hint="e.g. via M365 E5" style={{ flex: 1 }}><Input type="number" value={f.proHeld} onChange={set("proHeld")} /></Field></div>
        <Field label="Peak capacity utilisation % (Capacity Metrics app)"><Input type="number" value={f.peakUtilisationPct} onChange={set("peakUtilisationPct")} /></Field>
        <div className="row"><Field label="Growth % / year" style={{ flex: 1 }}><Input type="number" value={f.growthPctPerYear} onChange={set("growthPctPerYear")} /></Field><Field label="Term (years)" style={{ flex: 1 }}><Input type="number" value={f.termYears} onChange={set("termYears")} /></Field></div>
        <h3 style={{ margin: "8px 0 0" }}>Migration window</h3>
        <Field label="Overlap days you get" hint="Ask your rep — blank = unknown"><Input type="number" value={f.overlapDays} onChange={set("overlapDays")} /></Field>
        <div className="row"><Field label="Workspaces" style={{ flex: 1 }}><Input type="number" value={f.workspaces} onChange={set("workspaces")} /></Field><Field label="Large models" style={{ flex: 1 }}><Input type="number" value={f.largeModels} onChange={set("largeModels")} /></Field></div>
        <div className="row"><Field label="Gateway / tight refresh" style={{ flex: 1 }}><Input type="number" value={f.gatewayDependent} onChange={set("gatewayDependent")} /></Field><Field label="Cross-region workspaces" style={{ flex: 1 }}><Input type="number" value={f.crossRegion} onChange={set("crossRegion")} /></Field></div>
        <Button appearance="primary" size="large" onClick={run}>Plan my migration</Button>
        {err && <MessageBar intent="error"><MessageBarBody>{err}</MessageBarBody></MessageBar>}
      </div>
      <div className="stack">
        {!plan && <div className="panel"><h3 style={{ marginTop: 0 }}>What you'll get</h3><ul style={{ lineHeight: 1.8 }}><li>Like-for-like vs right-sized vs growth-sized F-SKU options</li><li>The viewer count where F64 (free viewers) beats a smaller SKU plus Pro</li><li>Reserved vs pay-as-you-go cost across your term</li><li>Migration-window risk and what to ask Microsoft</li></ul></div>}
        {plan && <>
          <div className="kpi">
            <div><b>{plan.equivalentFSku}</b><span>Name-based equivalent</span></div>
            <div><b>F{plan.scenarios.find((s) => s.id === "rightsized")?.fSku.slice(1)}</b><span>Right-sized today</span></div>
            <div><b>{plan.f64BreakEvenViewers.toLocaleString()}</b><span>Viewers where F64 beats F32 + Pro</span></div>
            <div><b style={{ color: plan.migration.risk === "high" ? "var(--crimson)" : undefined }}>{plan.migration.risk.toUpperCase()}</b><span>Migration-window risk (~{plan.migration.estimatedDays} days work{plan.migration.overlapDays != null ? ` vs ${plan.migration.overlapDays}` : ""})</span></div>
          </div>
          {plan.warnings.map((w) => <MessageBar key={w} intent="warning"><MessageBarBody>{w}</MessageBarBody></MessageBar>)}
          <div className="panel"><h3 style={{ marginTop: 0 }}>Sizing scenarios</h3>
            <table className="t"><thead><tr><th>Scenario</th><th className="n">Pro needed</th><th className="n">Capacity / yr (reserved)</th><th className="n">Pro / yr</th><th className="n">Total / yr</th><th className="n">Over term</th></tr></thead>
              <tbody>{plan.scenarios.map((s) => <tr key={s.id} style={s.id === plan.cheapestScenario ? { background: "#f1ead2" } : undefined}>
                <td><b>{s.label}</b> <span className="tag">{s.fSku}</span>{s.id === plan.cheapestScenario && <span className="tag warn" style={{ marginLeft: 6 }}>Lowest cost</span>}<br /><small style={{ color: "#555" }}>{s.note}</small></td>
                <td className="n">{s.proLicencesNeeded.toLocaleString()}{s.freeViewers ? <><br /><small>free viewers</small></> : null}</td><td className="n">{usdFull(s.annualReservedUsd)}</td><td className="n">{usdFull(s.annualProUsd)}</td><td className="n"><b>{usdFull(s.totalReservedUsd)}</b></td><td className="n">{usdFull(s.termTotalReservedUsd)}</td></tr>)}</tbody></table>
            <p style={{ fontSize: 13, color: "#555", marginBottom: 0 }}>Lowest cost isn't automatically best: a cheaper size that throttles workloads costs more than it saves. Compare right-sized vs growth, and reserve only the stable baseline.</p>
          </div>
          <div className="panel"><h3 style={{ marginTop: 0 }}>Ask your Microsoft rep</h3><ul style={{ lineHeight: 1.8, margin: 0 }}>
            <li>How many days of overlap do we get, and can it be extended in writing?</li><li>What happens to performance and content if we miss the window?</li><li>Can we start Fabric capacity before the renewal date?</li><li>Reserved vs pay-as-you-go price difference — and can we resize mid-term?</li></ul></div>
          <small style={{ color: "#555" }}>{plan.caveat} {plan.pricing.note}</small>
        </>}
      </div>
    </div>
  );
}
