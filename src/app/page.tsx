import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 bg-zinc-950 p-8 text-center text-zinc-100">
      <h1 className="text-5xl font-bold tracking-tight">
        <span className="text-indigo-400">Motif</span>
      </h1>
      <p className="max-w-xl text-balance text-lg text-zinc-400">
        The missing motion layer between design and code. Design an element&apos;s motion by
        feel, and Motif writes real Framer Motion back into your source.
      </p>
      <Link
        href="/editor"
        className="rounded-md bg-indigo-500 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-400"
      >
        Open the editor →
      </Link>
      <p className="text-sm text-zinc-500">
        See <code className="rounded bg-zinc-800 px-1.5 py-0.5">README.md</code> for what works
        today.
      </p>
    </main>
  );
}
