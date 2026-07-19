"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "morning" | "afternoon" | "evening" | "night";

const PHASE_META: Record<Phase, { label: string; emoji: string; gradient: string; glow: string }> = {
  morning:   { label: "Morning",   emoji: "🌅", gradient: "linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)", glow: "rgba(251,191,36,0.18)" },
  afternoon: { label: "Afternoon", emoji: "☀️",  gradient: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)", glow: "rgba(56,189,248,0.16)" },
  evening:   { label: "Evening",   emoji: "🌇", gradient: "linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)", glow: "rgba(167,139,250,0.18)" },
  night:     { label: "Night",     emoji: "🌙", gradient: "linear-gradient(135deg, #6366f1 0%, #312e81 100%)", glow: "rgba(99,102,241,0.16)" },
};

function getPhase(h: number): Phase {
  if (h >= 5  && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export default function WorldClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [tz, setTz] = useState("Local Time");

  useEffect(() => {
    setNow(new Date());
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "Local Time");
    } catch {
      /* ignore */
    }
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const phase = getPhase(now.getHours());
  const meta  = PHASE_META[phase];
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border px-6 py-4 min-w-[220px]"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
      animate={{ boxShadow: `0 0 40px ${meta.glow}` }}
      transition={{ duration: 1.2 }}
    >
      <motion.div className="absolute inset-0 opacity-20" animate={{ background: meta.gradient }} transition={{ duration: 1.5 }} />
      <div className="relative z-10">
        <div className="font-mono text-[11px] uppercase tracking-[2px] text-[var(--muted)]">{tz}</div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="font-mono text-3xl font-semibold tabular-nums">
            {hh}:{mm}
            <motion.span key={ss} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} className="text-[var(--muted)]">:{ss}</motion.span>
          </span>
          <AnimatePresence mode="wait">
            <motion.span key={phase} initial={{ opacity:0, y:6, scale:0.8 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-6, scale:0.8 }} transition={{ duration:0.4 }} className="text-2xl">
              {meta.emoji}
            </motion.span>
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={phase} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:8 }} transition={{ duration:0.35 }}
            className="mt-1 font-mono text-[11px] uppercase tracking-[2px]"
            style={{ color: meta.gradient.match(/#[0-9a-f]{6}/i)?.[0] }}>
            Good {meta.label}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
