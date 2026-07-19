"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Priority } from "@/lib/mockData";

interface TemplateTask { title: string; priority: Priority; tags: string[]; project?: string }
interface Template { id: string; name: string; tasks: TemplateTask[] }

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (tasks: TemplateTask[]) => void;
  selectedTasks?: { title: string; priority: Priority; tags: string[]; project?: string }[];
}

const STORAGE_KEY = "taskflow_templates";

function loadTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTemplates(templates: Template[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export default function TemplatesModal({ open, onClose, onApply, selectedTasks }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saveName, setSaveName]   = useState("");
  const [tab, setTab]             = useState<"use" | "save">("use");

  useEffect(() => { if (open) setTemplates(loadTemplates()); }, [open]);

  const save = () => {
    if (!saveName.trim() || !selectedTasks?.length) return;
    const next = [...templates, { id: crypto.randomUUID(), name: saveName.trim(), tasks: selectedTasks }];
    setTemplates(next);
    saveTemplates(next);
    setSaveName("");
    setTab("use");
  };

  const del = (id: string) => {
    const next = templates.filter(t => t.id !== id);
    setTemplates(next);
    saveTemplates(next);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]" style={{ background: "rgba(32,36,63,0.40)", backdropFilter: "blur(4px)" }}
            onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(460px,92vw)] rounded overflow-hidden"
            style={{ background: "var(--card)", border: "1px solid var(--gold-border)", boxShadow: "0 20px 60px rgba(32,36,63,0.20)", maxHeight: "80vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ background: "var(--header)", borderBottom: "1px solid rgba(182,138,56,0.25)" }}>
              <h2 className="font-serif text-lg font-bold italic" style={{ color: "var(--gold-1)" }}>Task Templates</h2>
              <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded font-mono text-xs"
                style={{ border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.55)" }}>✕</button>
            </div>

            {/* Tabs */}
            <div className="flex" style={{ borderBottom: "1px solid var(--border-n)" }}>
              {(["use", "save"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="flex-1 py-3 font-mono text-[10px] uppercase tracking-[1.2px] transition-all"
                  style={{
                    color: tab === t ? "var(--text)" : "var(--muted)",
                    borderBottom: `2px solid ${tab === t ? "var(--gold-2)" : "transparent"}`,
                    background: "transparent",
                  }}>
                  {t === "use" ? "Use Template" : "Save Template"}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "calc(80vh - 120px)" }}>
              {tab === "use" && (
                <div className="p-4 space-y-2">
                  {templates.length === 0 ? (
                    <p className="text-center font-mono text-[10px] uppercase tracking-[1.5px] py-10" style={{ color: "var(--muted)" }}>
                      No templates yet — save one from selected tasks
                    </p>
                  ) : templates.map(t => (
                    <div key={t.id} className="rounded p-3 flex items-start justify-between gap-3"
                      style={{ background: "var(--card-2)", border: "1px solid var(--border-n)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{t.name}</p>
                        <p className="font-mono text-[9px] mt-0.5 uppercase tracking-[1px]" style={{ color: "var(--muted)" }}>
                          {t.tasks.length} task{t.tasks.length !== 1 ? "s" : ""}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {t.tasks.slice(0, 3).map((tk, i) => (
                            <span key={i} className="font-mono text-[8px] px-1.5 py-0.5 rounded uppercase"
                              style={{ background: `var(--${tk.priority})14`, color: `var(--${tk.priority})`, border: `1px solid var(--${tk.priority})28` }}>
                              {tk.title.slice(0, 24)}{tk.title.length > 24 ? "…" : ""}
                            </span>
                          ))}
                          {t.tasks.length > 3 && <span className="font-mono text-[8px]" style={{ color: "var(--muted)" }}>+{t.tasks.length - 3} more</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => { onApply(t.tasks); onClose(); }}
                          className="btn-gold rounded px-3 py-1.5 font-mono text-[9px] uppercase tracking-[1px]">
                          Apply
                        </button>
                        <button onClick={() => del(t.id)}
                          className="flex h-7 w-7 items-center justify-center rounded"
                          style={{ border: "1px solid rgba(158,43,58,0.25)", color: "var(--urgent)", background: "rgba(158,43,58,0.05)" }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "save" && (
                <div className="p-5 space-y-4">
                  {!selectedTasks?.length ? (
                    <p className="font-mono text-[10px] uppercase tracking-[1.2px]" style={{ color: "var(--urgent)" }}>
                      Select tasks first (use bulk select), then save as template
                    </p>
                  ) : (
                    <>
                      <p className="font-mono text-[10px] uppercase tracking-[1.2px]" style={{ color: "var(--muted)" }}>
                        Saving {selectedTasks.length} selected task{selectedTasks.length !== 1 ? "s" : ""} as template
                      </p>
                      <input value={saveName} onChange={e => setSaveName(e.target.value)}
                        placeholder="Template name (e.g. Weekly Review)"
                        className="w-full rounded border px-3 py-2.5 text-sm font-mono outline-none"
                        style={{ background: "var(--card-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                        onKeyDown={e => e.key === "Enter" && save()} />
                      <button onClick={save} disabled={!saveName.trim()}
                        className="btn-gold rounded w-full py-2.5 font-mono text-[10px] uppercase tracking-[1.4px] disabled:opacity-40">
                        Save Template
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
