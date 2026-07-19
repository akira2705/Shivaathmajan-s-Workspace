"use client";

import { motion } from "framer-motion";
import { PRIORITY_META, PRIORITY_ORDER, Task } from "@/lib/mockData";

export default function StatBar({ tasks }: { tasks: Task[] }) {
  const total = tasks.length;
  const done  = tasks.filter((t) => t.done).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      {PRIORITY_ORDER.map((p, i) => {
        const meta  = PRIORITY_META[p];
        const count = tasks.filter((t) => t.priority === p).length;
        return (
          <motion.div
            key={p}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.22, ease: "easeOut" }}
            className="stat-tile flex flex-col items-end justify-between px-5 py-3.5 min-w-[80px]"
          >
            <motion.span
              className="font-serif text-[2.6rem] leading-none font-bold"
              style={{ color: meta.color }}
              key={count}
              initial={{ scale: 1.25, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {count}
            </motion.span>
            <span
              className="mt-2 font-mono text-[9px] uppercase tracking-[1.8px]"
              style={{ color: "var(--muted)" }}
            >
              {meta.label}
            </span>
          </motion.div>
        );
      })}

      {/* Progress tile */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.22, ease: "easeOut" }}
        className="stat-tile flex flex-1 min-w-[200px] flex-col justify-between px-5 py-3.5"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[1.5px]" style={{ color: "var(--muted)" }}>
            {done} / {total} done
          </span>
          <motion.span
            className="font-serif text-[2rem] leading-none font-bold"
            style={{ color: pct === 100 ? "var(--low)" : "var(--gold-3)" }}
            key={pct}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {pct}%
          </motion.span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(32,36,63,0.08)" }}>
          <motion.div
            className="h-full rounded-full progress-bar-gold"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        </div>
      </motion.div>
    </div>
  );
}
