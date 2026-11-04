// UI test of the Request-to-Release box with GitHub MOCKED (never touches the real repo). node scripts/smoke-request-flow.cjs <base-url>
const { chromium } = require("playwright");
const base = (process.argv[2] || "http://localhost:4173/").replace(/\/?$/, "/");
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  const calls = []; let labels = ["ai-request"], state = "open", comments = [], body = "";
  await p.route("https://api.github.com/**", async (route) => {
    const req = route.request(), url = new URL(req.url()), m = req.method(), path = url.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, "");
    calls.push(`${m} ${path}`); const json = (o, s = 200) => route.fulfill({ status: s, contentType: "application/json", body: JSON.stringify(o) });
    const issue = () => ({ number: 7, title: "Request: share the analysis", state, html_url: "https://github.com/x/y/issues/7", labels: labels.map((name) => ({ name })), body });
    if (m === "POST" && path === "/issues") { const d = req.postDataJSON(); body = d.body; labels = d.labels; if (!d.body.includes("> ") || d.body.includes("<script")) return json({}, 422); return json(issue(), 201); }
    if (m === "GET" && path === "/issues/7") return json(issue());
    if (m === "GET" && path.startsWith("/issues/7/comments")) return json(comments);
    if (m === "POST" && path === "/issues/7/labels") { labels = [...labels, ...req.postDataJSON().labels]; return json(labels.map((name) => ({ name }))); }
    if (m === "PATCH" && path === "/issues/7") { state = req.postDataJSON().state; return json(issue()); }
    return json({}, 404);
  });
  const results = []; const step = async (n, f) => { try { await f(); results.push(["PASS", n]); } catch (e) { results.push(["FAIL", n + " — " + e.message.split("\n")[0]]); } };
  const see = (t) => p.getByText(t, { exact: false }).first().waitFor({ timeout: 8000 });
  await p.goto(base + "advisor"); await p.waitForLoadState("networkidle");
  await step("box opens with screen context", async () => { await p.getByRole("button", { name: "Suggest an improvement" }).click(); await see("You're on"); await see("/advisor"); });
  await step("send disabled until token + enough text", async () => { if (!(await p.getByRole("button", { name: "Send" }).isDisabled())) throw new Error("Send enabled too early"); });
  await step("owner token + text enables send", async () => { await p.getByPlaceholder("github_pat_…").fill("github_pat_test_token_value_123"); await p.getByRole("button", { name: "Connect" }).click(); await p.getByLabel("Your request").fill("I need to share the renewal analysis with procurement so we can agree a proposal <script>x</script>"); await p.getByRole("button", { name: "Send" }).click(); await see("share the analysis"); });
  await step("issue created sanitised, quoted, labelled ai-request", async () => { if (!calls.includes("POST /issues")) throw new Error("no create call"); if (!labels.includes("ai-request")) throw new Error("label missing"); });
  await step("status → live shows summary + what to test", async () => {
    labels = ["ai-request", "ai-live"]; comments = [{ body: "<!-- ma365-summary -->\n### What changed\n- Added a share option\n### What to test\n- Open the advisor and press Share\n<!-- ma365-commit:abcdef123456 -->" }];
    await p.reload(); await p.waitForLoadState("networkidle"); await p.getByRole("button", { name: "Suggest an improvement" }).click(); await see("Live — try it"); await see("What to test"); await see("press Share");
  });
  await step("Revert it labels the issue for the revert workflow", async () => { await p.getByRole("button", { name: "Revert it" }).click(); await p.waitForTimeout(500); if (!labels.includes("revert")) throw new Error("revert label not applied"); await see("Reverting"); });
  await step("Keep it labels + closes", async () => { labels = ["ai-request", "ai-live"]; state = "open"; await p.reload(); await p.waitForLoadState("networkidle"); await p.getByRole("button", { name: "Suggest an improvement" }).click(); await see("Live — try it"); await p.getByRole("button", { name: "Keep it" }).click(); await p.waitForTimeout(500); if (!labels.includes("kept") || state !== "closed") throw new Error("not kept/closed"); });
  for (const [s, n] of results) console.log(s, n);
  await b.close(); process.exit(results.some((r) => r[0] === "FAIL") ? 1 : 0);
})();
