import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080d1e] text-zinc-100">
      <div className="text-center">
        <h1 className="text-6xl font-semibold">404</h1>
        <p className="mt-4 text-zinc-400">This page doesn&apos;t exist.</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-white/10 px-6 py-2 text-sm transition hover:bg-white/20"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
