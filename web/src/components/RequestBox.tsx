import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Badge, Button, Field, Input, MessageBar, MessageBarBody, Spinner, Textarea } from "@fluentui/react-components";
import { Mic20Filled, Dismiss20Regular, LightbulbFilament20Regular } from "@fluentui/react-icons";
import { useAuth } from "../auth";
import { getToken, requests, requestsMode, setToken, type Req } from "../requests/client";

const KEY = "ma365.requests";
const load = (): number[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };
const save = (ids: number[]) => { try { localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 20))); } catch { /* ignore */ } };
const LABEL: Record<Req["status"], [string, "informative" | "success" | "danger" | "warning" | "subtle"]> = {
  queued: ["Queued", "informative"], "needs-triage": ["Waiting for review", "warning"], building: ["Building…", "informative"], live: ["Live — try it", "success"],
  failed: ["Didn't complete", "danger"], blocked: ["Needs a human", "warning"], kept: ["Kept", "success"], reverting: ["Reverting…", "informative"], reverted: ["Reverted", "subtle"],
};
const done = (s: Req["status"]) => s === "kept" || s === "reverted";

/** Minimal markdown → React (headings, bullets, paragraphs). No HTML injection. */
function Summary({ text }: { text: string }) {
  return <div style={{ fontSize: 14, lineHeight: 1.5 }}>{text.split("\n").map((l, i) => l.startsWith("### ") ? <h4 key={i} style={{ margin: "10px 0 4px" }}>{l.slice(4)}</h4> : /^[-*] /.test(l) ? <div key={i} style={{ paddingLeft: 14, textIndent: -10 }}>• {l.slice(2).replace(/\*\*/g, "")}</div> : l.trim() ? <p key={i} style={{ margin: "6px 0" }}>{l.replace(/\*\*/g, "")}</p> : null)}</div>;
}

