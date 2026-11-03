import { useEffect, useState } from "react";
import { Button, Field, Input, MessageBar, MessageBarBody, Select, Tab, TabList, Textarea } from "@fluentui/react-components";
import { api, usdFull, type Profile, type WasteResult } from "../api";
import { useAuth } from "../auth";

interface Hist { id: string; kind: string; label: string; at: string }
interface TenantStatus { enabled: boolean; linked: { tenantId: string; tenantName?: string; demo: boolean; linkedAt: string } | null; snapshot: { syncedAt: string; skus: { name: string; purchased: number; assigned: number }[] } | null }
const empty: Profile = { priorities: [], learnings: [] };
const TENANT_MSG: Record<string, [string, "success" | "error" | "warning"]> = {
  connected: ["Tenant connected. Data is read-only and visible only to your account.", "success"],
  tenant_owned_by_another_account: ["That tenant is already linked to a different MA-365 account, so it can't be attached here.", "error"],
  session_mismatch: ["The connection request didn't match your signed-in session, so it was rejected.", "error"],
  expired: ["That connection request expired or was already used. Start again.", "warning"],
  denied: ["Microsoft sign-in was cancelled or denied.", "warning"],
};

export function Workspace({ onSignIn }: { onSignIn: () => void }) {
  const { user, loading, signOut } = useAuth();
  const [tab, setTab] = useState("profile");
  if (loading) return null;
  if (!user) return (
    <div className="page"><div className="wrap"><div className="panel gate">
      <h2 style={{ fontFamily: "var(--display)" }}>Your workspace is private to you.</h2>
      <p style={{ maxWidth: 560, margin: "0 auto 24px", lineHeight: 1.6 }}>Sign in with Google to save search history and organisation learnings, tailor insights to your situation, and connect tenant data that stays walled off to your account.</p>
      <Button appearance="primary" size="large" onClick={onSignIn}>Sign in with Google</Button>
    </div></div></div>
  );
  return (
    <div className="page"><div className="wrap">
      <div className="kicker">My workspace</div>
      <h1 style={{ marginTop: 10 }}>Welcome, {user.name.split(" ")[0]}.</h1>
      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(String(d.value))} size="large" style={{ margin: "16px 0 24px" }}>
        <Tab value="profile">Organisation profile</Tab><Tab value="tenant">Tenant data</Tab><Tab value="history">History</Tab><Tab value="account">Account</Tab>
      </TabList>
      {tab === "profile" && <ProfileTab />}
      {tab === "tenant" && <TenantTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "account" && <AccountTab onDeleted={signOut} />}
    </div></div>
  );
}

