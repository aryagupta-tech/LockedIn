import { cn } from "@/lib/utils";

/** Lightweight placeholders while the feed API responds — keeps layout stable. */
export function FeedSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-5", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="post-card animate-pulse overflow-hidden"
          aria-hidden
        >
          <div className="flex gap-3 px-4 py-3">
            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-app-surface-2" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3.5 w-32 rounded bg-app-surface-2" />
              <div className="h-3 w-24 rounded bg-app-surface-2/80" />
            </div>
          </div>
          <div className="space-y-2 px-4 pb-4">
            <div className="h-3 w-full rounded bg-app-surface-2/90" />
            <div className="h-3 w-[92%] rounded bg-app-surface-2/70" />
            <div className="h-3 w-[70%] rounded bg-app-surface-2/60" />
          </div>
          <div className="flex gap-6 border-t border-app-border px-4 py-2.5">
            <div className="h-5 w-12 rounded bg-app-surface-2/80" />
            <div className="h-5 w-12 rounded bg-app-surface-2/80" />
          </div>
        </div>
      ))}
    </div>
  );
}
