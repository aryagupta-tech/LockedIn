"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Shield,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

interface AdminApplication {
  id: string;
  status: string;
  score: number | null;
  user: { id: string; username: string; displayName: string; email: string } | null;
  githubUrl: string | null;
  codeforcesHandle: string | null;
  leetcodeHandle: string | null;
  createdAt: string;
}

interface ScoringWeight {
  id: string;
  key: string;
  weight: number;
  threshold: number;
  minimum: number;
  description: string | null;
}

interface PendingAccount {
  id: string;
  email: string;
  username: string;
  displayName: string;
  createdAt: string;
  status: string;
  latestApplication: { id: string; status: string; createdAt: string } | null;
}

const REVIEWABLE = new Set(["PENDING", "PROCESSING", "UNDER_REVIEW"]);

const APP_STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "NEEDS_REVIEW", label: "Needs review" },
  { key: "ALL", label: "All" },
  { key: "UNDER_REVIEW", label: "Under review" },
  { key: "PROCESSING", label: "Processing" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"applications" | "accounts" | "weights">("applications");
  const [apps, setApps] = useState<AdminApplication[]>([]);
  const [weights, setWeights] = useState<ScoringWeight[]>([]);
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("NEEDS_REVIEW");
  const [loadError, setLoadError] = useState("");

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoadError("");
    if (tab === "applications") {
      setLoading(true);
      api
        .get<{ items: AdminApplication[] } | AdminApplication[]>(
          `/admin/applications?status=${encodeURIComponent(statusFilter)}&limit=50`,
        )
        .then((data) => {
          const list = Array.isArray(data) ? data : data.items || [];
          setApps(list);
        })
        .catch((e) => {
          console.error(e);
          setLoadError("Could not load applications. Check network and admin API.");
          setApps([]);
        })
        .finally(() => setLoading(false));
    } else if (tab === "accounts") {
      setLoading(true);
      api
        .get<{ items: PendingAccount[] }>("/admin/pending-users?limit=100")
        .then((data) => setPendingAccounts(data.items || []))
        .catch((e) => {
          console.error(e);
          setLoadError("Could not load pending accounts.");
          setPendingAccounts([]);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(true);
      api
        .get<ScoringWeight[] | { weights: ScoringWeight[] }>("/admin/scoring-weights")
        .then((data) => {
          const list = Array.isArray(data) ? data : data.weights || [];
          setWeights(list);
        })
        .catch((e) => {
          console.error(e);
          setLoadError("Could not load scoring weights.");
          setWeights([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isAdmin, tab, statusFilter]);

  const handleReview = async (id: string, decision: string) => {
    try {
      await api.patch(`/admin/applications/${id}/review`, { decision });
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch {
      /* ignore */
    }
  };

  const handleWeightUpdate = async (key: string, weight: number) => {
    try {
      await api.put(`/admin/scoring-weights/${key}`, { weight });
      setWeights((prev) => prev.map((w) => (w.key === key ? { ...w, weight } : w)));
    } catch {
      /* ignore */
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-20 text-center">
        <Shield className="mx-auto mb-3 h-8 w-8 text-app-fg-muted" />
        <p className="text-app-fg-muted">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[var(--font-geist)] text-2xl font-semibold text-app-fg">Admin Panel</h1>
          <p className="mt-1 text-sm text-app-fg-muted">
            Review applications and see accounts that registered but are still pending access.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/member-pages">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Member pages (QA)
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={tab === "applications" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("applications")}
        >
          Applications
        </Button>
        <Button
          variant={tab === "accounts" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("accounts")}
        >
          <Users className="mr-1.5 h-3.5 w-3.5" />
          Pending accounts
        </Button>
        <Button
          variant={tab === "weights" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("weights")}
        >
          Scoring weights
        </Button>
      </div>

      {loadError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {loadError}
        </div>
      )}

      {tab === "applications" && (
        <>
          <p className="text-xs text-app-fg-muted">
            New submissions are auto-scored to <strong className="text-app-fg-secondary">UNDER_REVIEW</strong> or{" "}
            <strong className="text-app-fg-secondary">APPROVED</strong> — the old &quot;PENDING&quot; tab was often
            empty. Use <strong className="text-app-fg-secondary">Needs review</strong> for the queue.
          </p>
          <div className="flex flex-wrap gap-2">
            {APP_STATUS_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`rounded-app-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === key
                    ? "bg-neon/10 text-neon"
                    : "text-app-fg-muted hover:text-app-fg-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-neon" />
            </div>
          ) : apps.length === 0 ? (
            <p className="py-8 text-center text-sm text-app-fg-muted">
              No applications for this filter.
            </p>
          ) : (
            <div className="space-y-3">
              {apps.map((app) => (
                <div key={app.id} className="app-panel p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-app-fg">
                        {app.user?.displayName ?? "Unknown user"}
                      </p>
                      <p className="text-xs text-app-fg-muted">
                        {app.user ? (
                          <>
                            @{app.user.username} · {app.user.email}
                          </>
                        ) : (
                          <span className="text-amber-400/90">No matching row in public.users</span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-app-sm bg-app-surface-2 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-app-fg-muted">
                        {app.status}
                      </span>
                      {app.score !== null && (
                        <span className="rounded-app-sm bg-app-surface-2 px-2.5 py-1 font-mono text-sm font-bold text-app-fg shadow-app">
                          {app.score}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2 text-xs text-app-fg-muted">
                    {app.githubUrl && <span className="rounded bg-app-surface-2 px-2 py-0.5">GitHub</span>}
                    {app.codeforcesHandle && (
                      <span className="rounded bg-app-surface-2 px-2 py-0.5">CF: {app.codeforcesHandle}</span>
                    )}
                    {app.leetcodeHandle && (
                      <span className="rounded bg-app-surface-2 px-2 py-0.5">LC: {app.leetcodeHandle}</span>
                    )}
                  </div>
                  {REVIEWABLE.has(app.status) && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleReview(app.id, "APPROVED")}>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReview(app.id, "REJECTED")}>
                        <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "accounts" && (
        <>
          <p className="text-sm text-app-fg-muted">
            Users with account status <strong className="text-app-fg-secondary">PENDING</strong> (not yet approved
            into the platform). If <strong className="text-app-fg-secondary">No application</strong>, they registered
            but never finished <Link href="/apply" className="text-neon hover:underline">/apply</Link>.
          </p>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-neon" />
            </div>
          ) : pendingAccounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-app-fg-muted">No pending accounts.</p>
          ) : (
            <div className="overflow-x-auto rounded-app-md border border-app-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-app-border bg-app-surface-2/50 text-xs uppercase text-app-fg-muted">
                  <tr>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Joined</th>
                    <th className="px-3 py-2">Application</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAccounts.map((row) => (
                    <tr key={row.id} className="border-b border-app-border/80">
                      <td className="px-3 py-2">
                        <span className="font-medium text-app-fg">{row.displayName}</span>
                        <span className="block text-xs text-app-fg-muted">@{row.username}</span>
                      </td>
                      <td className="px-3 py-2 text-app-fg-secondary">{row.email}</td>
                      <td className="px-3 py-2 text-app-fg-muted">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        {row.latestApplication ? (
                          <span className="text-app-fg-secondary">
                            {row.latestApplication.status}
                            <span className="ml-1 text-xs text-app-fg-muted">
                              ({new Date(row.latestApplication.createdAt).toLocaleDateString()})
                            </span>
                          </span>
                        ) : (
                          <span className="text-amber-400/90">No application submitted</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "weights" &&
        (loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-neon" />
          </div>
        ) : (
          <div className="space-y-3">
            {weights.map((w) => (
              <div key={w.key} className="app-panel p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-app-fg">{w.key}</p>
                    {w.description && <p className="text-xs text-app-fg-muted">{w.description}</p>}
                  </div>
                  <span className="font-mono text-sm text-neon">{w.weight}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={w.weight}
                  onChange={(e) => handleWeightUpdate(w.key, parseFloat(e.target.value))}
                  className="w-full accent-neon"
                />
                <div className="mt-1 flex justify-between text-[10px] text-app-fg-muted">
                  <span>Min: {w.minimum}</span>
                  <span>Threshold: {w.threshold}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
