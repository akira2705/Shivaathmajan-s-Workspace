"use client";

import { motion, AnimatePresence } from "framer-motion";

const SHORTCUTS = [
  { key: "N",       desc: "Focus task input" },
  { key: "1–5",     desc: "Set priority while typing" },
  { key: "⌘K / /",  desc: "Open universal search" },
  { key: "?",       desc: "Show this shortcuts sheet" },
  { key: "Enter",   desc: "Add task" },
  { key: "Esc",     desc: "Close modals / cancel" },
  { key: "Tab",     desc: "Switch list ↔ board" },
];

export default function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]" style={{ background: "rgba(32,21,18,0.40)", backdropFilter: "blur(4px)" }}
            onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(420px,90vw)] rounded"
            style={{ background: "var(--card)", border: "1px solid var(--gold-border)", boxShadow: "0 20px 60px rgba(32,21,18,0.20)" }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-n)" }}>
              <div>
                <h2 className="font-serif text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>Keyboard Shortcuts</h2>
                <p className="font-mono text-[9px] uppercase tracking-[1.2px] mt-0.5" style={{ color: "var(--muted)" }}>Press ? to open anytime</p>
              </div>
              <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded btn-outline font-mono text-xs">✕</button>
            </div>
            <div className="px-5 py-4 space-y-2">
              {SHORTCUTS.map(s => (
                <div key={s.key} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--border-n)" }}>
                  <span className="text-sm" style={{ color: "var(--text-2)" }}>{s.desc}</span>
                  <kbd className="font-mono text-[10px] px-2 py-0.5 rounded"
                    style={{ background: "var(--header)", color: "var(--gold-2)", border: "1px solid rgba(184,48,26,0.30)" }}>
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
