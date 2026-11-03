import type { NextFunction, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { config } from "./config.js";
import { randomToken, sha256 } from "./crypto.js";
import { scope, sessions, upsertGoogleUser, type UserScope } from "./store.js";

const COOKIE = config.isProd && !config.crossSite ? "__Host-ma365_sid" : "ma365_sid";
const SS = config.crossSite ? "None" : "Lax";
const TTL = 1000 * 60 * 60 * 24 * 14;
const google = new OAuth2Client();

declare module "express-serve-static-core" { interface Request { sid?: string; me?: UserScope } }

function readCookie(req: Request, name: string) {
  const raw = req.headers.cookie; if (!raw) return;
  for (const part of raw.split(";")) { const i = part.indexOf("="); if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim()); }
}
export function setSessionCookie(res: Response, userId: string) {
  const sid = randomToken(32);
  sessions.create(sha256(sid), userId, TTL);
  res.append("Set-Cookie", `${COOKIE}=${sid}; Path=/; HttpOnly; SameSite=${SS}; Max-Age=${TTL / 1000}${config.isProd || config.crossSite ? "; Secure" : ""}`);
}
export const clearSessionCookie = (res: Response) => res.append("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=${SS}; Max-Age=0${config.isProd || config.crossSite ? "; Secure" : ""}`);

/** Resolves the session (if any). `req.me` is the ONLY source of "who is this" for all customer-data routes. */
export function loadSession(req: Request, _res: Response, next: NextFunction) {
  const sid = readCookie(req, COOKIE);
  if (sid) {
    const hash = sha256(sid); const userId = sessions.userIdFor(hash);
    if (userId) { try { req.me = scope(userId); req.sid = hash; } catch { sessions.destroy(hash); } }
  }
  next();
}
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.me) return void res.status(401).json({ error: "sign_in_required" });
  next();
}

/** CSRF defence for cookie-authenticated, state-changing calls. */
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !config.allowedOrigins.includes(origin)) return void res.status(403).json({ error: "bad_origin" });
  if (req.headers["x-ma365"] !== "1") return void res.status(403).json({ error: "missing_csrf_header" });
  next();
}

export const publicUser = (me: UserScope) => { const u = me.user; return { id: u.id, email: u.email, name: u.name, picture: u.picture }; };

export async function googleLogin(req: Request, res: Response) {
  const credential = typeof req.body?.credential === "string" ? req.body.credential : "";
  if (!config.googleClientId) return void res.status(503).json({ error: "google_not_configured" });
  try {
    const ticket = await google.verifyIdToken({ idToken: credential, audience: config.googleClientId });
    const p = ticket.getPayload();
    if (!p?.sub || !p.email || !p.email_verified) return void res.status(401).json({ error: "unverified_google_account" });
    const user = upsertGoogleUser({ sub: p.sub, email: p.email, name: p.name ?? p.email, picture: p.picture });
    setSessionCookie(res, user.id);
    res.json({ user: publicUser(scope(user.id)) });
  } catch { res.status(401).json({ error: "invalid_google_token" }); }
}

/** Dev-only; the route is not even registered unless ALLOW_DEV_LOGIN=1 and NODE_ENV!=production. */
export function devLogin(req: Request, res: Response) {
  const email = typeof req.body?.email === "string" && /^[^@\s]+@[^@\s]+$/.test(req.body.email) ? req.body.email : "dev@example.com";
  const user = upsertGoogleUser({ sub: `dev:${email}`, email, name: email.split("@")[0]! });
  setSessionCookie(res, user.id);
  res.json({ user: publicUser(scope(user.id)) });
}
