"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

interface AdminApplication {
  id: string;
  status: string;
  score: number | null;
  user: { id: string; username: string; displayName: string; email: string };
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

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"applications" | "weights">("applications");
  const [apps, setApps] = useState<AdminApplication[]>([]);
  const [weights, setWeights] = useState<ScoringWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    if (tab === "applications") {
      setLoading(true);
      api.get<{ items: AdminApplication[] } | AdminApplication[]>(`/admin/applications?status=${statusFilter}&limit=50`)
        .then((data) => {
          const list = Array.isArray(data) ? data : (data.items || []);
          setApps(list);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(true);
      api.get<ScoringWeight[] | { weights: ScoringWeight[] }>("/admin/scoring-weights")
        .then((data) => {
          const list = Array.isArray(data) ? data : (data.weights || []);
          setWeights(list);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isAdmin, tab, statusFilter]);

  const handleReview = async (id: string, decision: string) => {
    try {
      await api.patch(`/admin/applications/${id}/review`, { decision });
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ }
  };

  const handleWeightUpdate = async (key: string, weight: number) => {
    try {
      await api.put(`/admin/scoring-weights/${key}`, { weight });
      setWeights((prev) => prev.map((w) => w.key === key ? { ...w, weight } : w));
    } catch { /* ignore */ }
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
      <div>
        <h1 className="font-[var(--font-geist)] text-2xl font-semibold text-app-fg">Admin Panel</h1>
        <p className="mt-1 text-sm text-app-fg-muted">Manage applications and scoring</p>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "applications" ? "default" : "outline"} size="sm" onClick={() => setTab("applications")}>
          Applications
        </Button>
        <Button variant={tab === "weights" ? "default" : "outline"} size="sm" onClick={() => setTab("weights")}>
          Scoring Weights
        </Button>
      </div>

      {tab === "applications" && (
        <>
          <div className="flex gap-2">
            {["PENDING", "APPROVED", "REJECTED", "UNDER_REVIEW"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-app-sm px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === s ? "bg-neon/10 text-neon" : "text-app-fg-muted hover:text-app-fg-secondary"}`}
              >
                {s}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
          ) : apps.length === 0 ? (
            <p className="py-8 text-center text-sm text-app-fg-muted">No {statusFilter.toLowerCase()} applications</p>
          ) : (
            <div className="space-y-3">
              {apps.map((app) => (
                <div key={app.id} className="app-panel p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-medium text-app-fg">{app.user.displayName}</p>
                      <p className="text-xs text-app-fg-muted">@{app.user.username} &middot; {app.user.email}</p>
                    </div>
                    {app.score !== null && (
                      <span className="rounded-app-sm bg-app-surface-2 px-2.5 py-1 text-sm font-mono font-bold text-app-fg shadow-app">
                        {app.score}
                      </span>
                    )}
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2 text-xs text-app-fg-muted">
                    {app.githubUrl && <span className="rounded bg-app-surface-2 px-2 py-0.5">GitHub</span>}
                    {app.codeforcesHandle && <span className="rounded bg-app-surface-2 px-2 py-0.5">CF: {app.codeforcesHandle}</span>}
                    {app.leetcodeHandle && <span className="rounded bg-app-surface-2 px-2 py-0.5">LC: {app.leetcodeHandle}</span>}
                  </div>
                  {statusFilter === "PENDING" && (
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

      {tab === "weights" && (
        loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
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
        )
      )}
    </div>
  );
}
