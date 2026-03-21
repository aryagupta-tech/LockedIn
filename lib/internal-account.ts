/**
 * Staff / QA accounts that should not appear in public discovery (suggested profiles,
 * global feed to external members, public profile by URL).
 */
export function isInternalStaffEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  const e = email.trim().toLowerCase();
  const extra = process.env.LOCKEDIN_INTERNAL_EMAIL_DOMAINS?.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const domains = extra?.length ? extra : ["lockedin.dev"];
  const at = e.lastIndexOf("@");
  if (at < 0) return false;
  const domain = e.slice(at + 1);
  return domains.some((d) => domain === d);
}
