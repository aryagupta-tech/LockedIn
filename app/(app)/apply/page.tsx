"use client";

import { useEffect, useState } from "react";
import { Loader2, Send, FileCheck, AlertCircle, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type Application, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  normalizeCodeforcesHandle,
  normalizeLeetCodeHandle,
} from "@/lib/platform-handles";

function hintForApplyError(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  switch (err.code) {
    case "LEETCODE_GITHUB_NOT_LINKED":
      return "On LeetCode: Profile (avatar) → Settings → add the GitHub field with the same account you used to sign in to LockedIn.";
    case "LEETCODE_GITHUB_MISMATCH":
      return "The GitHub URL on your LeetCode profile must be the same GitHub you used for “Continue with GitHub” here.";
    case "CODEFORCES_ORG_REQUIRED":
      return "On Codeforces: Settings → Organization → paste the exact phrase from this page → Save. Wait a few seconds, then submit again.";
    case "GITHUB_MISMATCH":
      return "Use your own GitHub profile URL — it must match the GitHub account you signed in with.";
    case "GITHUB_IDENTITY_REQUIRED":
      return "Sign out and use “Continue with GitHub”, then return to this page.";
    default:
      return null;
  }
}

export default function ApplyPage() {
  const { refreshUser } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errorHint, setErrorHint] = useState<string | null>(null);
  /** Exact string for Codeforces "Organization" field (proves CF handle ownership). */
  const [codeforcesOrgPhrase, setCodeforcesOrgPhrase] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState({
    githubUrl: "",
    codeforcesHandle: "",
    leetcodeHandle: "",
  });
  const [lcPreview, setLcPreview] = useState<string | null>(null);
  const [cfPreview, setCfPreview] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Application | Application[]>("/applications/me")
      .then(async (data) => {
        const app = Array.isArray(data) ? data[0] : data;
        if (app) {
          setApplication(app);
          if (app.status === "APPROVED") await refreshUser();
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    if (application) return;
    api
      .get<{ phrase: string }>("/verification/codeforces-phrase")
      .then((r) => setCodeforcesOrgPhrase(r.phrase))
      .catch(() => setCodeforcesOrgPhrase(null));
  }, [application]);

  const update =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorHint(null);
    const gh = form.githubUrl.trim();
    const cfRaw = form.codeforcesHandle.trim();
    const lcRaw = form.leetcodeHandle.trim();
    const cf = cfRaw ? normalizeCodeforcesHandle(cfRaw) : "";
    const lc = lcRaw ? normalizeLeetCodeHandle(lcRaw) : "";

    if (lcRaw && !lc) {
      setError("LeetCode: invalid link or username.");
      setErrorHint(
        "Copy the URL from your LeetCode profile (contains /u/yourname) or type your handle only — not a problem or contest link.",
      );
      return;
    }
    if (cfRaw && !cf) {
      setError("Codeforces: invalid link or handle.");
      setErrorHint(
        "Use your profile URL (codeforces.com/profile/yourhandle) or your handle only.",
      );
      return;
    }
    if (!gh && !cf && !lc) {
      setError(
        "Add at least one of: GitHub profile URL, LeetCode profile/handle, or Codeforces profile/handle.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.post<Application>("/applications", {
        githubUrl: form.githubUrl || undefined,
        codeforcesHandle: form.codeforcesHandle || undefined,
        leetcodeHandle: form.leetcodeHandle || undefined,
      });
      setApplication(result);
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit application");
      setErrorHint(hintForApplyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppeal = async () => {
    if (!application) return;
    try {
      await api.post("/appeals", {
        applicationId: application.id,
        reason: "I'd like to request a manual review of my application.",
      });
      setApplication((a) => (a ? { ...a, status: "APPEALED" } : a));
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center bg-app-bg py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neon" />
      </div>
    );
  }

  if (application) {
    const statusColors: Record<string, string> = {
      PENDING: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
      APPROVED: "border-green-500/20 bg-green-500/10 text-green-400",
      REJECTED: "border-red-500/20 bg-red-500/10 text-red-400",
      APPEALED: "border-blue-500/20 bg-blue-500/10 text-blue-400",
      UNDER_REVIEW: "border-[#e3c98e]/20 bg-[#e3c98e]/10 text-[#e3c98e]",
    };

    return (
      <div className="min-h-screen bg-app-bg">
        <div>
          <h1 className="text-2xl font-semibold text-app-fg">Your Application</h1>
          <p className="mt-1 text-sm text-app-fg-muted">Track your verification status</p>
        </div>

        <div className="app-panel mt-6 p-6">
          <div
            className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
              statusColors[application.status] || "text-app-fg-muted"
            }`}
          >
            <FileCheck className="h-4 w-4" />
            {application.status}
          </div>

          <div className="space-y-3 text-sm">
            {application.githubUrl && (
              <div>
                <span className="text-app-fg-muted">GitHub:</span>{" "}
                <span className="text-app-fg-secondary">{application.githubUrl}</span>
              </div>
            )}
            {application.codeforcesHandle && (
              <div>
                <span className="text-app-fg-muted">Codeforces:</span>{" "}
                <span className="text-app-fg-secondary">{application.codeforcesHandle}</span>
              </div>
            )}
            {application.leetcodeHandle && (
              <div>
                <span className="text-app-fg-muted">LeetCode:</span>{" "}
                <span className="text-app-fg-secondary">{application.leetcodeHandle}</span>
              </div>
            )}
            {application.score !== null && (
              <div className="neo-field mt-4 rounded-xl bg-app-surface-2 p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-app-fg-muted">Score</p>
                <p className="mt-1 text-3xl font-bold text-app-fg">
                  {application.score}
                  <span className="text-sm text-app-fg-muted">/100</span>
                </p>
                <p className="mt-2 text-xs text-app-fg-muted">
                  100 = auto-approved (met at least one platform threshold). 0 =
                  under manual review.
                </p>
              </div>
            )}
            {application.scoreBreakdown != null &&
            typeof application.scoreBreakdown === "object" ? (
                <div className="neo-field mt-4 rounded-xl bg-app-surface-2 p-4 text-xs text-app-fg-muted">
                  <p className="font-medium uppercase tracking-widest text-app-fg-muted">
                    Verification details
                  </p>
                  <ul className="mt-2 space-y-1 font-mono text-[11px]">
                    {Object.entries(
                      application.scoreBreakdown as Record<string, unknown>,
                    ).map(([key, val]) => {
                      if (key.startsWith("_")) return null;
                      if (
                        val &&
                        typeof val === "object" &&
                        "rawValue" in val &&
                        "threshold" in val
                      ) {
                        const v = val as {
                          rawValue: number;
                          threshold: number;
                          passed?: boolean;
                        };
                        return (
                          <li key={key}>
                            <span className="text-[#e3c98e]">{key}</span>:{" "}
                            {v.rawValue} (need ≥{v.threshold}
                            {v.passed === false ? ", not met" : v.passed ? ", met" : ""})
                          </li>
                        );
                      }
                      return null;
                    })}
                  </ul>
                  {"_fetchErrors" in (application.scoreBreakdown as object) &&
                    (
                      application.scoreBreakdown as {
                        _fetchErrors?: Record<string, string>;
                      }
                    )._fetchErrors && (
                      <div className="mt-3 text-red-400/90">
                        <p className="font-medium text-red-400">Fetch issues</p>
                        <ul className="mt-1 space-y-0.5">
                          {Object.entries(
                            (
                              application.scoreBreakdown as {
                                _fetchErrors: Record<string, string>;
                              }
                            )._fetchErrors,
                          ).map(([k, msg]) => (
                            <li key={k}>
                              {k}: {msg}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              ) : null}
          </div>

          {application.status === "REJECTED" && (
            <div className="mt-6">
              <Button variant="outline" onClick={handleAppeal} className="rounded-full">
                <AlertCircle className="mr-2 h-4 w-4" /> Submit Appeal
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <div>
        <h1 className="text-2xl font-semibold text-app-fg">Apply to LockedIn</h1>
        <p className="mt-2 text-sm leading-relaxed text-app-fg-muted">
          You’re signed in with <strong className="text-app-fg-secondary">GitHub</strong> — that
          anchors your identity. To get in automatically, show{" "}
          <strong className="text-app-fg-secondary">at least one</strong> strong signal below.
          Each path has different steps; you only need one threshold, but you can add more.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-app-fg-muted">
          <li>
            <span className="text-app-fg-secondary font-medium">GitHub</span> — ≥250 contributions
            in the last year (paste your profile URL).
          </li>
          <li>
            <span className="text-app-fg-secondary font-medium">LeetCode</span> — ≥100 solved;
            we read the <strong className="text-app-fg-secondary">GitHub URL</strong> on your
            LeetCode profile — it must match this sign-in (so someone else’s LC account won’t
            work).
          </li>
          <li>
            <span className="text-app-fg-secondary font-medium">Codeforces</span> — rating ≥900;
            you prove the handle is yours with a <strong className="text-app-fg-secondary">one-time
            org phrase</strong> (below) — not your real org name.
          </li>
        </ul>
      </div>

      <div className="app-panel mt-6 space-y-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* GitHub — identity + optional contributions */}
          <section className="rounded-xl border border-app-fg/10 bg-app-surface-2/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-app-fg">
              <Github className="h-4 w-4 text-app-fg-secondary" />
              GitHub profile URL
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-app-fg-muted">
              Optional if you only use LeetCode or Codeforces below — but recommended. Must be{" "}
              <strong className="text-app-fg-secondary">your</strong> profile (same login as
              LockedIn).
            </p>
            <label className="mb-1.5 mt-3 block text-xs font-medium text-app-fg-muted">
              URL
            </label>
            <Input
              value={form.githubUrl}
              onChange={update("githubUrl")}
              placeholder="https://github.com/yourusername"
              className="font-mono text-sm"
            />
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            {/* LeetCode */}
            <section className="rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-4">
              <div className="text-sm font-semibold text-orange-200/95">
                LeetCode (100+ problems)
              </div>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-app-fg-muted">
                <li>Open LeetCode → your profile.</li>
                <li>
                  Profile → <strong className="text-app-fg-secondary">Settings</strong> → add your{" "}
                  <strong className="text-app-fg-secondary">GitHub</strong> (same as here). How you
                  log in to LeetCode (Google, etc.) does not matter.
                </li>
                <li>
                  Paste your <strong className="text-app-fg-secondary">profile link</strong> or
                  username below.
                </li>
              </ol>
              <label className="mb-1.5 mt-3 block text-xs font-medium text-app-fg-muted">
                Profile URL or username
              </label>
              <Input
                value={form.leetcodeHandle}
                onChange={update("leetcodeHandle")}
                onBlur={(e) => {
                  const t = e.target.value.trim();
                  if (!t) {
                    setLcPreview(null);
                    return;
                  }
                  const h = normalizeLeetCodeHandle(t);
                  setLcPreview(h || "__invalid__");
                }}
                placeholder="https://leetcode.com/u/you or you"
                className="font-mono text-sm"
              />
              {lcPreview === "__invalid__" && (
                <p className="mt-1.5 text-[11px] text-amber-400/90">
                  Couldn’t detect a username — use your profile URL or handle only.
                </p>
              )}
              {lcPreview && lcPreview !== "__invalid__" && (
                <p className="mt-1.5 text-[11px] text-app-fg-muted">
                  We’ll verify <span className="font-mono text-app-fg-secondary">{lcPreview}</span>
                </p>
              )}
            </section>

            {/* Codeforces */}
            <section className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-4">
              <div className="text-sm font-semibold text-sky-200/95">
                Codeforces (rating 900+)
              </div>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-app-fg-muted">
                <li>Copy the verification phrase in the box below.</li>
                <li>
                  Codeforces → <strong className="text-app-fg-secondary">Settings</strong> →{" "}
                  <strong className="text-app-fg-secondary">Organization</strong> → paste exactly →
                  Save.
                </li>
                <li>Wait a few seconds, then paste your profile URL or handle here.</li>
              </ol>
              {codeforcesOrgPhrase ? (
                <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-950/30 px-3 py-2 text-[11px] text-app-fg-muted">
                  <p className="font-medium text-sky-200/90">Your org phrase (unique to you)</p>
                  <code className="mt-1 block break-all font-mono text-xs text-app-fg">
                    {codeforcesOrgPhrase}
                  </code>
                  <p className="mt-1.5 text-[10px] text-app-fg-muted">
                    This proves the handle is yours — you can clear it after approval.
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-app-fg-muted">
                  Sign in with GitHub to load your personal phrase.
                </p>
              )}
              <label className="mb-1.5 mt-3 block text-xs font-medium text-app-fg-muted">
                Profile URL or handle
              </label>
              <Input
                value={form.codeforcesHandle}
                onChange={update("codeforcesHandle")}
                onBlur={(e) => {
                  const t = e.target.value.trim();
                  if (!t) {
                    setCfPreview(null);
                    return;
                  }
                  const h = normalizeCodeforcesHandle(t);
                  setCfPreview(h || "__invalid__");
                }}
                placeholder="https://codeforces.com/profile/you or you"
                className="font-mono text-sm"
              />
              {cfPreview === "__invalid__" && (
                <p className="mt-1.5 text-[11px] text-amber-400/90">
                  Couldn’t detect a handle — use your profile URL or handle only.
                </p>
              )}
              {cfPreview && cfPreview !== "__invalid__" && (
                <p className="mt-1.5 text-[11px] text-app-fg-muted">
                  We’ll verify <span className="font-mono text-app-fg-secondary">{cfPreview}</span>
                </p>
              )}
            </section>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <p>{error}</p>
              {errorHint && (
                <p className="mt-2 border-t border-red-500/20 pt-2 text-[12px] leading-relaxed text-red-300/85">
                  {errorHint}
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full rounded-full"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Submit application
          </Button>
        </form>
      </div>
    </div>
  );
}
