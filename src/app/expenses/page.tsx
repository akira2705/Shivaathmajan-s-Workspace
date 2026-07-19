"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/AppShell";
import SettingsModal from "@/components/SettingsModal";
import { useApiKey } from "@/lib/useApiKey";
import { todayStr, currentMonth } from "@/lib/date";
import { fetchExpenses, createExpense, deleteExpense } from "@/lib/expenseApi";
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES, CATEGORY_META } from "@/lib/expenseData";

type FilterMode = "all" | ExpenseCategory;

function fmtMoney(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function ExpensesPage() {
  const { apiKey, setApiKey } = useApiKey();

  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState<FilterMode>("all");
  const [search, setSearch]           = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Manual add form
  const [desc, setDesc]         = useState("");
  const [amount, setAmount]     = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Other");
  const [date, setDate]         = useState(todayStr());

  // AI add
  const [aiMode, setAiMode]   = useState(false);
  const [aiText, setAiText]   = useState("");
  const [aiBusy, setAiBusy]   = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await fetchExpenses();
    setExpenses(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addManual() {
    const amt = parseFloat(amount);
    if (!desc.trim() || Number.isNaN(amt) || amt < 0) return;
    const saved = await createExpense({ description: desc.trim(), amount: amt, category, date });
    setExpenses((p) => [saved, ...p]);
    setDesc(""); setAmount(""); setCategory("Other"); setDate(todayStr());
  }

  async function addWithAi() {
    const text = aiText.trim();
    if (!text) return;
    setAiBusy(true); setAiError(null);
    try {
      const res = await fetch("/api/ai/categorize-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");
      const saved = await createExpense({
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: data.date ?? undefined,
      });
      setExpenses((p) => [saved, ...p]);
      setAiText("");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setAiBusy(false);
    }
  }

  async function remove(id: string) {
    setExpenses((p) => p.filter((e) => e.id !== id));
    await deleteExpense(id);
  }

  const filtered = useMemo(() => {
    let r = expenses;
    if (filter !== "all") r = r.filter((e) => e.category === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((e) => e.description.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, filter, search]);

  const totalToday = useMemo(
    () => expenses.filter((e) => e.date === todayStr()).reduce((s, e) => s + e.amount, 0),
    [expenses]
  );
  const totalMonth = useMemo(
    () => expenses.filter((e) => e.date.startsWith(currentMonth())).reduce((s, e) => s + e.amount, 0),
    [expenses]
  );
  const totalFiltered = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  return (
    <AppShell
      active="expenses"
      title="Expenses"
      subtitle="Track your spending"
      onOpenSettings={() => setSettingsOpen(true)}
    >

        {/* ── Stat row ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-stretch gap-3 mb-8">
          <div className="stat-tile flex flex-col items-end justify-between px-5 py-3.5 min-w-[140px]">
            <span className="font-serif text-[2rem] leading-none font-bold" style={{ color: "var(--gold-3)" }}>
              {fmtMoney(totalToday)}
            </span>
            <span className="mt-2 font-mono text-[9px] uppercase tracking-[1.8px]" style={{ color: "var(--muted)" }}>
              Today
            </span>
          </div>
          <div className="stat-tile flex flex-col items-end justify-between px-5 py-3.5 min-w-[140px]">
            <span className="font-serif text-[2rem] leading-none font-bold" style={{ color: "var(--text)" }}>
              {fmtMoney(totalMonth)}
            </span>
            <span className="mt-2 font-mono text-[9px] uppercase tracking-[1.8px]" style={{ color: "var(--muted)" }}>
              This month
            </span>
          </div>
          <div className="stat-tile flex flex-1 min-w-[200px] flex-col items-end justify-between px-5 py-3.5">
            <span className="font-serif text-[2rem] leading-none font-bold" style={{ color: "var(--text)" }}>
              {fmtMoney(totalFiltered)}
            </span>
            <span className="mt-2 font-mono text-[9px] uppercase tracking-[1.8px]" style={{ color: "var(--muted)" }}>
              {filter === "all" ? "All expenses" : filter} · {filtered.length} item{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* ── Add bar ────────────────────────────────────────────────────── */}
        <div className="rounded mb-6 px-5 py-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] uppercase tracking-[1.5px] font-bold" style={{ color: "var(--gold-3)" }}>
              Add expense
            </p>
            <button
              onClick={() => { setAiMode((m) => !m); setAiError(null); }}
              className="btn-outline rounded px-3 py-1.5 font-mono text-[9px] uppercase tracking-[1.2px]"
            >
              {aiMode ? "Manual entry" : "AI Add"}
            </button>
          </div>

          {aiMode ? (
            <div>
              <div className="flex gap-2 glow-focus rounded" style={{ border: "1.5px solid var(--border)", background: "var(--card-2)", padding: "4px 4px 4px 12px" }}>
                <input
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addWithAi()}
                  placeholder='Describe it… "42 dollars on groceries yesterday"'
                  className="flex-1 bg-transparent outline-none text-sm py-2"
                  style={{ color: "var(--text)" }}
                />
                <button
                  onClick={addWithAi}
                  disabled={aiBusy || !aiText.trim()}
                  className="btn-gold rounded shrink-0 px-4 py-2 font-mono text-[10px] uppercase tracking-[1.2px] disabled:opacity-40"
                >
                  {aiBusy ? "Parsing…" : "AI Add"}
                </button>
              </div>
              {aiError && (
                <p className="mt-2 text-xs" style={{ color: "var(--urgent)" }}>{aiError}</p>
              )}
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[1px]" style={{ color: "var(--muted-2)" }}>
                Groq fills in description, amount, category & date automatically · powered by Groq
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Description"
                className="flex-1 min-w-[160px] rounded px-3 py-2 text-sm outline-none glow-focus"
                style={{ border: "1.5px solid var(--border)", background: "var(--card-2)", color: "var(--text)" }}
              />
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManual()}
                type="number" step="0.01" placeholder="Amount"
                className="w-28 rounded px-3 py-2 text-sm outline-none glow-focus"
                style={{ border: "1.5px solid var(--border)", background: "var(--card-2)", color: "var(--text)" }}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="rounded px-3 py-2 text-sm outline-none"
                style={{ border: "1.5px solid var(--border)", background: "var(--card-2)", color: "var(--text)" }}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                className="rounded px-3 py-2 text-sm outline-none"
                style={{ border: "1.5px solid var(--border)", background: "var(--card-2)", color: "var(--text)" }}
              />
              <button
                onClick={addManual}
                className="btn-gold rounded px-5 py-2 font-mono text-[10px] uppercase tracking-[1.2px]"
              >
                + Add
              </button>
            </div>
          )}
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses…"
            className="rounded px-3 py-1.5 text-sm outline-none glow-focus"
            style={{ border: "1.5px solid var(--border)", background: "var(--card)", color: "var(--text)", minWidth: 200 }}
          />
          <button
            onClick={() => setFilter("all")}
            className="rounded px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1.2px]"
            style={{
              border: `1px solid ${filter === "all" ? "var(--gold-border)" : "var(--border-2)"}`,
              background: filter === "all" ? "var(--gold-glow)" : "transparent",
              color: filter === "all" ? "var(--text)" : "var(--text-2)",
            }}
          >All</button>
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1.2px]"
              style={{
                border: `1px solid ${filter === c ? "var(--gold-border)" : "var(--border-2)"}`,
                background: filter === c ? "var(--gold-glow)" : "transparent",
                color: filter === c ? "var(--text)" : "var(--text-2)",
              }}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: CATEGORY_META[c].color }} />
              {c}
            </button>
          ))}
        </div>

        {/* ── List ───────────────────────────────────────────────────────── */}
        {loading ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded px-6 py-10 text-center" style={{ background: "var(--card)", border: "1px dashed var(--border-2)" }}>
            <p className="text-sm" style={{ color: "var(--muted)" }}>No expenses yet — add one above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {filtered.map((e) => {
                const meta = CATEGORY_META[e.category];
                return (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    className="task-card flex items-center gap-4 px-4 py-3"
                  >
                    <span
                      className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center"
                      style={{ background: `${meta.color}18` }}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{e.description}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[1px] mt-0.5" style={{ color: "var(--muted)" }}>
                        {e.category} · {e.date}
                      </p>
                    </div>
                    <span className="font-serif text-lg font-bold shrink-0" style={{ color: meta.color }}>
                      {fmtMoney(e.amount)}
                    </span>
                    <button
                      onClick={() => remove(e.id)}
                      className="shrink-0 font-mono text-[10px] flex h-7 w-7 items-center justify-center rounded"
                      style={{ color: "var(--muted)", border: "1px solid var(--border-n)" }}
                      aria-label="Delete"
                      title="Delete"
                    >✕</button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} apiKey={apiKey} onSave={setApiKey} />
    </AppShell>
  );
}
