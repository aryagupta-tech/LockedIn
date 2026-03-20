"use client";

import { useEffect, useState } from "react";
import { Loader2, Send, FileCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type Application, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function ApplyPage() {
  const { refreshUser } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  /** Exact string for Codeforces "Organization" field (proves CF handle ownership). */
  const [codeforcesOrgPhrase, setCodeforcesOrgPhrase] = useState<string | null>(null);
  const [form, setForm] = useState({
    githubUrl: "",
    codeforcesHandle: "",
    leetcodeHandle: "",
    portfolioUrl: "",
  });

  useEffect(() => {
    api
      .get<Application | Application[]>("/applications/me")
      .then(async (data) => {
        const app = Array.isArray(data) ? data[0] : data;
        if (app) {
          setApplication(app);
          // Server may have set users.status to APPROVED; sync auth profile for /feed, etc.
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

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const gh = form.githubUrl.trim();
    const cf = form.codeforcesHandle.trim();
    const lc = form.leetcodeHandle.trim();
    if (!gh && !cf && !lc) {
      setError(
        "Add at least one of GitHub URL, Codeforces handle, or LeetCode username for automated verification.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.post<Application>("/applications", {
        githubUrl: form.githubUrl || undefined,
        codeforcesHandle: form.codeforcesHandle || undefined,
        leetcodeHandle: form.leetcodeHandle || undefined,
        portfolioUrl: form.portfolioUrl || undefined,
      });
      setApplication(result);
      // Auto-approval updates users.status in DB; refresh so Feed unlocks without re-login.
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit application");
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
    } catch { /* ignore */ }
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
            {application.portfolioUrl && (
              <div>
                <span className="text-app-fg-muted">Portfolio:</span>{" "}
                <span className="text-app-fg-secondary">{application.portfolioUrl}</span>
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
        <p className="mt-1 text-sm text-app-fg-muted">
          You must be signed in with <strong className="text-app-fg-secondary">GitHub</strong> so we
          can tie proofs to <em>your</em> identity. You need{" "}
          <strong className="text-app-fg-secondary">at least one</strong> of: GitHub URL (≥500
          contributions / year), LeetCode (≥100 solved, with the same GitHub linked on
          LeetCode), or Codeforces (rating ≥900 + one-time org phrase below). Portfolio
          is optional context only.
        </p>

        <div className="neo-field mt-4 rounded-xl bg-app-surface-2 px-4 py-3 text-[12px] leading-relaxed text-app-fg-muted">
          <p className="font-medium text-app-fg-secondary">LeetCode &amp; how you log in there</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-app-fg-muted">
            <li>
              It doesn&apos;t matter if you use <strong className="text-app-fg-secondary">Google</strong>
              , <strong className="text-app-fg-secondary">Apple</strong>, or{" "}
              <strong className="text-app-fg-secondary">email</strong> to sign in to LeetCode — we
              don&apos;t check that.
            </li>
            <li>
              We <strong className="text-app-fg-secondary">do</strong> need your LeetCode profile to
              show a <strong className="text-app-fg-secondary">GitHub URL</strong> in settings (the
              same GitHub you used to sign in here). Add it under Profile → Settings if
              it&apos;s empty.
            </li>
            <li>
              If you don&apos;t want to link GitHub on LeetCode, use{" "}
              <strong className="text-app-fg-secondary">GitHub contributions</strong> or{" "}
              <strong className="text-app-fg-secondary">Codeforces</strong> (with the org phrase)
              instead — or your application may stay under manual review.
            </li>
          </ul>
        </div>
      </div>

      <div className="app-panel mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-fg-muted">
              GitHub Profile URL
            </label>
            <Input
              value={form.githubUrl}
              onChange={update("githubUrl")}
              placeholder="https://github.com/username"
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-app-fg-muted">
              Must match the GitHub account you used to sign in (no one else&apos;s profile).
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-fg-muted">
              Codeforces Handle
            </label>
            <Input
              value={form.codeforcesHandle}
              onChange={update("codeforcesHandle")}
              placeholder="tourist"
            />
            {codeforcesOrgPhrase ? (
              <div className="mt-2 rounded-lg border border-[#e3c98e]/25 bg-[#e3c98e]/5 px-3 py-2 text-[11px] text-[#c9b896]">
                <p className="font-medium text-[#e3c98e]">Prove it&apos;s your CF account</p>
                <p className="mt-1 text-[#aaa]">
                  On Codeforces → Settings, set <strong>Organization</strong> to exactly:
                </p>
                <code className="mt-1 block break-all font-mono text-xs text-app-fg">
                  {codeforcesOrgPhrase}
                </code>
                <p className="mt-1 text-app-fg-muted">
                  Save, wait a few seconds, then submit. You can clear it after you&apos;re
                  approved.
                </p>
              </div>
            ) : (
              <p className="mt-1.5 text-[11px] text-app-fg-muted">
                Sign in with GitHub to load your personal verification phrase for
                Codeforces.
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-fg-muted">
              LeetCode Handle
            </label>
            <Input
              value={form.leetcodeHandle}
              onChange={update("leetcodeHandle")}
              placeholder="leetcode_user"
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-app-fg-muted">
              Your LeetCode profile must list the <strong>same</strong> GitHub account in
              settings (GitHub URL field). Signing into LeetCode with Google / Apple /
              email is fine — that&apos;s separate from this GitHub link.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-fg-muted">Portfolio URL</label>
            <Input
              value={form.portfolioUrl}
              onChange={update("portfolioUrl")}
              placeholder="https://yoursite.com"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
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
            Submit Application
          </Button>
        </form>
      </div>
    </div>
  );
}
