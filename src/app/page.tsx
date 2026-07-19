import Link from "next/link";

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: "var(--bg)" }}
    >
      <h1 className="font-serif font-extrabold tracking-tight" style={{ fontSize: "4rem", color: "var(--gold-2)" }}>
        TaskFlow
      </h1>
      <p className="font-mono text-sm uppercase tracking-[2px]" style={{ color: "var(--muted)" }}>
        A local-first task management demo — no backend, no account, your data stays in this browser.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/tasks"
          className="btn-gold rounded-full px-8 py-3 font-mono text-sm uppercase tracking-[1.5px]"
        >
          Open Tasks →
        </Link>
        <Link
          href="/expenses"
          className="btn-outline rounded-full px-8 py-3 font-mono text-sm uppercase tracking-[1.5px]"
        >
          Open Expenses →
        </Link>
      </div>
    </main>
  );
}
