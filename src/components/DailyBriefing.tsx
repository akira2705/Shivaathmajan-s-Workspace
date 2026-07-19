"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Task } from "@/lib/mockData";
import { useApiKey } from "@/lib/useApiKey";

export default function DailyBriefing({ tasks }: { tasks: Task[] }) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { apiKey } = useApiKey();

  useEffect(() => {
    const key = `briefing-${new Date().toISOString().slice(0, 10)}`;
    const cached = sessionStorage.getItem(key);
    if (cached) { setBriefing(cached); return; }
    if (tasks.length === 0) return;
    setLoading(true);
    fetch("/api/ai/briefing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks, apiKey }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.briefing) {
          setBriefing(d.briefing);
          sessionStorage.setItem(key, d.briefing);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length]);

  return (
    <AnimatePresence>
      {!dismissed && (briefing || loading) && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 rounded px-5 py-4 flex items-start gap-4"
          style={{
            background: "var(--card)",
            border: "1px solid var(--gold-border)",
            boxShadow: "0 2px 12px var(--gold-glow)",
          }}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5"
            style={{ background: "var(--header)", border: "1px solid rgba(182,138,56,0.35)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold-1)" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-mono text-[9px] uppercase tracking-[1.5px] mb-1 font-bold" style={{ color: "var(--gold-3)" }}>
              Daily Briefing
            </p>
            {loading ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>Generating your briefing…</p>
            ) : (
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{briefing}</p>
            )}
          </div>
          <button onClick={() => setDismissed(true)}
            className="shrink-0 font-mono text-[10px] flex h-6 w-6 items-center justify-center rounded"
            style={{ color: "var(--muted)", border: "1px solid var(--border-n)" }}
            aria-label="Dismiss">
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
