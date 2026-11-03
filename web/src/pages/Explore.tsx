import { useEffect, useState } from "react";
import { Badge, Input, MessageBar, MessageBarBody, Spinner } from "@fluentui/react-components";
import { Search20Regular } from "@fluentui/react-icons";
import { api, usd, type Insight, type Product } from "../api";
import { useAuth } from "../auth";

interface Detail { product: Product & { includes: string[]; overlaps: string[]; verify: boolean }; personalized: boolean; insights: Insight[]; source: { label: string; url: string } }

export function Explore({ onSignIn }: { onSignIn: () => void }) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [list, setList] = useState<Product[]>([]);
  const [sel, setSel] = useState<string>("m365-e5");
  const [d, setD] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => api<{ products: Product[] }>(`/products?q=${encodeURIComponent(q)}`).then((r) => setList(r.products)).catch(() => setList([])), 150); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setBusy(true); api<Detail>(`/products/${sel}`).then(setD).catch(() => setD(null)).finally(() => setBusy(false)); }, [sel, user?.id]);

  return (
    <div className="page"><div className="wrap">
      <div className="kicker">Product intelligence</div>
      <h1 style={{ marginTop: 10 }}>Type a licence. Understand it.</h1>
      <p className="lede">Search any Microsoft product, SKU or alias — "E5", "SPE_E3", "Copilot", "MACC" — to see what it includes, what it overlaps with, and how to avoid overpaying.</p>
      <div className="cols">
        <div className="stack">
          <Input value={q} onChange={(_, v) => setQ(v.value)} placeholder="Search products, SKUs, aliases…" contentBefore={<Search20Regular />} size="large" aria-label="Search products" />
          <div className="plist" role="list">
            {list.map((p) => (
              <button key={p.id} className="pitem" role="listitem" aria-current={p.id === sel} onClick={() => setSel(p.id)}>
                <b>{p.name}</b><small>{p.family}{p.listPriceUsd ? ` · ~$${p.listPriceUsd}/user/mo` : ""}</small>
              </button>
            ))}
            {!list.length && <div style={{ color: "#666" }}>No matches. Try "E3", "Copilot" or "Entra".</div>}
          </div>
        </div>
        <div className="panel">
          {busy && !d && <Spinner label="Loading…" />}
          {d && <>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div><div className="kicker" style={{ color: "#666" }}>{d.product.family}</div><h2 style={{ fontFamily: "var(--display)", fontSize: 40, margin: "6px 0 0" }}>{d.product.name}</h2></div>
              {d.product.listPriceUsd && <div style={{ textAlign: "right" }}><div style={{ fontFamily: "var(--display)", fontSize: 44, fontWeight: 900 }}>{usd(d.product.listPriceUsd)}</div><small>indicative list / user / month</small></div>}
            </div>
            <p style={{ lineHeight: 1.6, fontSize: 16 }}>{d.product.summary}</p>
            {d.personalized
              ? <MessageBar intent="success"><MessageBarBody>Tailored to your organisation profile.</MessageBarBody></MessageBar>
              : <MessageBar intent="info"><MessageBarBody>Generic insights. {user ? "Add details to your workspace profile" : <><a href="#" onClick={(e) => { e.preventDefault(); onSignIn(); }}>Sign in</a> and add your organisation details</>} for insights tailored to your situation.</MessageBarBody></MessageBar>}
            <h3 style={{ marginBottom: 6 }}>Includes</h3>
            <div className="row">{d.product.includes.map((i) => <Badge key={i} appearance="outline" size="large">{i}</Badge>)}</div>
            <h3 style={{ marginBottom: 0 }}>Insights</h3>
            <div>{d.insights.map((x, i) => (
              <div key={i} className={`ins ${x.level}`}><i /><div><h4>{x.title} <span className={`tag ${x.scope === "personalized" ? "pers" : ""}`}>{x.scope === "personalized" ? "For your org" : "Generic"}</span></h4><p>{x.detail}</p></div></div>
            ))}</div>
            <p style={{ fontSize: 12, color: "#555", marginTop: 18 }}>Source: <a href={d.source.url} target="_blank" rel="noreferrer">{d.source.label}</a>.{d.product.verify && <> <span className="tag warn">Verify</span> Seeded from curated knowledge — confirm price and terms against the source before quoting.</>}</p>
          </>}
        </div>
      </div>
    </div></div>
  );
}
