"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FocusTimerProps {
  taskTitle: string | null;
  onClose: () => void;
}

const WORK_SECS  = 25 * 60;
const BREAK_SECS = 5 * 60;

export default function FocusTimer({ taskTitle, onClose }: FocusTimerProps) {
  const [phase, setPhase]     = useState<"work" | "break">("work");
  const [secs, setSecs]       = useState(WORK_SECS);
  const [running, setRunning] = useState(true);
  const [sessions, setSessions] = useState(0);
  const intervalRef            = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) {
            if (phase === "work") {
              setSessions(n => n + 1);
              setPhase("break");
              if (Notification.permission === "granted") new Notification("Break time!", { body: "Nice work. Take 5." });
              return BREAK_SECS;
            } else {
              setPhase("work");
              if (Notification.permission === "granted") new Notification("Back to it!", { body: taskTitle ?? "Focus session" });
              return WORK_SECS;
            }
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase, taskTitle]);

  const total = phase === "work" ? WORK_SECS : BREAK_SECS;
  const pct   = ((total - secs) / total) * 100;
  const mm    = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss    = String(secs % 60).padStart(2, "0");
  const circ  = 2 * Math.PI * 36;

  return (
    <AnimatePresence>
      {taskTitle !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="fixed z-50 rounded overflow-hidden"
          style={{
            bottom: 88, left: 20,
            width: 240,
            background: "var(--card)",
            border: "1px solid var(--gold-border)",
            boxShadow: "0 8px 32px rgba(32,36,63,0.18)",
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ background: "var(--header)", borderBottom: "1px solid rgba(182,138,56,0.25)" }}>
            <p className="font-mono text-[9px] uppercase tracking-[1.5px] font-bold"
              style={{ color: phase === "work" ? "var(--gold-1)" : "var(--low)" }}>
              {phase === "work" ? "Focus" : "Break"}
            </p>
            <button onClick={onClose} className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>✕</button>
          </div>

          <div className="p-4 flex flex-col items-center gap-3">
            {/* Ring */}
            <div className="relative">
              <svg width="88" height="88" viewBox="0 0 88 88">
                <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(32,36,63,0.08)" strokeWidth="6"/>
                <circle cx="44" cy="44" r="36" fill="none"
                  stroke={phase === "work" ? "var(--gold-2)" : "var(--low)"}
                  strokeWidth="6"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - pct / 100)}
                  strokeLinecap="round"
                  transform="rotate(-90 44 44)"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
                  {mm}:{ss}
                </span>
              </div>
            </div>

            {/* Task name */}
            <p className="text-center text-xs leading-snug line-clamp-2" style={{ color: "var(--muted)" }}>
              {taskTitle}
            </p>

            {/* Sessions */}
            {sessions > 0 && (
              <p className="font-mono text-[9px] uppercase tracking-[1.2px]" style={{ color: "var(--gold-3)" }}>
                {sessions} session{sessions > 1 ? "s" : ""} done
              </p>
            )}

            {/* Controls */}
            <div className="flex gap-2 w-full">
              <button onClick={() => setRunning(r => !r)}
                className="flex-1 btn-gold rounded py-2 font-mono text-[9px] uppercase tracking-[1.2px]">
                {running ? "Pause" : "Resume"}
              </button>
              <button onClick={() => { setSecs(WORK_SECS); setPhase("work"); setRunning(false); }}
                className="flex-1 btn-outline rounded py-2 font-mono text-[9px] uppercase tracking-[1.2px]">
                Reset
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
