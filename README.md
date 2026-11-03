# MA-365

AI-style insights for Microsoft licences, spend, contracts and renewals. Fluent UI 9 + React frontend, Express API.

* **Signed out:** full tool, generic insights. **Signed in (Google SSO):** saved history, organisation profile/learnings, tailored insights, tenant connect.
* **Tenant isolation:** tenant links are created only through a one-time, session-bound OAuth state; a real tenant ID can belong to one account; refresh tokens are AES-256-GCM sealed with the owner's ID as AAD; no route accepts a user/tenant ID from the client. See `server/src/tenant.ts` and `server/src/isolation.test.ts`.

## Run locally
```bash
npm install
cp .env.example .env   # fill in values, or set ALLOW_DEV_LOGIN=1 for local-only sign-in
ALLOW_DEV_LOGIN=1 MA365_START=1 npx tsx server/src/index.ts &   # API on :8787
npm run dev -w web                                              # UI on :5173
npm test
```

## Azure (Container Apps) — subscription `4e9c29ed-dab9-424c-b2fd-67da06d22736`
```bash
az login --tenant IllyRobotic.onmicrosoft.com
GOOGLE_CLIENT_ID=<web client id> ALLOWED_ORIGINS=https://illmedicine.github.io ./infra/deploy.sh
```
Creates ACR, Log Analytics, Container Apps env, an Azure Files volume for `/data`, and the app (1 replica). Then add the printed URL to your Google OAuth client's *Authorized JavaScript origins*, and (for tenant connect) register an Entra app with redirect URI `<url>/api/tenant/callback` and pass `MS_CLIENT_ID`/`MS_CLIENT_SECRET`. **Save the printed `TOKEN_ENC_KEY`** and reuse it on redeploys.

## GitHub Pages
Repo → Settings → Pages → Source: **GitHub Actions**. Set repo variable `API_BASE_URL` to the Azure URL. The workflow `.github/workflows/pages.yml` publishes on push to `main`. The Pages site calls the Azure API cross-site (CORS + `SameSite=None` cookies, enabled by `ALLOWED_ORIGINS`).

## Knowledge base
`server/src/knowledge/*` is curated seed data with source links and a `verify` flag. Prices and terms are indicative — validate against Microsoft's published Product Terms / price lists before quoting. Savings/waste benchmarks in `server/src/insights.ts` are illustrative placeholders.

## Static mode & smoke test
The GitHub Pages build runs the public toolset **in the browser** (same knowledge base and engines as the server, imported from `server/src`) whenever the repo variable `API_BASE_URL` is unset. Sign-in, saved history and tenant data need the hosted service.
Validate any deployment in a real browser: `NODE_PATH=$(npm root -g) node scripts/smoke.cjs https://illmedicine.github.io/Microsoft-Analyzer/`
