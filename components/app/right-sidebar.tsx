"use client";

import { Button } from "@/components/ui/button";

const suggestedUsers = [
  { name: "Arjun Mehta", username: "arjunm", color: "from-violet-500 to-fuchsia-500" },
  { name: "Sarah Lin", username: "sarahlin", color: "from-blue-500 to-cyan-400" },
  { name: "Dev Patel", username: "devpatel", color: "from-orange-500 to-rose-500" },
];

const trendingTopics = [
  { tag: "#SystemDesign", count: "2.1K posts" },
  { tag: "#RustLang", count: "1.4K posts" },
  { tag: "#OpenSource", count: "3.2K posts" },
  { tag: "#AIEngineering", count: "5.6K posts" },
];

export function RightSidebar() {
  return (
    <div className="sticky top-[80px] space-y-5">
      {/* Suggested Profiles */}
      <div className="rounded-2xl border border-[#222] bg-[#111] p-4">
        <h3 className="mb-3 text-[15px] font-bold text-white">Suggested Profiles</h3>
        <div className="space-y-3">
          {suggestedUsers.map((u) => (
            <div key={u.username} className="flex items-center gap-3">
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${u.color} text-[11px] font-bold text-white`}>
                {u.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">{u.name}</p>
                <p className="truncate text-[12px] text-[#666]">@{u.username}</p>
              </div>
              <Button variant="outline" size="sm" className="h-7 rounded-full px-3 text-[11px]">
                Follow
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Topics */}
      <div className="rounded-2xl border border-[#222] bg-[#111] p-4">
        <h3 className="mb-3 text-[15px] font-bold text-white">Trending Topics</h3>
        <div className="space-y-2.5">
          {trendingTopics.map((t) => (
            <button key={t.tag} className="block w-full text-left transition-colors hover:bg-[#1a1a1a] -mx-2 px-2 py-1.5 rounded-lg">
              <p className="text-[14px] font-semibold text-neon-light">{t.tag}</p>
              <p className="text-[12px] text-[#666]">{t.count}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="px-2 text-[11px] text-[#444]">
        Terms · Privacy · About<br />
        &copy; 2026 LockedIn
      </p>
    </div>
  );
}
