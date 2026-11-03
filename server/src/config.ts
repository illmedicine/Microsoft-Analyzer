import crypto from "node:crypto";

const env = process.env;
export const config = {
  port: Number(env.PORT ?? 8787),
  publicUrl: (env.PUBLIC_URL ?? "http://localhost:5173").replace(/\/$/, ""),
  /** Public URL of the API/app (used for the Microsoft OAuth redirect URI). */
  apiUrl: (env.API_URL ?? env.PUBLIC_URL ?? "http://localhost:5173").replace(/\/$/, ""),
  /** Browser origins allowed to call the API with credentials (e.g. the GitHub Pages site). */
  allowedOrigins: [env.PUBLIC_URL ?? "http://localhost:5173", ...(env.ALLOWED_ORIGINS ?? "").split(",")].map((o) => o.trim()).filter(Boolean).map((o) => new URL(o).origin),
  /** Cookie SameSite=None for a static frontend on another site (GitHub Pages). Requires HTTPS. */
  crossSite: env.CROSS_SITE === "1",
  isProd: env.NODE_ENV === "production",
  googleClientId: env.GOOGLE_CLIENT_ID ?? "",
  msClientId: env.MS_CLIENT_ID ?? "",
  msClientSecret: env.MS_CLIENT_SECRET ?? "",
  allowDevLogin: env.ALLOW_DEV_LOGIN === "1" && env.NODE_ENV !== "production",
  dataDir: env.DATA_DIR ?? new URL("../data", import.meta.url).pathname,
  // Encryption key for secrets at rest. In production a missing key is fatal.
  encKey: (() => {
    if (env.TOKEN_ENC_KEY) {
      const k = Buffer.from(env.TOKEN_ENC_KEY, "base64");
      if (k.length !== 32) throw new Error("TOKEN_ENC_KEY must be 32 bytes, base64-encoded");
      return k;
    }
    if (env.NODE_ENV === "production") throw new Error("TOKEN_ENC_KEY is required in production");
    console.warn("[config] TOKEN_ENC_KEY not set — using an ephemeral dev key (tenant tokens won't survive restart)");
    return crypto.randomBytes(32);
  })(),
};
export const tenantConnectEnabled = () => Boolean(config.msClientId && config.msClientSecret);