function ProfileTab() {
  const [p, setP] = useState<Profile>(empty);
  const [saved, setSaved] = useState(false);
  useEffect(() => { api<{ profile: Profile }>("/workspace").then((r) => setP({ ...empty, ...r.profile })); }, []);
  const num = (s: string) => (s === "" ? undefined : Number(s));
  async function save() { await api("/profile", { method: "PUT", body: { ...p, renewalDate: p.renewalDate ?? "" } }); setSaved(true); setTimeout(() => setSaved(false), 2500); }
  return (
    <div className="cols" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <div className="panel stack">
        <h3 style={{ margin: 0 }}>About your organisation</h3>
        <Field label="Organisation name"><Input value={p.orgName ?? ""} onChange={(_, d) => setP({ ...p, orgName: d.value })} /></Field>
        <Field label="Industry"><Input value={p.industry ?? ""} onChange={(_, d) => setP({ ...p, industry: d.value })} /></Field>
        <Field label="Employees"><Input type="number" value={p.employeeCount?.toString() ?? ""} onChange={(_, d) => setP({ ...p, employeeCount: num(d.value) })} /></Field>
        <Field label="Agreement type"><Select value={p.agreementType ?? "Unknown"} onChange={(_, d) => setP({ ...p, agreementType: d.value })}>{["EA", "MCA-E", "CSP", "MPSA", "Unknown"].map((a) => <option key={a}>{a}</option>)}</Select></Field>
        <Field label="Renewal date"><Input type="date" value={p.renewalDate ?? ""} onChange={(_, d) => setP({ ...p, renewalDate: d.value })} /></Field>
        <Field label="Annual Microsoft spend (USD)"><Input type="number" value={p.annualMicrosoftSpendUsd?.toString() ?? ""} onChange={(_, d) => setP({ ...p, annualMicrosoftSpendUsd: num(d.value) })} /></Field>
        <Field label="Cloud posture"><Select value={p.primaryCloud ?? ""} onChange={(_, d) => setP({ ...p, primaryCloud: d.value || undefined })}><option value="">—</option><option value="azure-first">Azure-first</option><option value="multi-cloud">Multi-cloud</option><option value="on-prem-heavy">On-prem heavy</option><option value="m365-only">Microsoft 365 only</option></Select></Field>
      </div>
      <div className="panel stack">
        <h3 style={{ margin: 0 }}>What we should know</h3>
        <Field label="Priorities (comma separated)" hint="e.g. cost, security consolidation, Copilot adoption"><Input value={p.priorities.join(", ")} onChange={(_, d) => setP({ ...p, priorities: d.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12) })} /></Field>
        <Field label="Organisation learnings (one per line)" hint="Anything that should shape your insights: constraints, past deals, tooling, politics."><Textarea rows={10} value={p.learnings.join("\n")} onChange={(_, d) => setP({ ...p, learnings: d.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 50) })} /></Field>
        <div className="row"><Button appearance="primary" onClick={save}>Save profile</Button>{saved && <span role="status">Saved ✓</span>}</div>
        <small style={{ color: "#555" }}>Stored against your account only. Used to tailor product insights and prefill the advisor.</small>
      </div>
    </div>
  );
}

