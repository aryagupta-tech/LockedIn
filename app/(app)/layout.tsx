"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { TopNavbar } from "@/components/app/top-navbar";
import { RightSidebar } from "@/components/app/right-sidebar";
import { Loader2 } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--app-accent)]" />
        <div className="hidden">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <TopNavbar />
      <div className="mx-auto flex max-w-[1200px] gap-6 px-5 pt-[var(--app-content-offset)]">
        <main className="min-w-0 flex-1">{children}</main>
        <aside className="hidden w-[300px] flex-shrink-0 xl:block">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}
