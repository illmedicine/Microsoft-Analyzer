import { useEffect, useState } from "react";
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Input } from "@fluentui/react-components";
import { Search20Regular } from "@fluentui/react-icons";
import { api, type Term } from "../api";

export function Terms() {
  const [q, setQ] = useState("");
  const [terms, setTerms] = useState<Term[]>([]);
  const [src, setSrc] = useState<Record<string, { label: string; url: string }>>({});
  useEffect(() => { const t = setTimeout(() => api<{ terms: Term[]; sources: typeof src }>(`/terms?q=${encodeURIComponent(q)}`).then((r) => { setTerms(r.terms); setSrc(r.sources); }), 120); return () => clearTimeout(t); }, [q]);
  return (
    <div className="page"><div className="wrap">
      <div className="kicker">Contract intelligence</div>
      <h1 style={{ marginTop: 10 }}>The terms that decide what you pay.</h1>
      <p className="lede">EDE hours, true-up, price protection, MACC and more — what each means, why it matters, and what to ask for.</p>
      <div style={{ maxWidth: 520, marginBottom: 20 }}><Input value={q} onChange={(_, d) => setQ(d.value)} placeholder="Search terms: EDE, true-up, MACC…" contentBefore={<Search20Regular />} size="large" aria-label="Search terms" /></div>
      <Accordion collapsible multiple defaultOpenItems={["ede"]}>
        {terms.map((t) => (
          <AccordionItem key={t.id} value={t.id}>
            <AccordionHeader size="large"><b>{t.term}</b>{t.abbr && <span className="tag" style={{ marginLeft: 10 }}>{t.abbr}</span>}<span className="tag pers" style={{ marginLeft: 8 }}>{t.category}</span></AccordionHeader>
            <AccordionPanel>
              <div className="stack" style={{ padding: "8px 0 20px", maxWidth: 900 }}>
                <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6 }}>{t.plain}</p>
                <div className="ins warn"><i /><div><h4>Why it matters</h4><p>{t.whyItMatters}</p></div></div>
                <div className="ins save"><i /><div><h4>Your lever</h4><p>{t.lever}</p></div></div>
                <div><b>Ask for:</b><ul style={{ lineHeight: 1.7 }}>{t.askFor.map((a) => <li key={a}>{a}</li>)}</ul></div>
                <small style={{ color: "#555" }}>Source: {src[t.source] ? <a href={src[t.source]!.url} target="_blank" rel="noreferrer">{src[t.source]!.label}</a> : t.source}. <span className="tag warn">Verify</span> Confirm against your agreement and current Microsoft documentation.</small>
              </div>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
      {!terms.length && <p>No matching terms.</p>}
    </div></div>
  );
}
