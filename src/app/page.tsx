import Link from "next/link";

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: "var(--bg)" }}
    >
      <h1 className="font-serif italic font-extrabold" style={{ fontSize: "4rem", color: "var(--header)" }}>
        TaskFlow
      </h1>
      <p className="font-mono text-sm uppercase tracking-[2px]" style={{ color: "var(--muted)" }}>
        A local-first task management demo — no backend, no account, your data stays in this browser.
      </p>
      <Link
        href="/tasks"
        className="btn-gold rounded-full px-8 py-3 font-mono text-sm uppercase tracking-[1.5px]"
      >
        Open Tasks →
      </Link>
    </main>
  );
}
