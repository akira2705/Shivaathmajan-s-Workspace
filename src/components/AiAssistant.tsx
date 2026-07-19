"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Priority, Task } from "@/lib/mockData";
import { createTask } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "What should I focus on right now?",
  "Any urgent tasks I'm missing?",
  "Mark the invoice call done",
  "Add task: follow up on payment",
];

// ─── Action-tag protocol (kept in sync with src/lib/ai-skill.ts) ──────────
const ACTION_TAGS = [
  { name: "ADD_TASK",     re: /\[ADD_TASK:(\{.*?\})\]/g },
  { name: "COMPLETE_TASK",re: /\[COMPLETE_TASK:(\{.*?\})\]/g },
  { name: "REOPEN_TASK",  re: /\[REOPEN_TASK:(\{.*?\})\]/g },
  { name: "DELETE_TASK",  re: /\[DELETE_TASK:(\{.*?\})\]/g },
  { name: "SET_PRIORITY", re: /\[SET_PRIORITY:(\{.*?\})\]/g },
] as const;

function findByMatch(tasks: Task[], match: string): Task | undefined {
  const needle = (match ?? "").toLowerCase().trim();
  if (!needle) return undefined;
  return tasks.find(t => t.title.toLowerCase().includes(needle));
}

export default function AiAssistant({
  apiKey,
  tasks,
  onTaskCreated,
  onCompleteTask,
  onReopenTask,
  onDeleteTask,
  onSetPriority,
}: {
  apiKey: string;
  tasks: Task[];
  onTaskCreated: (task: Task) => void;
  onCompleteTask?: (id: string) => void;
  onReopenTask?: (id: string) => void;
  onDeleteTask?: (id: string) => void;
  onSetPriority?: (id: string, priority: Priority) => void;
}) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [dotFrame, setDotFrame] = useState(0);
  const scrollRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => setDotFrame(f => (f + 1) % 3), 420);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const pending = tasks.filter(t => !t.done);
  const context = {
    pendingCount:  pending.length,
    urgentCount:   pending.filter(t => t.priority === "urgent").length,
    todayCount:    pending.filter(t => t.dueDate === new Date().toISOString().slice(0, 10)).length,
    taskSummary:   pending.slice(0, 15).map(t =>
      `- [${t.priority}] ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}${t.dueTime ? ` at ${t.dueTime}` : ""}`
    ).join("\n"),
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], context, apiKey }),
      });
      const data  = await res.json();
      const reply: string = data.reply ?? data.error ?? "Something went wrong.";

      let clean = reply;
      let anyAction = false;

      for (const { name, re } of ACTION_TAGS) {
        for (const m of Array.from(reply.matchAll(re))) {
          anyAction = true;
          try {
            const payload = JSON.parse(m[1]);
            if (name === "ADD_TASK") {
              const saved = await createTask({ title: payload.title, priority: payload.priority || "medium", tags: [] });
              onTaskCreated(saved);
            } else if (name === "COMPLETE_TASK") {
              const t = findByMatch(tasks, payload.match);
              if (t) onCompleteTask?.(t.id);
            } else if (name === "REOPEN_TASK") {
              const t = findByMatch(tasks, payload.match);
              if (t) onReopenTask?.(t.id);
            } else if (name === "DELETE_TASK") {
              const t = findByMatch(tasks, payload.match);
              if (t) onDeleteTask?.(t.id);
            } else if (name === "SET_PRIORITY") {
              const t = findByMatch(tasks, payload.match);
              if (t && payload.priority) onSetPriority?.(t.id, payload.priority);
            }
          } catch { /* malformed action payload — drop the tag, keep the reply text */ }
        }
        clean = clean.replace(re, "").trim();
      }

      setMessages(prev => [...prev, { role: "assistant", content: anyAction ? clean : reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Can't reach AI right now. Check your connection." }]);
    } finally {
      setLoading(false);
    }
  };

  const dots = ["●○○", "○●○", "○○●"][dotFrame];

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.93 }}
        className="fixed z-50 flex items-center justify-center rounded-full"
        style={{
          bottom: 88, right: 20, width: 52, height: 52,
          background: "var(--gold-4)",
          boxShadow: "0 4px 18px rgba(184,48,26,0.40)",
        }}
        aria-label="AI Assistant">
        <AnimatePresence mode="wait">
          {open ? (
            <motion.svg key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </motion.svg>
          ) : (
            <motion.svg key="ai" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.18 }}
              width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="fixed z-50 flex flex-col rounded overflow-hidden"
            style={{
              bottom: 150, right: 20,
              width: "min(390px, calc(100vw - 32px))",
              height: "min(540px, calc(100vh - 200px))",
              background: "var(--card)",
              border: "1px solid var(--gold-border)",
              boxShadow: "0 20px 60px rgba(32,21,18,0.18), 0 0 0 1px rgba(184,48,26,0.10)",
            }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 shrink-0"
              style={{ background: "var(--header)", borderBottom: "1px solid rgba(184,48,26,0.25)" }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--gold-glow)", border: "1px solid rgba(184,48,26,0.35)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold-2)" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-serif text-sm font-bold tracking-tight" style={{ color: "var(--gold-2)" }}>
                  Assistant
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ade80" }} />
                  <p className="font-mono text-[9px] uppercase tracking-[1.2px]" style={{ color: "var(--muted)" }}>
                    {pending.length} pending · {context.urgentCount} urgent
                  </p>
                </div>
              </div>
              <button onClick={() => setMessages([])}
                className="font-mono text-[9px] uppercase tracking-[1px] px-2 py-1 rounded"
                style={{ color: "var(--muted-2)", border: "1px solid var(--border-n)" }}>
                Clear
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
              style={{ background: "var(--card)" }}>

              {/* Empty state */}
              {messages.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 pt-2">
                  <div>
                    <p className="font-serif text-base font-bold tracking-tight" style={{ color: "var(--text)" }}>
                      Hey there.
                    </p>
                    <p className="font-mono text-[11px] mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>
                      {context.urgentCount > 0
                        ? `You've got ${context.urgentCount} urgent task${context.urgentCount > 1 ? "s" : ""} waiting. Ask me anything.`
                        : `${context.pendingCount} things on your list. What do you need?`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {QUICK_PROMPTS.map((p, i) => (
                      <motion.button key={p}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                        onClick={() => send(p)}
                        className="text-left rounded px-3 py-2 font-mono text-[10px] leading-snug transition-all duration-150"
                        style={{
                          background: "var(--card-2)",
                          border: "1px solid var(--border-n)",
                          color: "var(--text-2)",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold-border)"; e.currentTarget.style.color = "var(--text)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-n)"; e.currentTarget.style.color = "var(--text-2)"; }}>
                        {p}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Message bubbles */}
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>

                    {/* Assistant avatar */}
                    {m.role === "assistant" && (
                      <div className="flex-none w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                        style={{ background: "var(--gold-glow)", border: "1px solid rgba(184,48,26,0.30)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--gold-2)" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                        </svg>
                      </div>
                    )}

                    <div className="max-w-[82%] rounded px-3 py-2.5 text-[13px] leading-relaxed"
                      style={{
                        background: m.role === "user" ? "var(--gold-4)" : "var(--card-2)",
                        color: m.role === "user" ? "#FFFFFF" : "var(--text)",
                        borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "2px 12px 12px 12px",
                        border: m.role === "assistant" ? "1px solid var(--border-n)" : "none",
                      }}>
                      {m.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {loading && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2">
                  <div className="flex-none w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "var(--gold-glow)", border: "1px solid rgba(184,48,26,0.30)" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--gold-2)" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    </svg>
                  </div>
                  <div className="rounded px-3 py-2.5" style={{ background: "var(--card-2)", border: "1px solid var(--border-n)", borderRadius: "2px 12px 12px 12px" }}>
                    <span className="font-mono text-[13px] tracking-[3px]" style={{ color: "var(--gold-3)" }}>{dots}</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 py-3 shrink-0"
              style={{ borderTop: "1px solid var(--border-n)", background: "var(--card)" }}>
              <div className="flex gap-2 items-center rounded"
                style={{ border: "1.5px solid var(--border)", background: "var(--card-2)", padding: "4px 4px 4px 12px" }}
                onFocus={() => {}} >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Ask anything…"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: "var(--text)", caretColor: "var(--gold-3)" }}
                />
                <motion.button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  whileHover={{ opacity: 0.88 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-gold rounded shrink-0 px-4 py-2 font-mono text-[10px] uppercase tracking-[1.2px] disabled:opacity-40">
                  Send
                </motion.button>
              </div>
              <p className="font-mono text-[8px] text-center mt-1.5 uppercase tracking-[1px]" style={{ color: "var(--muted-2)" }}>
                Enter to send · powered by Groq
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
