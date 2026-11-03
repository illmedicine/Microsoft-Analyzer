import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, type Benchmarks } from "./api";

export interface User { id: string; email: string; name: string; picture?: string }
interface Cfg { googleClientId: string; devLogin: boolean; tenantConnect: boolean; benchmarks: Benchmarks }
interface Ctx { user: User | null; loading: boolean; cfg: Cfg | null; signedIn: (u: User) => void; signOut: () => Promise<void> }
const C = createContext<Ctx>(null!);
export const useAuth = () => useContext(C);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([api<Cfg>("/config").then(setCfg), api<{ user: User | null }>("/me").then((r) => setUser(r.user))]).catch(() => undefined).finally(() => setLoading(false));
  }, []);
  const signOut = useCallback(async () => { await api("/auth/logout", { method: "POST" }); setUser(null); }, []);
  return <C.Provider value={{ user, loading, cfg, signedIn: setUser, signOut }}>{children}</C.Provider>;
}

declare global { interface Window { google?: any } }
export function GoogleButton({ onDone }: { onDone?: () => void }) {
  const { cfg, signedIn } = useAuth();
  const host = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!cfg?.googleClientId) return;
    const init = () => {
      window.google.accounts.id.initialize({ client_id: cfg.googleClientId, ux_mode: "popup", callback: async (resp: { credential: string }) => {
        try { const r = await api<{ user: User }>("/auth/google", { method: "POST", body: { credential: resp.credential } }); signedIn(r.user); onDone?.(); } catch { setErr("Google sign-in failed. Please try again."); }
      } });
      if (host.current) window.google.accounts.id.renderButton(host.current, { theme: "filled_black", size: "large", shape: "rectangular", text: "continue_with", logo_alignment: "left", width: 280 });
    };
    if (window.google?.accounts) return init();
    const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = init; document.head.appendChild(s);
  }, [cfg?.googleClientId]);
  if (!cfg) return null;
  if (!cfg.googleClientId && !cfg.devLogin) return <span style={{ fontSize: 12, opacity: 0.7 }}>Google sign-in isn't configured on this server.</span>;
  return (
    <div>
      {cfg.googleClientId && <div ref={host} />}
      {cfg.devLogin && <DevLogin onDone={onDone} />}
      {err && <div role="alert" style={{ color: "#B3202A", fontSize: 12, marginTop: 6 }}>{err}</div>}
    </div>
  );
}
function DevLogin({ onDone }: { onDone?: () => void }) {
  const { signedIn } = useAuth();
  return <button className="devlogin" onClick={async () => { const r = await api<{ user: User }>("/auth/dev", { method: "POST", body: { email: "dev@example.com" } }); signedIn(r.user); onDone?.(); }}>Dev sign-in (local only)</button>;
}
