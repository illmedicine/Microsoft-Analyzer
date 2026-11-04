/**
 * Allowlist guard for AI-authored changes. Deterministic — it does not trust the agent to follow instructions.
 * Anything outside the allowlist (auth, tenant isolation, storage, workflows, infra, deps, tests, this guard) needs a human.
 */
const ALLOW: RegExp[] = [
  /^web\/src\/(pages|components)\//,
  /^web\/src\/(styles\.css|theme\.ts|static\.ts|App\.tsx)$/,
  /^server\/src\/knowledge\//,
  /^server\/src\/insights\.ts$/,
];
/** Denied even if they match the allowlist: the request pipeline must not be able to edit itself. */
const DENY: RegExp[] = [/RequestBox/i, /request/i, /guard/i, /gh(client)?\./i];
export const MAX_FILES = 30, MAX_CHANGED_LINES = 1500;

export function checkChange(files: string[], changedLines = 0) {
  const blocked = files.filter((f) => !ALLOW.some((r) => r.test(f)) || DENY.some((r) => r.test(f)));
  const reasons: string[] = [];
  if (blocked.length) reasons.push(`Touches protected or non-allowlisted paths: ${blocked.slice(0, 8).join(", ")}`);
  if (files.length > MAX_FILES) reasons.push(`Too many files (${files.length} > ${MAX_FILES})`);
  if (changedLines > MAX_CHANGED_LINES) reasons.push(`Too many changed lines (${changedLines} > ${MAX_CHANGED_LINES})`);
  if (!files.length) reasons.push("No changes were produced");
  return { ok: reasons.length === 0, reasons, blocked };
}
