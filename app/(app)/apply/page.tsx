"use client";

import { useEffect, useState } from "react";
import { Loader2, Send, FileCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type Application, ApiError } from "@/lib/api";

export default function ApplyPage() {
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    githubUrl: "",
    codeforcesHandle: "",
    leetcodeHandle: "",
    portfolioUrl: "",
  });

  useEffect(() => {
    api.get<Application | Application[]>("/applications/me")
      .then((data) => {
        const app = Array.isArray(data) ? data[0] : data;
        if (app) setApplication(app);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await api.post<Application>("/applications", {
        githubUrl: form.githubUrl || undefined,
        codeforcesHandle: form.codeforcesHandle || undefined,
        leetcodeHandle: form.leetcodeHandle || undefined,
        portfolioUrl: form.portfolioUrl || undefined,
      });
      setApplication(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppeal = async () => {
    if (!application) return;
    try {
      await api.post("/appeals", { applicationId: application.id, reason: "I'd like to request a manual review of my application." });
      setApplication((a) => a ? { ...a, status: "APPEALED" } : a);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
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
      UNDER_REVIEW: "border-neon/20 bg-neon/10 text-neon",
    };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-[var(--font-geist)] text-2xl font-semibold text-white">Your Application</h1>
          <p className="mt-1 text-sm text-zinc-500">Track your verification status</p>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-surface/60 p-6">
          <div className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${statusColors[application.status] || "text-zinc-400"}`}>
            <FileCheck className="h-4 w-4" />
            {application.status}
          </div>

          <div className="space-y-3 text-sm">
            {application.githubUrl && <div><span className="text-zinc-500">GitHub:</span> <span className="text-zinc-300">{application.githubUrl}</span></div>}
            {application.codeforcesHandle && <div><span className="text-zinc-500">Codeforces:</span> <span className="text-zinc-300">{application.codeforcesHandle}</span></div>}
            {application.leetcodeHandle && <div><span className="text-zinc-500">LeetCode:</span> <span className="text-zinc-300">{application.leetcodeHandle}</span></div>}
            {application.portfolioUrl && <div><span className="text-zinc-500">Portfolio:</span> <span className="text-zinc-300">{application.portfolioUrl}</span></div>}
            {application.score !== null && (
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0a0e1a] p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">Score</p>
                <p className="mt-1 text-3xl font-bold text-white">{application.score}<span className="text-sm text-zinc-500">/100</span></p>
              </div>
            )}
          </div>

          {application.status === "REJECTED" && (
            <div className="mt-6">
              <Button variant="outline" onClick={handleAppeal}>
                <AlertCircle className="mr-2 h-4 w-4" /> Submit Appeal
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-geist)] text-2xl font-semibold text-white">Apply to LockedIn</h1>
        <p className="mt-1 text-sm text-zinc-500">Prove your signal. Provide at least one proof of work.</p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-surface/60 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">GitHub Profile URL</label>
            <Input value={form.githubUrl} onChange={update("githubUrl")} placeholder="https://github.com/username" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Codeforces Handle</label>
            <Input value={form.codeforcesHandle} onChange={update("codeforcesHandle")} placeholder="tourist" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">LeetCode Handle</label>
            <Input value={form.leetcodeHandle} onChange={update("leetcodeHandle")} placeholder="leetcode_user" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Portfolio URL</label>
            <Input value={form.portfolioUrl} onChange={update("portfolioUrl")} placeholder="https://yoursite.com" />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit Application
          </Button>
        </form>
      </div>
    </div>
  );
}
