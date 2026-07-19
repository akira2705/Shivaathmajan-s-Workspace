"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PRIORITY_META, PRIORITY_ORDER, Task, SubTask } from "@/lib/mockData";

export default function TaskCard({
  task,
  onToggle,
  onDelete,
  onChangePriority,
  onRename,
  onUpdateSubtasks,
  onFocus,
  bulkMode,
  selected,
  onSelect,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onChangePriority?: (id: string, priority: string) => void;
  onRename?: (id: string, title: string) => void;
  onUpdateSubtasks?: (id: string, subtasks: SubTask[]) => void;
  onFocus?: (title: string) => void;
  bulkMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const meta = PRIORITY_META[task.priority];
  const [editing, setEditing]       = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [burst, setBurst]           = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [newSub, setNewSub]         = useState("");

  const subtasks: SubTask[] = task.subtasks ?? [];
  const subDone = subtasks.filter(s => s.done).length;

  const isOverdue = !task.done && task.dueTime && (() => {
    const [h, m] = task.dueTime!.split(":").map(Number);
    const due = new Date(); due.setHours(h, m, 0, 0);
    return due < new Date();
  })();

  function commitRename() {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== task.title) onRename?.(task.id, trimmed);
    else setDraftTitle(task.title);
    setEditing(false);
  }

  function handleToggle() {
    if (!task.done) setBurst(true);
    onToggle(task.id);
  }

  function toggleSubtask(subId: string) {
    const updated = subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s);
    onUpdateSubtasks?.(task.id, updated);
  }

  function addSubtask() {
    const title = newSub.trim();
    if (!title) return;
    const updated = [...subtasks, { id: crypto.randomUUID(), title, done: false }];
    onUpdateSubtasks?.(task.id, updated);
    setNewSub("");
  }

  function deleteSubtask(subId: string) {
    onUpdateSubtasks?.(task.id, subtasks.filter(s => s.id !== subId));
  }

  const handleCardClick = () => {
    if (bulkMode) { onSelect?.(task.id); return; }
    if (!editing) handleToggle();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: task.done ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: 24 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`group relative flex task-card priority-hover-${task.priority}`}
      style={{
        borderColor: selected
          ? "var(--gold-border)"
          : isOverdue ? "rgba(158,43,58,0.22)" : "rgba(32,36,63,0.08)",
        boxShadow: selected ? "0 0 0 2px var(--gold-glow)" : undefined,
      }}
    >
      {/* Left priority bar */}
      <span className="shrink-0 w-[3px] rounded-l-sm" style={{ background: meta.color }} />

      <div className="flex-1 px-4 py-3.5">
        {/* Celebration burst */}
        <AnimatePresence>
          {burst && (
            <motion.span
              initial={{ opacity: 1, scale: 0.4 }}
              animate={{ opacity: 0, scale: 2.0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              onAnimationComplete={() => setBurst(false)}
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-xl"
            >✦</motion.span>
          )}
        </AnimatePresence>

        {/* Action buttons (top-right) */}
        <div className="absolute right-2.5 top-2.5 z-20 hidden items-center gap-1 group-hover:flex">
          {/* Focus / Pomodoro */}
          {onFocus && !task.done && (
            <motion.button
              onClick={(e) => { e.stopPropagation(); onFocus(task.title); }}
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              className="flex h-6 w-6 items-center justify-center rounded"
              style={{ border: "1px solid rgba(182,138,56,0.30)", color: "var(--gold-3)", background: "rgba(182,138,56,0.06)" }}
              title="Start focus timer"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="9"/><path strokeLinecap="round" d="M12 7v5l3 3"/>
              </svg>
            </motion.button>
          )}
          {/* Delete */}
          <motion.button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="flex h-6 w-6 items-center justify-center rounded"
            style={{ border: "1px solid rgba(158,43,58,0.25)", color: "var(--urgent)", background: "rgba(158,43,58,0.06)" }}
            aria-label="Delete task"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </motion.button>
        </div>

        <div className="flex items-start gap-3" onClick={handleCardClick} style={{ cursor: "pointer" }}>
          {/* Bulk checkbox or task checkbox */}
          {bulkMode ? (
            <motion.div
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border"
              animate={{
                backgroundColor: selected ? "var(--gold-2)" : "rgba(0,0,0,0)",
                borderColor: selected ? "var(--gold-2)" : "rgba(32,36,63,0.22)",
              }}
              transition={{ duration: 0.15 }}
            >
              {selected && (
                <svg width="10" height="10" viewBox="0 0 12 10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 5l3.5 3.5L11 1" />
                </svg>
              )}
            </motion.div>
          ) : (
            <motion.div
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border"
              animate={{
                backgroundColor: task.done ? meta.color : "rgba(0,0,0,0)",
                borderColor: task.done ? meta.color : "rgba(32,36,63,0.22)",
              }}
              transition={{ duration: 0.15 }}
            >
              <motion.svg
                width="10" height="10" viewBox="0 0 12 10" fill="none" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                initial={false}
                animate={{ opacity: task.done ? 1 : 0, scale: task.done ? 1 : 0.4 }}
                transition={{ duration: 0.15 }}
              >
                <path d="M1 5l3.5 3.5L11 1" />
              </motion.svg>
            </motion.div>
          )}

          <div className="flex-1 pr-7">
            {editing ? (
              <input
                autoFocus
                value={draftTitle}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") { setDraftTitle(task.title); setEditing(false); }
                }}
                className="w-full rounded border bg-transparent px-2 py-1 text-sm outline-none"
                style={{ borderColor: "var(--gold-border)", color: "var(--text)", boxShadow: "0 0 0 2px var(--gold-glow)" }}
              />
            ) : (
              <p
                className="text-sm font-medium leading-snug"
                onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
                style={{ textDecoration: task.done ? "line-through" : "none", color: task.done ? "var(--muted-2)" : "var(--text)" }}
              >
                {task.title}
              </p>
            )}

            {/* Tags row */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {/* Priority picker */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); if (!bulkMode) setPickerOpen(o => !o); }}
                  className="font-mono text-[9px] uppercase tracking-[1.2px] rounded px-2 py-0.5 transition-opacity hover:opacity-75"
                  style={{ background: `${meta.color}14`, color: meta.color, border: `1px solid ${meta.color}30` }}
                  title="Change priority"
                >
                  {meta.label} ▾
                </button>
                <AnimatePresence>
                  {pickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute left-0 bottom-full mb-1 z-50 rounded border p-1.5 flex flex-col gap-0.5 min-w-[130px]"
                      style={{ background: "var(--card)", borderColor: "var(--gold-border)", boxShadow: "0 8px 24px rgba(32,36,63,0.14)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {PRIORITY_ORDER.map(p => {
                        const m = PRIORITY_META[p];
                        return (
                          <button
                            key={p}
                            onClick={(e) => { e.stopPropagation(); setPickerOpen(false); if (p !== task.priority) onChangePriority?.(task.id, p); }}
                            className="flex items-center gap-2 rounded px-3 py-1.5 text-left font-mono text-[10px] uppercase tracking-wide transition-opacity hover:opacity-75"
                            style={{ background: p === task.priority ? `${m.color}14` : "transparent", color: m.color }}
                          >
                            {m.label}
                            {p === task.priority && <span className="ml-auto text-[10px]">✓</span>}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Project badge */}
              {task.project && (
                <span className="font-mono text-[9px] uppercase tracking-[1px] rounded px-2 py-0.5"
                  style={{ background: "rgba(27,36,84,0.07)", color: "var(--header)", border: "1px solid rgba(27,36,84,0.18)" }}>
                  {task.project}
                </span>
              )}

              {task.tags.map((t) => (
                <span key={t} className="font-mono text-[9px] uppercase tracking-[1px] rounded px-2 py-0.5"
                  style={{ background: "rgba(32,36,63,0.05)", color: "var(--muted)", border: "1px solid rgba(32,36,63,0.10)" }}>
                  {t}
                </span>
              ))}

              {task.dueTime && (
                <span className="font-mono text-[9px] uppercase tracking-[1px] rounded px-2 py-0.5"
                  style={{
                    background: isOverdue ? "rgba(158,43,58,0.08)" : "rgba(42,122,74,0.08)",
                    color: isOverdue ? "var(--urgent)" : "var(--low)",
                    border: `1px solid ${isOverdue ? "rgba(158,43,58,0.18)" : "rgba(42,122,74,0.16)"}`,
                  }}>
                  {isOverdue ? "OVERDUE" : "DUE"} {task.dueTime}
                </span>
              )}

              {task.streak !== undefined && task.streak > 0 && (
                <span className="font-mono text-[9px] uppercase tracking-[1px] rounded px-2 py-0.5"
                  style={{ background: "rgba(42,122,74,0.08)", color: "var(--low)", border: "1px solid rgba(42,122,74,0.16)" }}>
                  {task.streak}d streak
                </span>
              )}

              {task.recurring && task.recurring !== "none" && (
                <span className="font-mono text-[9px] uppercase tracking-[1px] rounded px-2 py-0.5"
                  style={{ background: "rgba(107,63,160,0.08)", color: "var(--followup)", border: "1px solid rgba(107,63,160,0.16)" }}>
                  ↻ {task.recurring}
                </span>
              )}

              {task.linkUrl && (
                <a href={task.linkUrl} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="font-mono text-[9px] uppercase tracking-[1px] rounded px-2 py-0.5"
                  style={{ background: "rgba(182,138,56,0.08)", color: "var(--gold-3)", border: "1px solid rgba(182,138,56,0.22)" }}>
                  {task.linkLabel ?? "Link"}
                </a>
              )}

              {/* Subtasks toggle */}
              {(subtasks.length > 0 || onUpdateSubtasks) && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSubtasksOpen(o => !o); }}
                  className="font-mono text-[9px] uppercase tracking-[1px] rounded px-2 py-0.5 transition-opacity hover:opacity-75"
                  style={{
                    background: subtasks.length > 0 ? "rgba(46,74,143,0.08)" : "rgba(32,36,63,0.04)",
                    color: subtasks.length > 0 ? "var(--medium)" : "var(--muted)",
                    border: `1px solid ${subtasks.length > 0 ? "rgba(46,74,143,0.20)" : "rgba(32,36,63,0.10)"}`,
                  }}
                >
                  {subtasks.length > 0 ? `${subDone}/${subtasks.length} subtasks` : "+ subtask"}
                </button>
              )}
            </div>

            {/* Subtasks panel */}
            <AnimatePresence>
              {subtasksOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mt-3 space-y-1.5 pl-1 border-l-2" style={{ borderColor: "var(--gold-border)" }}>
                    {subtasks.map(s => (
                      <div key={s.id} className="flex items-center gap-2 group/sub">
                        <button
                          onClick={() => toggleSubtask(s.id)}
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors"
                          style={{
                            background: s.done ? "var(--gold-2)" : "transparent",
                            borderColor: s.done ? "var(--gold-2)" : "rgba(32,36,63,0.22)",
                          }}
                        >
                          {s.done && (
                            <svg width="8" height="8" viewBox="0 0 12 10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 5l3.5 3.5L11 1" />
                            </svg>
                          )}
                        </button>
                        <span className="flex-1 text-xs" style={{ color: s.done ? "var(--muted)" : "var(--text-2)", textDecoration: s.done ? "line-through" : "none" }}>
                          {s.title}
                        </span>
                        <button
                          onClick={() => deleteSubtask(s.id)}
                          className="hidden h-4 w-4 items-center justify-center group-hover/sub:flex"
                          style={{ color: "var(--muted)" }}
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                    {/* Add subtask input */}
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        value={newSub}
                        onChange={e => setNewSub(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addSubtask(); }}
                        placeholder="Add subtask…"
                        className="flex-1 bg-transparent text-xs outline-none rounded border px-2 py-1"
                        style={{ borderColor: "rgba(182,138,56,0.20)", color: "var(--text)", caretColor: "var(--gold-3)" }}
                      />
                      <button onClick={addSubtask}
                        className="font-mono text-[9px] px-2 py-1 rounded btn-gold">
                        Add
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