export function RequestBox() {
  const { user } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ids, setIds] = useState<number[]>(load);
  const [items, setItems] = useState<Record<number, Req>>({});
  const [listening, setListening] = useState(false);
  const [spoke, setSpoke] = useState(false);
  const [tok, setTok] = useState(getToken());
  const [tokInput, setTokInput] = useState("");
  const rec = useRef<any>(null);
  const mode = requestsMode();
  const SR = typeof window !== "undefined" ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) : undefined;
  const canSubmit = mode === "owner" ? !!tok : !!user;

  const refresh = useCallback(async () => {
    const next: Record<number, Req> = {};
    await Promise.all(ids.map(async (n) => { try { next[n] = await requests.get(n); } catch { /* keep old */ } }));
    setItems((p) => ({ ...p, ...next }));
  }, [ids]);
  useEffect(() => { if (!open || !ids.length) return; void refresh(); const t = setInterval(() => { if (ids.some((n) => !done(items[n]?.status ?? "queued"))) void refresh(); }, 15000); return () => clearInterval(t); }, [open, ids, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMic() {
    if (!SR) return;
    if (listening) { rec.current?.stop(); return; }
    const r = new SR(); r.lang = navigator.language || "en-US"; r.interimResults = true; r.continuous = false;
    const base = text ? text.trimEnd() + " " : "";
    r.onresult = (e: any) => { let s = ""; for (const x of e.results) s += x[0].transcript; setText(base + s); setSpoke(true); };
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    rec.current = r; setListening(true); r.start();
  }
  async function submit() {
    setBusy(true); setErr("");
    try {
      const n = await requests.create(text, { route: loc.pathname, title: document.title, speech: spoke });
      const next = [n, ...ids]; setIds(next); save(next); setText(""); setSpoke(false); await refresh();
    } catch (e) { const m = (e as Error).message; setErr(m === "too_short" ? "Please describe what you're trying to achieve in a sentence or two." : m.startsWith("github_4") ? "GitHub rejected the request. Check the token (needs Issues: read & write on this repo)." : "Couldn't send that. Please try again."); }
    finally { setBusy(false); }
  }
  async function verdict(n: number, v: "keep" | "revert") { try { await requests.verdict(n, v); setItems((p) => ({ ...p, [n]: { ...p[n]!, status: v === "keep" ? "kept" : "reverting" } })); } catch { setErr("Couldn't record that. Please try again."); } }

  return (
    <>
      {!open && <button className="rq-fab" onClick={() => setOpen(true)} aria-label="Suggest an improvement"><LightbulbFilament20Regular /> Suggest an improvement</button>}
      {open && (
        <aside className="rq-panel" role="dialog" aria-label="Suggest an improvement">
          <header><b>Suggest an improvement</b><button onClick={() => setOpen(false)} aria-label="Close"><Dismiss20Regular /></button></header>
          <div className="rq-body">
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#444" }}>You're on <b>{loc.pathname === "/" ? "Home" : loc.pathname}</b>. Describe what you're trying to achieve and why — not how it should look. We'll build it, put it live, and tell you what to test.</p>
            {mode === "owner" && !tok && (
              <Field label="Product-owner GitHub token" hint="Fine-grained token, this repo only, Issues: read & write. Stored in this browser only." style={{ marginBottom: 8 }}>
                <div className="row" style={{ flexWrap: "nowrap" }}>
                  <Input type="password" value={tokInput} onChange={(_, d) => setTokInput(d.value)} placeholder="github_pat_…" style={{ flex: 1 }} />
                  <Button disabled={tokInput.trim().length < 20} onClick={() => { setToken(tokInput.trim()); setTok(tokInput.trim()); setTokInput(""); }}>Connect</Button>
                </div>
              </Field>
            )}
            {mode === "hosted" && !user && <MessageBar intent="info"><MessageBarBody>Sign in to send requests.</MessageBarBody></MessageBar>}
            <Textarea value={text} onChange={(_, d) => setText(d.value)} rows={4} placeholder="e.g. As a finance analyst, I need to share the renewal analysis with procurement so we can agree the proposal." aria-label="Your request" style={{ width: "100%" }} maxLength={2000} />
            <div className="row" style={{ marginTop: 8 }}>
              <Button appearance="primary" disabled={!canSubmit || busy || text.trim().length < 10} onClick={submit}>{busy ? <Spinner size="tiny" /> : "Send"}</Button>
              {SR && <Button icon={<Mic20Filled />} onClick={toggleMic} appearance={listening ? "primary" : "secondary"} aria-pressed={listening}>{listening ? "Listening… tap to stop" : "Speak"}</Button>}
              {mode === "owner" && tok && <Button appearance="subtle" onClick={() => { setToken(""); setTok(""); }}>Disconnect</Button>}
            </div>
            {SR && <small style={{ color: "#666" }}>Speech is transcribed by your browser's speech service.</small>}
            {err && <MessageBar intent="error" style={{ marginTop: 8 }}><MessageBarBody>{err}</MessageBarBody></MessageBar>}
            {ids.length > 0 && <h4 style={{ margin: "16px 0 6px" }}>Your requests</h4>}
            {ids.map((n) => { const it = items[n]; const [lab, col] = LABEL[it?.status ?? "queued"]; return (
              <div key={n} className="rq-item">
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 14 }}>{it?.title ?? `Request #${n}`}</b><Badge appearance="filled" color={col === "success" ? "success" : col === "danger" ? "danger" : col === "warning" ? "warning" : col === "subtle" ? "subtle" : "informative"}>{lab}</Badge></div>
                {it?.summary && <Summary text={it.summary} />}
                {it?.status === "live" && <div className="row" style={{ marginTop: 8 }}><Button appearance="primary" onClick={() => verdict(n, "keep")}>Keep it</Button><Button onClick={() => verdict(n, "revert")}>Revert it</Button></div>}
                {it && <a href={it.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>View details</a>}
              </div>); })}
          </div>
        </aside>
      )}
    </>
  );
}