function TenantTab() {
  const [s, setS] = useState<TenantStatus | null>(null);
  const [waste, setWaste] = useState<WasteResult | null>(null);
  const [msg, setMsg] = useState<[string, "success" | "error" | "warning"] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => { const st = await api<TenantStatus>("/tenant/status"); setS(st); if (st.snapshot) api<{ analysis: WasteResult }>("/tenant-waste").then((r) => setWaste(r.analysis)).catch(() => setWaste(null)); else setWaste(null); };
  useEffect(() => {
    void load();
    const t = new URLSearchParams(location.search).get("tenant");
    if (t) { setMsg(TENANT_MSG[t] ?? ["Tenant connection did not complete.", "error"]); history.replaceState({}, "", location.pathname); }
  }, []);
  async function connect() { setBusy(true); try { const r = await api<{ url: string }>("/tenant/connect", { method: "POST" }); location.href = r.url; } catch { setMsg(["Tenant connection isn't configured on this server.", "warning"]); setBusy(false); } }
  async function act(fn: () => Promise<unknown>) { setBusy(true); try { await fn(); await load(); } catch { setMsg(["That didn't work. Please try again.", "error"]); } finally { setBusy(false); } }
  if (!s) return null;
  return (
    <div className="stack">
      {msg && <MessageBar intent={msg[1]}><MessageBarBody>{msg[0]}</MessageBarBody></MessageBar>}
      <div className="panel dark">
        <h3 style={{ marginTop: 0 }}>Connect your Microsoft tenant</h3>
        <p style={{ lineHeight: 1.6, maxWidth: 760 }}>Read-only access to your organisation's licence inventory. The connection is bound to <b>this</b> MA-365 account: it can't be completed from another session, a real tenant can belong to only one account, and tokens are encrypted at rest. Disconnect any time to delete them.</p>
        {s.linked ? (
          <div className="row"><span className="tag warn">{s.linked.demo ? "Sample data" : "Connected"}</span><b>{s.linked.tenantName ?? s.linked.tenantId}</b>
            {!s.linked.demo && <Button disabled={busy} onClick={() => act(() => api("/tenant/sync", { method: "POST" }))}>Sync now</Button>}
            <Button disabled={busy} onClick={() => act(() => api("/tenant", { method: "DELETE" }))}>Disconnect & delete data</Button></div>
        ) : (
          <div className="row"><Button appearance="primary" disabled={busy || !s.enabled} onClick={connect}>Connect with Microsoft</Button><Button disabled={busy} onClick={() => act(() => api("/tenant/demo", { method: "POST" }))}>Load sample tenant</Button>{!s.enabled && <small>Microsoft sign-in isn't configured on this server (set MS_CLIENT_ID / MS_CLIENT_SECRET).</small>}</div>
        )}
      </div>
      {s.snapshot && waste && <>
        <div className="kpi"><div><b>{usdFull(waste.totalAnnualCost)}</b><span>Annual licence cost (list)</span></div><div><b style={{ color: "var(--crimson)" }}>{usdFull(waste.totalAnnualWaste)}</b><span>Unassigned seat waste</span></div><div><b>{(waste.wastePct * 100).toFixed(1)}%</b><span>Of spend</span></div></div>
        <div className="panel"><table className="t"><thead><tr><th>SKU</th><th className="n">Purchased</th><th className="n">Assigned</th><th className="n">Unassigned</th><th className="n">Annual waste</th></tr></thead>
          <tbody>{waste.rows.map((r, i) => <tr key={i}><td>{r.name}</td><td className="n">{r.purchased.toLocaleString()}</td><td className="n">{r.assigned.toLocaleString()}</td><td className="n">{r.unassigned.toLocaleString()}</td><td className="n"><b>{usdFull(r.annualWaste)}</b></td></tr>)}</tbody></table></div>
        {waste.duplicates.length > 0 && <MessageBar intent="warning"><MessageBarBody>Possible duplicates: {waste.duplicates.map((d) => `${d.product} ⊂ ${d.coveredBy}`).join("; ")}</MessageBarBody></MessageBar>}
        <small style={{ color: "#555" }}>{waste.caveat} Unassigned seats only; activity-based inactivity requires usage reports.</small>
      </>}
    </div>
  );
}

function HistoryTab() {
  const [h, setH] = useState<Hist[]>([]);
  const load = () => api<{ history: Hist[] }>("/workspace").then((r) => setH(r.history));
  useEffect(() => { void load(); }, []);
  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}><h3 style={{ margin: 0 }}>Your search & analysis history</h3><Button disabled={!h.length} onClick={async () => { await api("/history", { method: "DELETE" }); await load(); }}>Clear history</Button></div>
      {!h.length && <p>Nothing yet. Look up a product or run the advisor while signed in and it appears here.</p>}
      {h.map((x) => <div key={x.id} className="ins info"><i /><div><h4>{x.label} <span className="tag">{x.kind}</span></h4><p>{new Date(x.at).toLocaleString()}</p></div></div>)}
    </div>
  );
}

function AccountTab({ onDeleted }: { onDeleted: () => Promise<void> }) {
  const [sure, setSure] = useState(false);
  return (
    <div className="panel stack" style={{ maxWidth: 640 }}>
      <h3 style={{ margin: 0 }}>Delete my account</h3>
      <p style={{ margin: 0, lineHeight: 1.6 }}>Permanently removes your profile, learnings, history, tenant link, tokens and snapshots.</p>
      {!sure ? <Button onClick={() => setSure(true)}>Delete my data…</Button>
        : <div className="row"><Button appearance="primary" style={{ background: "var(--crimson)" }} onClick={async () => { await api("/account", { method: "DELETE" }); await onDeleted().catch(() => undefined); location.href = import.meta.env.BASE_URL; }}>Yes, delete everything</Button><Button onClick={() => setSure(false)}>Cancel</Button></div>}
    </div>
  );
}
