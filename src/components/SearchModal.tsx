"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Task, PRIORITY_META } from "@/lib/mockData";

// Local-only search over the in-memory task list (no /api/search backend).
export default function SearchModal({ open, onClose, tasks }: { open: boolean; onClose: () => void; tasks: Task[] }) {
  const [q, setQ]               = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 80); setQ(""); setSelected(0); }
  }, [open]);

  const results = q.trim().length >= 1
    ? tasks.filter(t =>
        t.title.toLowerCase().includes(q.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(q.toLowerCase()))
      ).slice(0, 20)
    : [];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && results[selected]) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, selected, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]" style={{ background: "rgba(32,36,63,0.40)", backdropFilter: "blur(4px)" }}
            onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed z-[61] left-1/2 -translate-x-1/2 w-[min(560px,92vw)] rounded overflow-hidden"
            style={{ top: "12vh", background: "var(--card)", border: "1px solid var(--gold-border)", boxShadow: "0 20px 60px rgba(32,36,63,0.20)" }}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--border-n)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/>
              </svg>
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search tasks or tags…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--text)", caretColor: "var(--gold-3)" }}
              />
              <kbd className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>Esc</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[360px] overflow-y-auto">
              {results.length === 0 && q.length >= 1 && (
                <p className="text-center font-mono text-[10px] uppercase tracking-[1.5px] py-10" style={{ color: "var(--muted)" }}>
                  No results for &ldquo;{q}&rdquo;
                </p>
              )}
              {results.length === 0 && q.length === 0 && (
                <p className="text-center font-mono text-[10px] uppercase tracking-[1.5px] py-10" style={{ color: "var(--muted)" }}>
                  Start typing to search your tasks
                </p>
              )}
              {results.map((t, i) => {
                const meta = PRIORITY_META[t.priority];
                return (
                  <button key={t.id} onClick={onClose}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors border-b last:border-0"
                    style={{
                      borderColor: "var(--border-n)",
                      background: i === selected ? "var(--card-2)" : "transparent",
                    }}
                    onMouseEnter={() => setSelected(i)}>
                    <span className="shrink-0 font-mono text-[8px] uppercase tracking-[1px] px-1.5 py-0.5 rounded"
                      style={{ background: `${meta.color}14`, color: meta.color, border: `1px solid ${meta.color}28` }}>
                      {meta.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "var(--text)", textDecoration: t.done ? "line-through" : "none" }}>
                        {t.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
