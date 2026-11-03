import { useEffect, useState } from "react";
import { Button, Checkbox, Field, Input, MessageBar, MessageBarBody, Select, Spinner } from "@fluentui/react-components";
import { api, usdFull, type Profile } from "../api";
import { useAuth } from "../auth";

interface Lever { id: string; title: string; why: string; lowUsd: number; highUsd: number; asks: string[] }
interface Result { leverageScore: number; daysToRenewal?: number; levers: Lever[]; totalSavingsUsd: { low: number; high: number }; timeline: { when: string; what: string }[]; warnings: string[]; sources: { label: string; url: string }[]; caveat: string }

export function Advisor() {
  const { user } = useAuth();
  const [f, setF] = useState({ agreementType: "EA", seats: "2000", annualSpendUsd: "2000000", renewalDate: "", azureAnnualUsd: "", supportAnnualUsd: "", edeHours: "", edeUtilizationPct: "", shelfwarePct: "", hasAlternative: false });
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (_: unknown, d: { value: string }) => setF((p) => ({ ...p, [k]: d.value }));

  useEffect(() => { // prefill from the signed-in user's profile
    if (!user) return;
    api<{ profile: Profile }>("/workspace").then(({ profile: p }) => setF((x) => ({ ...x, agreementType: p.agreementType ?? x.agreementType, seats: p.employeeCount ? String(p.employeeCount) : x.seats, annualSpendUsd: p.annualMicrosoftSpendUsd ? String(p.annualMicrosoftSpendUsd) : x.annualSpendUsd, renewalDate: p.renewalDate ?? x.renewalDate }))).catch(() => undefined);
  }, [user?.id]);

  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
  async function run() {
    setBusy(true); setErr("");
    try {
      setRes(await api<Result>("/advisor", { method: "POST", body: { agreementType: f.agreementType, seats: num(f.seats), annualSpendUsd: num(f.annualSpendUsd), renewalDate: f.renewalDate || undefined, azureAnnualUsd: num(f.azureAnnualUsd), supportAnnualUsd: num(f.supportAnnualUsd), edeHours: num(f.edeHours), edeUtilizationPct: num(f.edeUtilizationPct), shelfwarePct: num(f.shelfwarePct), hasAlternative: f.hasAlternative } }));
    } catch { setErr("Please check your inputs (numbers only, sensible ranges)."); } finally { setBusy(false); }
  }
  return (
    <div className="page"><div className="wrap">
      <div className="kicker">Renewal advisor</div>
      <h1 style={{ marginTop: 10 }}>Build the deal before they build it for you.</h1>
      <p className="lede">Describe your agreement. MA-365 estimates your leverage, ranks the negotiation levers, and gives you a timeline aligned to Microsoft's fiscal calendar.</p>
      <div className="cols">
        <div className="panel stack">
          <Field label="Agreement type"><Select value={f.agreementType} onChange={(_, d) => setF({ ...f, agreementType: d.value })}>{["EA", "MCA-E", "CSP", "MPSA", "Unknown"].map((a) => <option key={a}>{a}</option>)}</Select></Field>
          <Field label="Seats / users"><Input type="number" value={f.seats} onChange={set("seats")} /></Field>
          <Field label="Total annual Microsoft spend (USD)"><Input type="number" value={f.annualSpendUsd} onChange={set("annualSpendUsd")} /></Field>
          <Field label="…of which Azure (USD/yr)"><Input type="number" value={f.azureAnnualUsd} onChange={set("azureAnnualUsd")} /></Field>
          <Field label="…of which Unified Support (USD/yr)"><Input type="number" value={f.supportAnnualUsd} onChange={set("supportAnnualUsd")} /></Field>
          <div className="row"><Field label="EDE hours purchased" style={{ flex: 1 }}><Input type="number" value={f.edeHours} onChange={set("edeHours")} /></Field><Field label="EDE hours used %" style={{ flex: 1 }}><Input type="number" value={f.edeUtilizationPct} onChange={set("edeUtilizationPct")} /></Field></div>
          <Field label="Known shelfware % (leave blank to use benchmark)"><Input type="number" value={f.shelfwarePct} onChange={set("shelfwarePct")} /></Field>
          <Field label="Renewal date"><Input type="date" value={f.renewalDate} onChange={set("renewalDate")} /></Field>
          <Checkbox checked={f.hasAlternative} onChange={(_, d) => setF({ ...f, hasAlternative: !!d.checked })} label="We have a credible alternative (partner, multi-cloud, other vendor)" />
          <Button appearance="primary" size="large" onClick={run} disabled={busy}>{busy ? <Spinner size="tiny" /> : "Analyse my renewal"}</Button>
          {err && <MessageBar intent="error"><MessageBarBody>{err}</MessageBarBody></MessageBar>}
          {!user && <small style={{ color: "#555" }}>Sign in to prefill from your organisation profile and save this analysis to your history.</small>}
        </div>
        <div className="stack">
          {!res && <div className="panel"><h3 style={{ marginTop: 0 }}>What you'll get</h3><ul style={{ lineHeight: 1.8 }}><li>Leverage score and why</li><li>Ranked levers with dollar ranges</li><li>Concrete asks for each lever</li><li>A timeline from baseline to signature</li></ul></div>}
          {res && <>
            <div className="kpi">
              <div><b>{res.leverageScore}</b><span>Leverage score / 100</span><div className="meter" style={{ marginTop: 10 }}><i style={{ width: `${res.leverageScore}%` }} /></div></div>
              <div><b>{usdFull(res.totalSavingsUsd.low)}–{usdFull(res.totalSavingsUsd.high)}</b><span>Modeled annual savings</span></div>
              {res.daysToRenewal != null && <div><b>{res.daysToRenewal}</b><span>Days to renewal</span></div>}
            </div>
            {res.warnings.map((w) => <MessageBar key={w} intent="warning"><MessageBarBody>{w}</MessageBarBody></MessageBar>)}
            <div className="panel"><h3 style={{ marginTop: 0 }}>Negotiation levers</h3>
              {res.levers.map((l) => <div key={l.id} className="ins save"><i /><div><h4>{l.title} — {usdFull(l.lowUsd)} to {usdFull(l.highUsd)}/yr</h4><p>{l.why}</p><p style={{ marginTop: 6 }}><b>Ask for:</b> {l.asks.join(" · ")}</p></div></div>)}
            </div>
            {res.timeline.length > 0 && <div className="panel"><h3 style={{ marginTop: 0 }}>Timeline</h3>{res.timeline.map((t) => <div key={t.when} className="ins info"><i /><div><h4>{t.when}</h4><p>{t.what}</p></div></div>)}</div>}
            <p style={{ fontSize: 12, color: "#555" }}>{res.caveat} Sources: {res.sources.map((s, i) => <span key={s.url}>{i > 0 && " · "}<a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></span>)}</p>
          </>}
        </div>
      </div>
    </div></div>
  );
}
