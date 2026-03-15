"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-[#080d1e] text-zinc-100">
        <div className="text-center">
          <h1 className="text-4xl font-semibold">Something went wrong</h1>
          <p className="mt-4 text-zinc-400">{error.message || "An unexpected error occurred."}</p>
          <button
            onClick={reset}
            className="mt-8 rounded-lg bg-white/10 px-6 py-2 text-sm transition hover:bg-white/20"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
