import { api, STATIC_MODE } from "../api";
import { buildIssue, extractSummary, LABELS, MARKERS, parseStatus, type RequestContext, type RequestStatus } from "../../../server/src/requests-core";

export const REPO: string = import.meta.env.VITE_GH_REPO ?? "illmedicine/Microsoft-Analyzer";
const TOKEN_KEY = "ma365.ghtoken";
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) ?? ""; } catch { return ""; } };
export const setToken = (t: string) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } };

export interface Req { number: number; status: RequestStatus; title: string; summary?: string; url: string }

/** Owner mode: talks to GitHub directly with a repo-scoped fine-grained token the product owner pastes into their own browser. */
async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = getToken();
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { ...init, headers: { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", ...(t ? { authorization: `Bearer ${t}` } : {}), ...(init.body ? { "content-type": "application/json" } : {}) } });
  if (!r.ok) throw new Error(`github_${r.status}`);
  return (r.status === 204 ? undefined : await r.json()) as T;
}
interface GhIssue { number: number; title: string; state: "open" | "closed"; html_url: string; labels: { name: string }[] }

const direct = {
  async create(text: string, ctx: RequestContext) {
    const i = buildIssue(text, ctx, { autoBuild: true });          // owner mode = the owner is the human triage
    return (await gh<GhIssue>("/issues", { method: "POST", body: JSON.stringify(i) })).number;
  },
  async get(n: number): Promise<Req> {
    const [i, c] = await Promise.all([gh<GhIssue>(`/issues/${n}`), gh<{ body: string }[]>(`/issues/${n}/comments?per_page=100`)]);
    return { number: n, title: i.title.replace(/^Request: /, ""), url: i.html_url, status: parseStatus(i.labels.map((l) => l.name), i.state), summary: extractSummary(c).summary };
  },
  async verdict(n: number, v: "keep" | "revert") {
    await gh(`/issues/${n}/labels`, { method: "POST", body: JSON.stringify({ labels: [v === "keep" ? LABELS.keep : LABELS.revert] }) });
    if (v === "keep") await gh(`/issues/${n}`, { method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: "completed" }) });
  },
};
const hosted = {
  create: async (text: string, ctx: RequestContext) => (await api<{ number: number }>("/requests", { method: "POST", body: { text, ctx } })).number,
  get: (n: number) => api<Req>(`/requests/${n}`),
  verdict: async (n: number, v: "keep" | "revert") => { await api(`/requests/${n}/verdict`, { method: "POST", body: { verdict: v } }); },
};

/** Static (Pages) build → owner mode via GitHub token; hosted build → authenticated API. */
export const requestsMode = (): "owner" | "hosted" => (STATIC_MODE || getToken() ? "owner" : "hosted");
export const requests = { create: (t: string, c: RequestContext) => (requestsMode() === "owner" ? direct : hosted).create(t, c), get: (n: number) => (requestsMode() === "owner" ? direct : hosted).get(n), verdict: (n: number, v: "keep" | "revert") => (requestsMode() === "owner" ? direct : hosted).verdict(n, v) };
export { MARKERS };
