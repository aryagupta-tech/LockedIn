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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    );
  }
  
  if (!user) return null;

  return (
    <div className="min-h-screen bg-black">
      <TopNavbar />
      <div className="mx-auto flex max-w-[1200px] gap-6 px-5 pt-[72px]">
        {/* Main feed */}
        <main className="min-w-0 flex-1">
          {children}
        </main>
        {/* Right sidebar */}
        <aside className="hidden w-[300px] flex-shrink-0 xl:block">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}
