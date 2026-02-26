"use client";

import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/app/sidebar";
import { Loader2 } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-3xl px-4 py-8 pt-20 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
