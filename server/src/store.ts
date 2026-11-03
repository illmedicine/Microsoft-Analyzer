import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

/**
 * Minimal durable store (JSON file, atomic writes). Swap for Postgres/Cosmos in production —
 * the important part is the *shape*: every piece of customer data hangs off a userId and is
 * only reachable through `scope(userId)`, where userId comes from the verified session, never from the client.
 */
import type { Profile, HistoryItem, TenantSku, TenantSnapshot, TenantLink } from "./types.js";
export type { Profile, HistoryItem, TenantSku, TenantSnapshot, TenantLink } from "./types.js";
export interface UserRecord {
  id: string; googleSub: string; email: string; name: string; picture?: string; createdAt: string;
  profile: Profile; history: HistoryItem[]; tenant?: TenantLink; snapshot?: TenantSnapshot;
}
interface Session { idHash: string; userId: string; expiresAt: number }
interface PendingConnect { stateHash: string; userId: string; sessionHash: string; verifier: string; expiresAt: number }
interface DB {
  users: Record<string, UserRecord>;
  bySub: Record<string, string>;
  tenantOwners: Record<string, string>; // tenantId -> userId : a tenant can belong to exactly one MA-365 account
  sessions: Record<string, Session>;
  pending: Record<string, PendingConnect>;
}

const file = path.join(config.dataDir, "db.json");
let db: DB = { users: {}, bySub: {}, tenantOwners: {}, sessions: {}, pending: {} };
try { db = { ...db, ...JSON.parse(fs.readFileSync(file, "utf8")) }; } catch { /* first run */ }

let t: NodeJS.Timeout | undefined;
function persist() {
  clearTimeout(t);
  t = setTimeout(() => {
    fs.mkdirSync(config.dataDir, { recursive: true });
    const tmp = file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 });
    fs.renameSync(tmp, file);
  }, 50);
}

export const emptyProfile = (): Profile => ({ priorities: [], learnings: [] });

export function upsertGoogleUser(g: { sub: string; email: string; name: string; picture?: string }): UserRecord {
  const existing = db.bySub[g.sub] && db.users[db.bySub[g.sub]!];
  if (existing) { existing.email = g.email; existing.name = g.name; existing.picture = g.picture; persist(); return existing; }
  const id = crypto.randomUUID();
  const u: UserRecord = { id, googleSub: g.sub, email: g.email, name: g.name, picture: g.picture, createdAt: new Date().toISOString(), profile: emptyProfile(), history: [] };
  db.users[id] = u; db.bySub[g.sub] = id; persist();
  return u;
}

export const sessions = {
  create(idHash: string, userId: string, ttlMs: number) { db.sessions[idHash] = { idHash, userId, expiresAt: Date.now() + ttlMs }; persist(); },
  userIdFor(idHash: string): string | undefined {
    const s = db.sessions[idHash];
    if (!s) return;
    if (s.expiresAt < Date.now()) { delete db.sessions[idHash]; persist(); return; }
    return s.userId;
  },
  destroy(idHash: string) { delete db.sessions[idHash]; persist(); },
};

export const pending = {
  put(p: PendingConnect) {
    for (const [k, v] of Object.entries(db.pending)) if (v.expiresAt < Date.now()) delete db.pending[k];
    db.pending[p.stateHash] = p; persist();
  },
  /** single-use */
  take(stateHash: string): PendingConnect | undefined {
    const p = db.pending[stateHash]; if (!p) return;
    delete db.pending[stateHash]; persist();
    return p.expiresAt < Date.now() ? undefined : p;
  },
};

/** The only door to customer data. Every method is implicitly filtered to one user. */
export function scope(userId: string) {
  const u = db.users[userId];
  if (!u) throw new Error("unknown user");
  return {
    get user() { return u; },
    setProfile(p: Profile) { u.profile = p; persist(); },
    addHistory(item: Omit<HistoryItem, "id" | "at">) {
      u.history.unshift({ ...item, id: crypto.randomUUID(), at: new Date().toISOString() });
      u.history = u.history.slice(0, 100); persist();
    },
    clearHistory() { u.history = []; persist(); },
    /** Returns false if another MA-365 account already owns this tenant. */
    linkTenant(link: TenantLink): boolean {
      if (!link.demo) {
        const owner = db.tenantOwners[link.tenantId];
        if (owner && owner !== userId) return false;
        db.tenantOwners[link.tenantId] = userId;
      }
      u.tenant = link; persist(); return true;
    },
    setSnapshot(s: TenantSnapshot) { u.snapshot = s; persist(); },
    unlinkTenant() {
      if (u.tenant && !u.tenant.demo && db.tenantOwners[u.tenant.tenantId] === userId) delete db.tenantOwners[u.tenant.tenantId];
      delete u.tenant; delete u.snapshot; persist();
    },
    deleteAccount() {
      this.unlinkTenant();
      for (const [k, s] of Object.entries(db.sessions)) if (s.userId === userId) delete db.sessions[k];
      delete db.bySub[u.googleSub]; delete db.users[userId]; persist();
    },
  };
}
export type UserScope = ReturnType<typeof scope>;
