import { useEffect, useState } from "react";
import { Button, Input, MessageBar, MessageBarBody, Select } from "@fluentui/react-components";
import { Add20Regular, Delete20Regular } from "@fluentui/react-icons";
import { api, usdFull, type Product, type WasteResult } from "../api";
import { useAuth } from "../auth";

interface Line { productId: string; purchased: string; assigned: string; active: string }
const blank = (): Line => ({ productId: "m365-e3", purchased: "", assigned: "", active: "" });

export function Waste({ onSignIn }: { onSignIn: () => void }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([{ productId: "m365-e5", purchased: "1000", assigned: "720", active: "610" }, { productId: "copilot-m365", purchased: "200", assigned: "90", active: "40" }, { productId: "ems-e3", purchased: "700", assigned: "698", active: "" }]);
  const [res, setRes] = useState<WasteResult | null>(null);
  const [src, setSrc] = useState<string>("");
  useEffect(() => { api<{ products: Product[] }>("/products?all=1").then((r) => setProducts([...r.products].sort((x, y) => x.name.localeCompare(y.name)))).catch(() => undefined); }, []);
  const n = (s: string) => (s.trim() === "" ? undefined : Math.max(0, Math.floor(Number(s))));
  async function run() {
    setSrc("manual");
    setRes(await api<WasteResult>("/waste", { method: "POST", body: { lines: lines.filter((l) => n(l.purchased)).map((l) => ({ productId: l.productId, name: products.find((p) => p.id === l.productId)?.name ?? l.productId, purchased: n(l.purchased) ?? 0, assigned: n(l.assigned) ?? 0, active: n(l.active) })) } }));
  }
  async function fromTenant() {
    try { const r = await api<{ snapshot: { tenantName: string; demo: boolean }; analysis: WasteResult }>("/tenant-waste"); setRes(r.analysis); setSrc(`${r.snapshot.tenantName}${r.snapshot.demo ? " (sample data)" : ""}`); } catch { setSrc("none"); }
  }
  const upd = (i: number, k: keyof Line, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  return (
    <div className="page"><div className="wrap">
      <div className="kicker">Licence waste</div>
      <h1 style={{ marginTop: 10 }}>Find the seats you're paying for and not using.</h1>
      <p className="lede">Enter purchased vs assigned (and optionally active) quantities, or pull them from your connected tenant. Costs use indicative list prices.</p>
      <div className="panel">
        <table className="t">
          <thead><tr><th>Product</th><th className="n">Purchased</th><th className="n">Assigned</th><th className="n">Active (optional)</th><th /></tr></thead>
          <tbody>{lines.map((l, i) => (
            <tr key={i}>
              <td><Select value={l.productId} onChange={(_, d) => upd(i, "productId", d.value)} aria-label="Product">{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></td>
              <td><Input type="number" value={l.purchased} onChange={(_, d) => upd(i, "purchased", d.value)} aria-label="Purchased" /></td>
              <td><Input type="number" value={l.assigned} onChange={(_, d) => upd(i, "assigned", d.value)} aria-label="Assigned" /></td>
              <td><Input type="number" value={l.active} onChange={(_, d) => upd(i, "active", d.value)} aria-label="Active" /></td>
              <td><Button appearance="subtle" icon={<Delete20Regular />} aria-label="Remove line" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} /></td>
            </tr>))}</tbody>
        </table>
        <div className="row" style={{ marginTop: 16 }}>
          <Button icon={<Add20Regular />} onClick={() => setLines((l) => [...l, blank()])}>Add line</Button>
          <Button appearance="primary" onClick={run}>Calculate waste</Button>
          {user ? <Button onClick={fromTenant}>Use my tenant data</Button> : <Button onClick={onSignIn}>Sign in to use tenant data</Button>}
        </div>
        {src === "none" && <MessageBar intent="warning" style={{ marginTop: 12 }}><MessageBarBody>No tenant data yet — connect a tenant (or load the sample) in your workspace.</MessageBarBody></MessageBar>}
      </div>
      {res && <div className="stack" style={{ marginTop: 28 }}>
        {src && src !== "manual" && src !== "none" && <MessageBar intent="info"><MessageBarBody>Source: {src}</MessageBarBody></MessageBar>}
        <div className="kpi"><div><b>{usdFull(res.totalAnnualCost)}</b><span>Annual cost of these licences</span></div><div><b style={{ color: "var(--crimson)" }}>{usdFull(res.totalAnnualWaste)}</b><span>Estimated annual waste</span></div><div><b>{(res.wastePct * 100).toFixed(1)}%</b><span>Of spend wasted</span></div></div>
        <div className="panel"><table className="t"><thead><tr><th>Product</th><th className="n">Purchased</th><th className="n">Unassigned</th><th className="n">Inactive</th><th className="n">Waste %</th><th className="n">Annual waste</th></tr></thead>
          <tbody>{res.rows.map((r, i) => <tr key={i}><td>{r.name}</td><td className="n">{r.purchased.toLocaleString()}</td><td className="n">{r.unassigned.toLocaleString()}</td><td className="n">{r.inactive.toLocaleString()}</td><td className="n">{(r.wastePct * 100).toFixed(0)}%</td><td className="n"><b>{usdFull(r.annualWaste)}</b></td></tr>)}</tbody></table></div>
        {res.duplicates.length > 0 && <MessageBar intent="warning"><MessageBarBody><b>Possible duplicate coverage:</b> {res.duplicates.map((d) => `${d.product} (already covered by ${d.coveredBy})`).join("; ")}. Verify per-user assignment before renewing.</MessageBarBody></MessageBar>}
        <small style={{ color: "#555" }}>{res.caveat}</small>
      </div>}
    </div></div>
  );
}
