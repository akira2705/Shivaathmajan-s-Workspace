"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import WorldClock from "@/components/WorldClock";
import WeatherWidget from "@/components/WeatherWidget";
import ThemeToggle from "@/components/ThemeToggle";
import { useIsMobile } from "@/lib/useIsMobile";

type ActivePage = "tasks" | "expenses";

interface AppShellProps {
  active: ActivePage;
  title: string;
  subtitle?: string;
  onOpenSearch?: () => void;
  onOpenShortcuts?: () => void;
  onOpenSettings: () => void;
  children: ReactNode;
}

// ─── Icons (inline SVG — no icon library) ──────────────────────────────────
function TasksIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 9h3.75M6.75 19.5H17.25A2.25 2.25 0 0 0 19.5 17.25V6.75A2.25 2.25 0 0 0 17.25 4.5H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5A2.25 2.25 0 0 0 6.75 19.5Z" />
    </svg>
  );
}

function ExpensesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 4.5h16.5A1.5 1.5 0 0 1 21.75 6v12a1.5 1.5 0 0 1-1.5 1.5H3.75A1.5 1.5 0 0 1 2.25 18V6a1.5 1.5 0 0 1 1.5-1.5Z" />
    </svg>
  );
}

function ShortcutsIcon() {
  return (
    <span className="font-mono text-sm leading-none">?</span>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg font-black"
      style={{ width: size, height: size, background: "var(--gold-2)", color: "#fff", fontSize: size * 0.5 }}
    >
      T
    </div>
  );
}

const NAV_ITEMS: { key: ActivePage; href: string; label: string; icon: () => React.ReactElement }[] = [
  { key: "tasks", href: "/tasks", label: "Tasks", icon: TasksIcon },
  { key: "expenses", href: "/expenses", label: "Expenses", icon: ExpensesIcon },
];

export default function AppShell({
  active,
  title,
  subtitle,
  onOpenSearch,
  onOpenShortcuts,
  onOpenSettings,
  children,
}: AppShellProps) {
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ── Sidebar (desktop only — mobile relies on the page's own bottom nav / topbar) ── */}
      <motion.aside
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className="hidden md:flex w-[240px] shrink-0 flex-col"
        style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 px-5 py-6" style={{ textDecoration: "none" }}>
          <BrandMark />
          <span className="font-serif font-extrabold text-lg tracking-tight" style={{ color: "var(--gold-2)" }}>
            TaskFlow
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === active;
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 font-mono text-[11px] uppercase tracking-[1.2px] transition-colors duration-150"
                style={{
                  textDecoration: "none",
                  background: isActive ? "var(--gold-glow)" : "transparent",
                  color: isActive ? "var(--gold-2)" : "var(--text-2)",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto" />
      </motion.aside>

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between gap-4 px-5 sm:px-8 py-4"
          style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex min-w-0 items-center gap-3">
            {/* Compact brand mark — mobile only, since the sidebar (with the full brand) is hidden below md */}
            <Link href="/" className="md:hidden flex items-center gap-2 shrink-0" style={{ textDecoration: "none" }}>
              <BrandMark size={28} />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-xl sm:text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                {title}
              </h1>
              {subtitle && (
                <p className="font-mono text-[10px] uppercase tracking-[2px] mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!isMobile && (
              <div className="flex items-center gap-2">
                <WeatherWidget />
                <WorldClock />
              </div>
            )}
            <ThemeToggle />
            {onOpenShortcuts && (
              <motion.button
                onClick={onOpenShortcuts}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
                className="flex h-8 w-8 items-center justify-center rounded-md"
                style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "var(--surface)" }}
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts"
              >
                <ShortcutsIcon />
              </motion.button>
            )}
            {onOpenSearch && (
              <motion.button
                onClick={onOpenSearch}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
                className="flex h-8 items-center gap-1.5 px-2.5 rounded-md"
                style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "var(--surface)" }}
                aria-label="Search"
              >
                <SearchIcon />
                <kbd className="font-mono text-[8px]">⌘K</kbd>
              </motion.button>
            )}
            <motion.button
              onClick={onOpenSettings}
              whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "var(--surface)" }}
              aria-label="Settings"
            >
              <SettingsIcon />
            </motion.button>
          </div>
        </motion.header>

        {/* Content */}
        <main className={`mx-auto w-full max-w-[1600px] flex-1 px-5 sm:px-8 ${isMobile ? "pb-24 pt-6" : "pt-8 pb-16"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
