"use client";
import { todayStr } from "@/lib/date";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/AppShell";
import StatBar from "@/components/StatBar";
import TaskCard from "@/components/TaskCard";
import SettingsModal from "@/components/SettingsModal";
import DailyBriefing from "@/components/DailyBriefing";
import FocusTimer from "@/components/FocusTimer";
import SearchModal from "@/components/SearchModal";
import ShortcutsModal from "@/components/ShortcutsModal";
import TemplatesModal from "@/components/TemplatesModal";
import AiAssistant from "@/components/AiAssistant";
import { useIsMobile } from "@/lib/useIsMobile";
import { useApiKey } from "@/lib/useApiKey";
import { fetchTasks, createTask, updateTask, deleteTaskApi, bulkActionApi } from "@/lib/api";
import { findSimilarTask, isSimilarTitle } from "@/lib/fuzzy";
import { parseNaturalDate } from "@/lib/dateParse";
import { usePushSubscription } from "@/lib/usePushSubscription";
import {
  PRIORITY_META,
  PRIORITY_ORDER,
  Priority,
  Recurrence,
  Task,
  SubTask,
} from "@/lib/mockData";

type ViewMode = "list" | "board";
type FilterMode = "all" | Priority | "done";
const PROJECTS = ["Work", "Personal", "Errands", "Learning"];

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "urgent",   label: "Urgent" },
  { key: "high",     label: "High" },
  { key: "medium",   label: "Medium" },
  { key: "low",      label: "Low" },
  { key: "followup", label: "Follow-up" },
  { key: "done",     label: "Done" },
];

const RECURRENCE_OPTIONS: { key: Recurrence; label: string }[] = [
  { key: "none",    label: "One-time" },
  { key: "daily",   label: "↻ Daily" },
  { key: "weekly",  label: "↻ Weekly" },
  { key: "monthly", label: "↻ Monthly" },
];

// Quick-date shortcuts for the due-date field (feature: natural-language
// dates without a native <input type="date"> accepting free text).
const QUICK_DATE_OPTIONS: { value: string; label: string }[] = [
  { value: "today",     label: "Today" },
  { value: "tomorrow",  label: "Tomorrow" },
  { value: "monday",    label: "Next Mon" },
  { value: "tuesday",   label: "Next Tue" },
  { value: "wednesday", label: "Next Wed" },
  { value: "thursday",  label: "Next Thu" },
  { value: "friday",    label: "Next Fri" },
  { value: "saturday",  label: "Next Sat" },
  { value: "sunday",    label: "Next Sun" },
  { value: "in 3 days", label: "In 3 days" },
  { value: "in 7 days", label: "In 7 days" },
];

export default function TasksPage() {
  const [tasks, setTasks]                     = useState<Task[]>([]);
  const [dayInfo, setDayInfo]                 = useState<{ day_number: number; date: string } | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [view, setView]                       = useState<ViewMode>("list");
  const [filter, setFilter]                   = useState<FilterMode>("all");
  const [search, setSearch]                   = useState("");
  const [draft, setDraft]                     = useState("");
  const [draftPriority, setDraftPriority]     = useState<Priority>("medium");
  const [draftDueTime, setDraftDueTime]       = useState("");
  const [draftDueDate, setDraftDueDate]       = useState("");
  const [draftRecurring, setDraftRecurring]   = useState<Recurrence>("none");
  const [listening, setListening]             = useState(false);
  const [interim, setInterim]                 = useState("");
  const [sttError, setSttError]               = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen]       = useState(false);
  const [undoTask, setUndoTask]               = useState<Task | null>(null);
  const [undoIndex, setUndoIndex]             = useState(0);
  const [archiveOpen, setArchiveOpen]         = useState(false);
  const [archive, setArchive]                 = useState<Task[]>([]);
  const [bulkMode, setBulkMode]               = useState(false);
  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set());
  const [focusTask, setFocusTask]             = useState<string | null>(null);
  const [searchOpen, setSearchOpen]           = useState(false);
  const [shortcutsOpen, setShortcutsOpen]     = useState(false);
  const [templatesOpen, setTemplatesOpen]     = useState(false);
  const [projectFilter, setProjectFilter]     = useState<string | null>(null);
  const [aiBusy, setAiBusy]                   = useState(false);
  const [aiError, setAiError]                 = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen]         = useState(false);
  const [summary, setSummary]                 = useState<string | null>(null);
  const [dupWarning, setDupWarning]           = useState<string | null>(null);
  const [recurringSuggestion, setRecurringSuggestion] = useState<{ id: string; title: string; count: number; pattern: Recurrence } | null>(null);
  const isMobile = useIsMobile();
  const { apiKey, setApiKey } = useApiKey();
  const { subscribed: pushSubscribed } = usePushSubscription();

  const undoTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef       = useRef<HTMLDivElement | null>(null);
  const groupRefs      = useRef<Partial<Record<Priority, HTMLDivElement | null>>>({});
  const dupWarningTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recurringSuggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiCallTimestamps      = useRef<number[]>([]); // rolling window for the soft AI rate-limit

  const pendingRef = useRef<Map<string, { task: Task | null; expires: number }>>(new Map());
  const setPending = useCallback((id: string, task: Task | null, ms = 4000) => {
    pendingRef.current.set(id, { task, expires: Date.now() + ms });
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const { tasks: storedTasks, day } = await fetchTasks();
      const now = Date.now();
      for (const [id, p] of pendingRef.current) if (p.expires < now) pendingRef.current.delete(id);
      let result = storedTasks
        .map(t => pendingRef.current.get(t.id)?.task ?? t)
        .filter(t => pendingRef.current.get(t.id)?.task !== null);
      const storedIds = new Set(storedTasks.map(t => t.id));
      for (const [id, p] of pendingRef.current) {
        if (p.task && !storedIds.has(id)) result = [p.task, ...result];
      }
      setTasks(result);
      setDayInfo(day);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ─── Push snapshot to server (Redis) for the daily-briefing cron ─────────
  // The Vercel Cron job that delivers the push notification has no access
  // to this browser's localStorage, so we mirror a compact, privacy-minimal
  // snapshot (title/priority/done/dueDate only) to the server whenever the
  // task list actually changes — throttled to at most once per ~30s so
  // rapid edits don't spam the API. Gated on `pushSubscribed`: Settings
  // promises "nothing is sent unless you opt in" — this must actually be
  // true, not just true of the push delivery step.
  const snapshotSerializedRef = useRef<string>("");
  const snapshotLastSentAtRef = useRef<number>(0);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!pushSubscribed) return;
    const compact = tasks.map((t) => ({ title: t.title, priority: t.priority, done: t.done, dueDate: t.dueDate }));
    const serialized = JSON.stringify(compact);
    if (serialized === snapshotSerializedRef.current) return;

    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    const wait = Math.max(0, 30_000 - (Date.now() - snapshotLastSentAtRef.current));
    snapshotTimerRef.current = setTimeout(() => {
      snapshotSerializedRef.current = serialized;
      snapshotLastSentAtRef.current = Date.now();
      fetch("/api/tasks/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: compact }),
      }).catch(() => { /* best-effort — snapshot sync isn't user-facing */ });
    }, wait);
    return () => { if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current); };
  }, [tasks, pushSubscribed]);

  // ─── Speech-to-text (native browser SpeechRecognition only — no server
  //     transcription fallback since there's no backend in this demo) ──────
  const isListeningRef = useRef(false);

  async function toggleListening() {
    setSttError(null);
    if (isListeningRef.current) {
      isListeningRef.current = false;
      setListening(false);
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.stop(); recognitionRef.current = null; }
      return;
    }
    const Ctor = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!Ctor) {
      setSttError("Speech recognition not supported in this browser");
      return;
    }
    const r = new Ctor();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    r.onstart = () => { isListeningRef.current = true; setListening(true); };
    r.onresult = (event: SpeechRecognitionEvent) => {
      let final = ""; let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      setInterim(interim);
      if (final.trim()) { setDraft((p) => `${p}${p ? " " : ""}${final.trim()}`); setInterim(""); }
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      if (interim.trim()) {
        silenceTimer.current = setTimeout(() => {
          setInterim((cur) => { if (cur.trim()) setDraft((p) => `${p}${p ? " " : ""}${cur.trim()}`); return ""; });
        }, 3000);
      }
    };
    r.onerror = () => {
      recognitionRef.current = null;
      if (!isListeningRef.current) setSttError("Speech recognition not supported in this browser");
    };
    r.onend = () => { if (isListeningRef.current && recognitionRef.current === r) { try { r.start(); } catch { /* ignore */ } } };
    recognitionRef.current = r;
    try {
      r.start();
    } catch {
      recognitionRef.current = null;
      setSttError("Speech recognition not supported in this browser");
    }
  }

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      tasks.filter((t) => !t.done && t.dueTime === hhmm).forEach((t) => new Notification("Task due now", { body: t.title }));
    }, 30_000);
    return () => clearInterval(id);
  }, [tasks]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const typing = ["INPUT","TEXTAREA","SELECT"].includes(tag);
      if (!typing && e.key.toLowerCase() === "n") { e.preventDefault(); (inputRef.current as unknown as HTMLInputElement)?.focus(); return; }
      if (!typing && e.key === "?") { e.preventDefault(); setShortcutsOpen(o => !o); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); return; }
      if (!typing && e.key === "/") { e.preventDefault(); setSearchOpen(true); return; }
      if (!typing && e.key === "Tab") { e.preventDefault(); setView(v => v === "list" ? "board" : "list"); return; }
      if (typing && document.activeElement === (inputRef.current as unknown as HTMLInputElement) && e.key >= "1" && e.key <= "5") {
        e.preventDefault(); setDraftPriority(PRIORITY_ORDER[Number(e.key) - 1]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ─── Recurring-pattern detection ──────────────────────────────────────────
  // Cheap client-side heuristic (no AI call): if a one-off task's title
  // closely matches ≥2 archived tasks, and their due dates are roughly a
  // week or month apart, suggest turning it into a recurring task.
  function detectRecurringPattern(task: Task, archived: Task[]): { count: number; pattern: Recurrence } | null {
    if (task.recurring && task.recurring !== "none") return null;
    const matches = archived.filter((a) => isSimilarTitle(task.title, a.title));
    if (matches.length < 2) return null;

    const dates = [task.dueDate, ...matches.map((m) => m.dueDate)]
      .filter((d): d is string => Boolean(d))
      .sort();
    let pattern: Recurrence = "weekly";
    if (dates.length >= 2) {
      const deltas: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        deltas.push(Math.round((new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) / 86_400_000));
      }
      const avg = deltas.reduce((s, d) => s + d, 0) / deltas.length;
      pattern = avg >= 20 ? "monthly" : "weekly";
    }
    return { count: matches.length + 1, pattern };
  }

  // ─── Mutations ───────────────────────────────────────────────────────────────
  async function toggle(id: string) {
    const task = tasks.find((t) => t.id === id); if (!task) return;
    const updated = { ...task, done: !task.done };
    setPending(id, updated); setTasks((p) => p.map((t) => t.id === id ? updated : t));
    await updateTask(id, { done: updated.done });

    if (updated.done) {
      const suggestion = detectRecurringPattern(updated, archive);
      if (suggestion) {
        setRecurringSuggestion({ id, title: task.title, count: suggestion.count, pattern: suggestion.pattern });
        if (recurringSuggestionTimer.current) clearTimeout(recurringSuggestionTimer.current);
        recurringSuggestionTimer.current = setTimeout(() => setRecurringSuggestion(null), 8000);
      }
    }
  }

  async function acceptRecurringSuggestion() {
    if (!recurringSuggestion) return;
    const { id, pattern } = recurringSuggestion;
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, recurring: pattern } : t)));
    await updateTask(id, { recurring: pattern });
    setRecurringSuggestion(null);
    if (recurringSuggestionTimer.current) clearTimeout(recurringSuggestionTimer.current);
  }

  async function deleteTask(id: string) {
    const idx = tasks.findIndex((t) => t.id === id);
    const victim = tasks[idx];
    setUndoTask(victim); setUndoIndex(idx);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoTask(null), 6000);
    setPending(id, null); setTasks((p) => p.filter((t) => t.id !== id));
    await deleteTaskApi(id);
  }

  async function undoDelete() {
    if (!undoTask) return;
    const restored = await createTask({ title: undoTask.title, priority: undoTask.priority, tags: undoTask.tags, dueTime: undoTask.dueTime, recurring: undoTask.recurring });
    setPending(restored.id, restored);
    setTasks((p) => { const n = [...p]; n.splice(Math.min(undoIndex, n.length), 0, restored); return n; });
    setUndoTask(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }

  async function renameTask(id: string, title: string) {
    const task = tasks.find((t) => t.id === id); if (!task) return;
    const updated = { ...task, title };
    setPending(id, updated); setTasks((p) => p.map((t) => t.id === id ? updated : t));
    await updateTask(id, { title });
  }

  async function changePriority(id: string, priority: string) {
    const task = tasks.find((t) => t.id === id); if (!task) return;
    const updated = { ...task, priority: priority as Priority };
    setPending(id, updated); setTasks((p) => p.map((t) => t.id === id ? updated : t));
    await updateTask(id, { priority: priority as Priority });
  }

  async function updateSubtasks(id: string, subtasks: SubTask[]) {
    const task = tasks.find((t) => t.id === id); if (!task) return;
    const updated = { ...task, subtasks };
    setPending(id, updated); setTasks((p) => p.map((t) => t.id === id ? updated : t));
    await updateTask(id, { subtasks });
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function bulkAction(action: string, value?: string) {
    const ids = Array.from(selectedIds); if (!ids.length) return;
    await bulkActionApi(ids, action, value);
    if (action === "delete") { ids.forEach(id => setPending(id, null)); setTasks(p => p.filter(t => !ids.includes(t.id))); }
    if (action === "done")   { setTasks(p => p.map(t => ids.includes(t.id) ? { ...t, done: true } : t)); }
    if (action === "undone") { setTasks(p => p.map(t => ids.includes(t.id) ? { ...t, done: false } : t)); }
    if (action === "priority" && value) { setTasks(p => p.map(t => ids.includes(t.id) ? { ...t, priority: value as Priority } : t)); }
    setSelectedIds(new Set()); setBulkMode(false);
  }

  // Same shape as bulkAction above, but driven by the chat assistant's
  // BULK_ACTION tag rather than the selection-mode toolbar — so it doesn't
  // touch selectedIds/bulkMode. "reopen" maps to bulkActionApi's "undone".
  async function bulkActionFromAi(ids: string[], action: "complete" | "delete" | "reopen") {
    if (!ids.length) return;
    const apiAction = action === "complete" ? "done" : action === "reopen" ? "undone" : "delete";
    await bulkActionApi(ids, apiAction);
    if (apiAction === "delete") { ids.forEach(id => setPending(id, null)); setTasks(p => p.filter(t => !ids.includes(t.id))); }
    if (apiAction === "done")   { setTasks(p => p.map(t => ids.includes(t.id) ? { ...t, done: true } : t)); }
    if (apiAction === "undone") { setTasks(p => p.map(t => ids.includes(t.id) ? { ...t, done: false } : t)); }
  }

  function printPage() { window.print(); }

  async function clearCompleted() {
    const done = tasks.filter((t) => t.done); if (done.length === 0) return;
    setArchive((prev) => [...done, ...prev]);
    done.forEach((t) => setPending(t.id, null));
    setTasks((p) => p.filter((t) => !t.done));
    await Promise.all(done.map((t) => deleteTaskApi(t.id)));
    setArchiveOpen(true);
  }

  async function addTask(overrides?: Partial<Task>) {
    const title = (overrides?.title ?? draft).trim(); if (!title) return;

    // Duplicate-task detection — cheap client-side fuzzy match against
    // other undone tasks. Doesn't block the add, just warns.
    const dup = findSimilarTask(title, tasks.filter((t) => !t.done));
    if (dup) {
      setDupWarning(dup.title);
      if (dupWarningTimer.current) clearTimeout(dupWarningTimer.current);
      dupWarningTimer.current = setTimeout(() => setDupWarning(null), 4000);
    }

    const payload = { title, priority: overrides?.priority ?? draftPriority, tags: overrides?.tags ?? [], dueTime: overrides?.dueTime ?? (draftDueTime || undefined), dueDate: overrides?.dueDate ?? (draftDueDate || undefined), recurring: overrides?.recurring ?? draftRecurring };
    setDraft(""); setDraftDueTime(""); setDraftDueDate(""); setDraftRecurring("none");
    try {
      const saved = await createTask(payload);
      setPending(saved.id, saved); setTasks((p) => [saved, ...p]);
    } catch (err) { alert(`Failed to add task: ${err instanceof Error ? err.message : err}`); setDraft(title); }
  }

  async function aiQuickAdd() {
    const text = draft.trim(); if (!text) return;
    setAiBusy(true); setAiError(null);
    try {
      const res = await fetch("/api/ai/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, apiKey }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");
      await addTask({ title: data.title, priority: data.priority, tags: data.tags, dueTime: data.dueTime ?? undefined, dueDate: data.dueDate ?? undefined });
    } catch (err) { setAiError(err instanceof Error ? err.message : "AI request failed"); }
    finally { setAiBusy(false); }
  }

  async function generateSummary() {
    setAiBusy(true); setAiError(null); setSummaryOpen(true); setSummary(null);
    try {
      const res = await fetch("/api/ai/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tasks, apiKey }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");
      setSummary(data.summary);
    } catch (err) { setAiError(err instanceof Error ? err.message : "AI request failed"); setSummaryOpen(false); }
    finally { setAiBusy(false); }
  }

  // ─── AI auto-suggest ──────────────────────────────────────────────────────────
  const [aiSuggestion, setAiSuggestion] = useState<{ priority: string; tags: string[] } | null>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSuggested = useRef("");

  useEffect(() => {
    if (!apiKey || draft.length < 10 || draft === lastSuggested.current) { setAiSuggestion(null); return; }
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      // Soft self-imposed rate-limit: skip silently if we've already made
      // more than 8 AI-suggest calls in the last 60s (fast typists / no
      // debounce edge cases shouldn't burn through a Groq quota).
      const now = Date.now();
      aiCallTimestamps.current = aiCallTimestamps.current.filter((t) => now - t < 60_000);
      if (aiCallTimestamps.current.length > 8) return;
      aiCallTimestamps.current.push(now);

      try {
        const res = await fetch("/api/ai/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: draft, apiKey }) });
        const data = await res.json();
        if (res.ok && data.priority && data.priority !== draftPriority) {
          lastSuggested.current = draft;
          setAiSuggestion({ priority: data.priority, tags: data.tags ?? [] });
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => { if (suggestTimer.current) clearTimeout(suggestTimer.current); };
  }, [draft, apiKey, draftPriority]);

  const filtered = useMemo(() => {
    let r = tasks;
    if (filter === "done") r = r.filter((t) => t.done);
    else if (filter !== "all") r = r.filter((t) => t.priority === filter);
    if (projectFilter) r = r.filter((t) => t.project === projectFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((t) => t.title.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q)));
    }
    return r;
  }, [tasks, filter, search, projectFilter]);

  const displayDate = dayInfo
    ? new Date(dayInfo.date).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  // ─── Icon SVGs ───────────────────────────────────────────────────────────────
  const SettingsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );

  const MicIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
    </svg>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <AppShell
        active="tasks"
        title="Today"
        subtitle={displayDate}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(o => !o)}
        onOpenSettings={() => setSettingsOpen(true)}
      >

          {/* Daily Briefing */}
          <DailyBriefing tasks={tasks} />

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
          >
            <StatBar tasks={tasks} />
          </motion.div>

          {/* Gold rule */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="gold-rule my-6"
          />

          {/* Input bar — pill shape */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28 }}
            className="glow-focus transition-all duration-200"
            style={{
              background: "var(--card)",
              border: "2px solid var(--gold-border)",
              borderRadius: "99px",
              padding: "6px 6px 6px 20px",
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              {/* Mic button */}
              <motion.button
                onClick={toggleListening}
                animate={listening ? { boxShadow: ["0 0 0 0 rgba(184,48,26,0.55)", "0 0 0 10px rgba(184,48,26,0)"] } : { boxShadow: "none" }}
                transition={listening ? { duration: 1.3, repeat: Infinity } : {}}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  border: `1px solid ${listening ? "var(--gold-border)" : "rgba(32,21,18,0.14)"}`,
                  background: listening ? "var(--gold-glow)" : "transparent",
                  color: listening ? "var(--gold-3)" : "var(--muted)",
                }}
                title={listening ? "Stop listening" : "Voice input"}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
              >
                <MicIcon />
              </motion.button>

              {/* Text input */}
              <div className="relative min-w-[160px] flex-1 flex items-center">
                <input
                  ref={(el) => { inputRef.current = el as unknown as HTMLDivElement; }}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  className="bg-transparent outline-none w-full text-sm"
                  style={{ color: "var(--text)", caretColor: "var(--high)" }}
                  placeholder={!draft && !interim && !listening ? "Type a task…  ( N · 1–5 )" : ""}
                />
                {interim && (
                  <motion.span
                    key={interim}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="ml-1 text-sm select-none"
                    style={{ color: "var(--muted-2)" }}
                  >
                    {interim}
                  </motion.span>
                )}
                {listening && !interim && !draft && (
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    className="text-sm select-none font-mono"
                    style={{ color: "var(--gold-3)" }}
                  >
                    Speak now…
                  </motion.span>
                )}
              </div>

              {/* Priority select */}
              <select
                value={draftPriority}
                onChange={(e) => setDraftPriority(e.target.value as Priority)}
                className="rounded border bg-transparent px-2 py-1.5 font-mono text-[10px] uppercase tracking-wide outline-none"
                style={{ borderColor: "rgba(32,21,18,0.12)", color: PRIORITY_META[draftPriority].color }}
              >
                {PRIORITY_ORDER.map((p) => (
                  <option key={p} value={p} style={{ background: "#FFFFFF", color: "#201512" }}>{PRIORITY_META[p].label}</option>
                ))}
              </select>

              {/* Due time */}
              <div className="flex items-center gap-1 rounded border px-2.5 py-1.5 font-mono text-[10px]"
                style={{ borderColor: "rgba(32,21,18,0.12)" }} title="Due time">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: "var(--muted)" }}>
                  <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.75 3.75" />
                </svg>
                <input type="number" min={0} max={23} value={draftDueTime ? draftDueTime.split(":")[0] : ""} onChange={(e) => { const hh = e.target.value.padStart(2,"0").slice(-2); const mm = draftDueTime ? draftDueTime.split(":")[1] : "00"; setDraftDueTime(hh + ":" + mm); }} placeholder="HH" className="w-7 bg-transparent text-center outline-none appearance-none" style={{ color: "var(--low)", MozAppearance: "textfield" } as React.CSSProperties} />
                <span style={{ color: "var(--muted)" }}>:</span>
                <input type="number" min={0} max={59} value={draftDueTime ? draftDueTime.split(":")[1] : ""} onChange={(e) => { const mm = e.target.value.padStart(2,"0").slice(-2); const hh = draftDueTime ? draftDueTime.split(":")[0] : "00"; setDraftDueTime(hh + ":" + mm); }} placeholder="MM" className="w-7 bg-transparent text-center outline-none appearance-none" style={{ color: "var(--low)", MozAppearance: "textfield" } as React.CSSProperties} />
                {draftDueTime && <button onClick={() => setDraftDueTime("")} className="ml-1 text-[9px]" style={{ color: "var(--muted)" }}>✕</button>}
              </div>

              {/* Due date */}
              <div className="flex items-center gap-1 rounded border px-2.5 py-1.5 font-mono text-[10px]"
                style={{ borderColor: "rgba(32,21,18,0.12)" }} title="Due date">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: "var(--muted)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <input type="date" value={draftDueDate} onChange={(e) => setDraftDueDate(e.target.value)} className="bg-transparent outline-none text-[10px]" style={{ color: "var(--low)", colorScheme: "light" }} />
                {draftDueDate && <button onClick={() => setDraftDueDate("")} className="ml-1 text-[9px]" style={{ color: "var(--muted)" }}>✕</button>}
                {/* Quick date — native date inputs can't parse free text, so
                    "today/tomorrow/next friday/in N days" live here instead. */}
                <select
                  value=""
                  onChange={(e) => {
                    const parsed = parseNaturalDate(e.target.value);
                    if (parsed) setDraftDueDate(parsed);
                  }}
                  className="bg-transparent outline-none text-[9px] uppercase tracking-wide ml-1"
                  style={{ color: "var(--muted)" }}
                  title="Quick date"
                >
                  <option value="" style={{ background: "#FFFFFF", color: "#201512" }}>Quick…</option>
                  {QUICK_DATE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} style={{ background: "#FFFFFF", color: "#201512" }}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Recurrence */}
              <select value={draftRecurring} onChange={(e) => setDraftRecurring(e.target.value as Recurrence)}
                className="rounded border bg-transparent px-2 py-1.5 font-mono text-[10px] uppercase tracking-wide outline-none"
                style={{ borderColor: "rgba(32,21,18,0.12)", color: "var(--followup)" }}>
                {RECURRENCE_OPTIONS.map((r) => (
                  <option key={r.key} value={r.key} style={{ background: "#FFFFFF", color: "#201512" }}>{r.label}</option>
                ))}
              </select>

              {/* Add button — gold pill */}
              <motion.button
                onClick={() => addTask()}
                whileHover={{ opacity: 0.88 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.1 }}
                className="btn-gold rounded-full px-5 py-2 text-[11px] font-mono uppercase tracking-[1.5px]"
              >
                + Add
              </motion.button>

              {/* AI Add button */}
              <motion.button
                onClick={aiQuickAdd}
                disabled={aiBusy}
                whileHover={{ borderColor: "var(--gold-border)", color: "var(--text-2)", background: "var(--gold-glow)" }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.1 }}
                className="rounded-full border px-4 py-2 text-[11px] font-mono font-semibold uppercase tracking-[1px] disabled:opacity-50"
                style={{ borderColor: "rgba(32,21,18,0.14)", color: "var(--muted)" }}
                title="AI parse"
              >
                {aiBusy ? "AI…" : "AI Add"}
              </motion.button>
            </div>

            {/* Errors */}
            {(sttError || aiError) && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mt-2 ml-4 font-mono text-[10px]" style={{ color: "var(--urgent)" }}>
                {sttError || aiError}
              </motion.div>
            )}

            {/* AI suggestion */}
            <AnimatePresence>
              {aiSuggestion && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 font-mono text-[10px] mt-2 ml-4">
                  <span style={{ color: "var(--muted)" }}>AI suggests:</span>
                  <button onClick={() => { setDraftPriority(aiSuggestion.priority as Priority); setAiSuggestion(null); }}
                    className="rounded border px-2 py-0.5 uppercase tracking-wide"
                    style={{ borderColor: `var(--${aiSuggestion.priority})`, color: `var(--${aiSuggestion.priority})` }}>
                    {aiSuggestion.priority}
                  </button>
                  {aiSuggestion.tags.length > 0 && <span style={{ color: "var(--muted)" }}>{aiSuggestion.tags.join(", ")}</span>}
                  <button onClick={() => setAiSuggestion(null)} className="text-[9px]" style={{ color: "var(--muted)" }}>✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Duplicate-task warning — same visual language as the undo
                toast (rounded card, gold border), dismissible, auto-clears. */}
            <AnimatePresence>
              {dupWarning && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 mt-2 ml-4 rounded px-3 py-1.5"
                  style={{ background: "var(--card)", border: "1px solid var(--gold-border)" }}>
                  <span className="font-mono text-[10px]" style={{ color: "var(--text-2)" }}>
                    Similar to an existing task: &ldquo;{dupWarning.slice(0, 48)}{dupWarning.length > 48 ? "…" : ""}&rdquo;
                  </span>
                  <button onClick={() => setDupWarning(null)} className="text-[9px]" style={{ color: "var(--muted)" }}>✕</button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Overdue banner */}
          {(() => {
            const today = todayStr();
            const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && !t.done);
            if (overdue.length === 0) return null;
            return (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded flex items-center justify-between px-4 py-3"
                style={{ border: "1px solid rgba(192,40,26,0.25)", background: "rgba(192,40,26,0.05)" }}>
                <span className="font-mono text-[10px] uppercase tracking-[1.5px] font-bold" style={{ color: "var(--urgent)" }}>
                  {overdue.length} Overdue Task{overdue.length !== 1 ? "s" : ""}
                </span>
                <button onClick={() => setFilter("all")} className="font-mono text-[10px] uppercase tracking-wide" style={{ color: "var(--urgent)" }}>
                  View all
                </button>
              </motion.div>
            );
          })()}

          {/* ── Toolbar ─────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.38 }}
            className="mt-7 flex flex-wrap items-center justify-between gap-4"
          >
            {/* Left controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View toggle */}
              <div className="flex rounded overflow-hidden" style={{ border: "1px solid rgba(32,21,18,0.14)" }}>
                {(["list","board"] as ViewMode[]).map((v) => (
                  <button key={v} onClick={() => setView(v)}
                    className="relative px-4 py-1.5 font-mono text-[10px] uppercase tracking-[1.2px] transition-all duration-150"
                    style={{
                      background: view === v ? "var(--gold-2)" : "var(--card)",
                      color: view === v ? "var(--card)" : "var(--muted)",
                      borderRight: v === "list" ? "1px solid rgba(32,21,18,0.14)" : "none",
                    }}>
                    {v === "list" ? "List" : "Board"}
                  </button>
                ))}
              </div>

              {/* Search */}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks or tags…"
                className="rounded border bg-transparent px-4 py-1.5 font-mono text-[10px] outline-none min-w-[180px] transition-all duration-150"
                style={{ borderColor: "rgba(32,21,18,0.14)", color: "var(--text)" }}
              />

              {/* Project filter */}
              <select value={projectFilter ?? ""} onChange={e => setProjectFilter(e.target.value || null)}
                className="rounded border bg-transparent px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide outline-none"
                style={{ borderColor: "rgba(32,21,18,0.14)", color: projectFilter ? "var(--medium)" : "var(--muted)" }}>
                <option value="" style={{ background: "#FFFFFF", color: "#201512" }}>All Projects</option>
                {PROJECTS.map(p => <option key={p} value={p} style={{ background: "#FFFFFF", color: "#201512" }}>{p}</option>)}
              </select>

              {/* Action buttons */}
              <button onClick={generateSummary}
                className="btn-outline rounded px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[1.2px]">
                Summary
              </button>
              <button onClick={clearCompleted}
                className="btn-outline rounded px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[1.2px]">
                Clear Done
              </button>

              {/* Bulk select */}
              <button onClick={() => { setBulkMode(o => !o); setSelectedIds(new Set()); }}
                className="btn-outline rounded px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[1.2px]"
                style={bulkMode ? { borderColor: "var(--gold-border)", color: "var(--gold-3)", background: "var(--gold-glow)" } : {}}>
                {bulkMode ? `✓ ${selectedIds.size} selected` : "Select"}
              </button>

              {/* Templates */}
              <button onClick={() => setTemplatesOpen(true)}
                className="btn-outline rounded px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[1.2px]">
                Templates
              </button>

              {/* Print */}
              <button onClick={printPage}
                className="btn-outline rounded px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[1.2px]"
                title="Print / Save as PDF">
                Print
              </button>

              {/* Archive button */}
              <button onClick={() => setArchiveOpen(o => !o)}
                className="btn-outline relative rounded px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[1.2px]"
                style={archiveOpen ? { borderColor: "var(--gold-border)", color: "var(--gold-3)", background: "var(--gold-glow)" } : {}}>
                Archive
                {archive.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full font-mono text-[8px] font-bold"
                    style={{ background: "var(--gold-2)", color: "var(--card)" }}>
                    {archive.length > 99 ? "99+" : archive.length}
                  </span>
                )}
              </button>
            </div>

            {/* Bulk action toolbar */}
            <AnimatePresence>
              {bulkMode && selectedIds.size > 0 && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="w-full flex flex-wrap items-center gap-2 pt-2">
                  <span className="font-mono text-[10px] uppercase tracking-[1.2px]" style={{ color: "var(--muted)" }}>{selectedIds.size} selected:</span>
                  <button onClick={() => bulkAction("done")} className="btn-gold rounded px-3 py-1 font-mono text-[9px] uppercase tracking-[1px]">Mark Done</button>
                  <button onClick={() => bulkAction("undone")} className="btn-outline rounded px-3 py-1 font-mono text-[9px] uppercase tracking-[1px]">Mark Undone</button>
                  {PRIORITY_ORDER.map(p => (
                    <button key={p} onClick={() => bulkAction("priority", p)}
                      className="rounded px-3 py-1 font-mono text-[9px] uppercase tracking-[1px]"
                      style={{ background: `var(--${p})14`, color: `var(--${p})`, border: `1px solid var(--${p})30` }}>
                      → {PRIORITY_META[p].label}
                    </button>
                  ))}
                  <button onClick={() => setTemplatesOpen(true)} className="btn-outline rounded px-3 py-1 font-mono text-[9px] uppercase tracking-[1px]">Save as Template</button>
                  <button onClick={() => bulkAction("delete")}
                    className="rounded px-3 py-1 font-mono text-[9px] uppercase tracking-[1px]"
                    style={{ background: "rgba(192,40,26,0.06)", color: "var(--urgent)", border: "1px solid rgba(192,40,26,0.22)" }}>
                    Delete All
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filter tabs — underline style with gold */}
            <div className="flex flex-wrap gap-0.5">
              {FILTERS.map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1.2px] transition-all duration-150 border-b-2"
                  style={{
                    borderBottomColor: filter === f.key ? "var(--gold-2)" : "transparent",
                    color: filter === f.key ? "var(--text)" : "var(--muted)",
                    background: "transparent",
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* ── Task content ─────────────────────────────────────────────────── */}
          <div className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  className="h-8 w-8 rounded-full border-2 border-t-transparent"
                  style={{ borderColor: "var(--gold-border)", borderTopColor: "transparent" }}
                />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-serif text-5xl mb-4" style={{ color: "var(--gold-border)" }}>∅</p>
                <p className="font-mono text-[11px] uppercase tracking-[2px]" style={{ color: "var(--muted)" }}>
                  {tasks.length === 0 ? "No tasks yet — type one above" : "No tasks match this filter"}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {view === "list" ? (
                  <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                    className="space-y-8">
                    {PRIORITY_ORDER.map((p) => {
                      const group = filtered.filter((t) => t.priority === p);
                      const meta = PRIORITY_META[p];
                      const visible = filter === "all" || filter === "done" || filter === p;
                      if (!visible && group.length === 0) return null;
                      return (
                        <div key={p} ref={(el) => { groupRefs.current[p] = el; }}>
                          {/* Group header */}
                          <div className="mb-4 flex items-center gap-3">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
                            <span className="font-serif text-xl font-bold tracking-tight" style={{ color: meta.color }}>
                              {meta.label}
                            </span>
                            <div className="h-px flex-1" style={{ background: "var(--gold-border)" }} />
                            <span className="font-mono text-[9px] uppercase tracking-[1.5px]" style={{ color: "var(--muted)" }}>
                              {group.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <AnimatePresence>
                              {group.map((task) => (
                                <TaskCard key={task.id} task={task} onToggle={toggle} onDelete={deleteTask}
                                  onChangePriority={changePriority} onRename={renameTask}
                                  onUpdateSubtasks={updateSubtasks} onFocus={t => setFocusTask(t)}
                                  bulkMode={bulkMode} selected={selectedIds.has(task.id)} onSelect={toggleSelect}
                                  apiKey={apiKey} />
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div key="board" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {PRIORITY_ORDER.map((p) => {
                      const meta = PRIORITY_META[p];
                      const group = filtered.filter((t) => t.priority === p);
                      return (
                        <div key={p} ref={(el) => { groupRefs.current[p] = el; }}
                          className="board-col p-3 min-h-[200px]">
                          <div className="mb-3 flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--gold-border)" }}>
                            <span className="font-serif text-base font-bold tracking-tight" style={{ color: meta.color }}>
                              {meta.label}
                            </span>
                            <span className="rounded px-2 py-0.5 font-mono text-[9px]"
                              style={{ background: `${meta.color}14`, color: meta.color, border: `1px solid ${meta.color}28` }}>
                              {group.length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <AnimatePresence>
                              {group.map((task) => (
                                <TaskCard key={task.id} task={task} onToggle={toggle} onDelete={deleteTask}
                                  onChangePriority={changePriority} onRename={renameTask}
                                  onUpdateSubtasks={updateSubtasks} onFocus={t => setFocusTask(t)}
                                  bulkMode={bulkMode} selected={selectedIds.has(task.id)} onSelect={toggleSelect}
                                  apiKey={apiKey} />
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
      </AppShell>

        {/* ── Settings modal ────────────────────────────────────────────────── */}
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} apiKey={apiKey} onSave={setApiKey} />

        {/* ── Summary modal ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {summaryOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ background: "rgba(32,21,18,0.45)", backdropFilter: "blur(6px)" }}
              onClick={() => setSummaryOpen(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                className="w-[min(520px,90vw)] rounded glass p-6"
                style={{ boxShadow: "0 20px 60px rgba(32,21,18,0.20)" }}>
                <h2 className="font-serif text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                  Daily Summary
                </h2>
                <div className="mt-3 min-h-[80px] text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                  {summary ?? <span className="font-mono text-[11px]" style={{ color: "var(--muted)" }}>Generating…</span>}
                </div>
                <div className="mt-5 flex justify-end">
                  <button onClick={() => setSummaryOpen(false)}
                    className="btn-outline rounded px-4 py-2 font-mono text-[10px] uppercase tracking-[1.2px]">
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Archive sidebar ───────────────────────────────────────────────── */}
        <AnimatePresence>
          {archiveOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                style={{ background: "rgba(32,21,18,0.35)", backdropFilter: "blur(4px)" }}
                onClick={() => setArchiveOpen(false)} />
              <motion.aside
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="fixed right-0 top-0 z-50 h-full w-[min(420px,95vw)] flex flex-col"
                style={{ background: "var(--card)", borderLeft: "1px solid var(--gold-border)", boxShadow: "-8px 0 32px rgba(32,21,18,0.12)" }}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--gold-border)" }}>
                  <div>
                    <h2 className="font-serif text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>Completed</h2>
                    <p className="font-mono text-[10px] mt-0.5 uppercase tracking-[1.2px]" style={{ color: "var(--muted)" }}>
                      {archive.length} task{archive.length !== 1 ? "s" : ""} archived
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {archive.length > 0 && (
                      <button onClick={() => setArchive([])}
                        className="btn-outline rounded px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide">
                        Clear All
                      </button>
                    )}
                    <button onClick={() => setArchiveOpen(false)}
                      className="flex h-8 w-8 items-center justify-center rounded btn-outline font-mono text-sm">
                      ✕
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                  {archive.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                      <span className="font-serif text-4xl" style={{ color: "var(--gold-2)" }}>✓</span>
                      <p className="font-mono text-[10px] uppercase tracking-[1.5px]" style={{ color: "var(--muted)" }}>Nothing archived yet</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {archive.map((task) => {
                        const meta = PRIORITY_META[task.priority];
                        return (
                          <motion.div key={task.id}
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 28 }}
                            className="flex items-start gap-3 rounded p-3"
                            style={{ background: "var(--card-2)", border: "1px solid var(--gold-border)" }}>
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-snug line-through" style={{ color: "var(--muted)", textDecorationColor: "var(--muted-2)" }}>
                                {task.title}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="font-mono text-[9px] uppercase tracking-[1px] font-semibold" style={{ color: meta.color }}>
                                  {meta.label}
                                </span>
                                {task.dueTime && <span className="font-mono text-[9px]" style={{ color: "var(--muted)" }}>{task.dueTime}</span>}
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                const restored = await createTask({ title: task.title, priority: task.priority, tags: task.tags, dueTime: task.dueTime, recurring: task.recurring });
                                setPending(restored.id, restored);
                                setTasks((p) => [restored, ...p]);
                                setArchive((prev) => prev.filter((t) => t.id !== task.id));
                              }}
                              className="shrink-0 btn-outline rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wide">
                              ↺
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-1 py-2"
            style={{ background: "rgba(32,21,18,0.97)", borderTop: "1px solid rgba(184,48,26,0.25)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
            {[
              { href: "/",      label: "Home",  svg: <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /> },
              { href: "/tasks", label: "Tasks", svg: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 9h3.75M6.75 19.5H17.25A2.25 2.25 0 0 0 19.5 17.25V6.75A2.25 2.25 0 0 0 17.25 4.5H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5A2.25 2.25 0 0 0 6.75 19.5Z" /> },
            ].map(({ href, label, svg }) => (
              <Link key={href} href={href}
                className="flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors"
                style={{ color: "rgba(255,255,255,0.45)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">{svg}</svg>
                <span className="text-[8px] font-mono uppercase tracking-[1px]">{label}</span>
              </Link>
            ))}
            <button onClick={() => setSettingsOpen(true)}
              className="flex flex-col items-center gap-1 px-2 py-1 rounded-lg"
              style={{ color: "rgba(255,255,255,0.45)" }}>
              <SettingsIcon />
              <span className="text-[8px] font-mono uppercase tracking-[1px]">More</span>
            </button>
          </nav>
        )}

        {/* ── Undo toast ────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {undoTask && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded px-5 py-3"
              style={{ background: "var(--card)", border: "1px solid var(--gold-border)", boxShadow: "0 8px 30px rgba(32,21,18,0.16)" }}>
              <span className="text-sm font-mono" style={{ color: "var(--text-2)" }}>
                Deleted &ldquo;{undoTask.title.slice(0, 32)}{undoTask.title.length > 32 ? "…" : ""}&rdquo;
              </span>
              <button onClick={undoDelete} className="btn-gold rounded px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1.2px]">
                Undo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Recurring-pattern suggestion toast ───────────────────────────── */}
        <AnimatePresence>
          {recurringSuggestion && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="fixed z-50 flex -translate-x-1/2 items-center gap-4 rounded px-5 py-3"
              style={{ bottom: 96, left: "50%", background: "var(--card)", border: "1px solid var(--gold-border)", boxShadow: "0 8px 30px rgba(32,21,18,0.16)" }}>
              <span className="text-sm font-mono" style={{ color: "var(--text-2)" }}>
                You&rsquo;ve done &ldquo;{recurringSuggestion.title.slice(0, 28)}{recurringSuggestion.title.length > 28 ? "…" : ""}&rdquo; {recurringSuggestion.count} times — make it {recurringSuggestion.pattern}?
              </span>
              <button onClick={acceptRecurringSuggestion} className="btn-gold rounded px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1.2px] shrink-0">
                Make {recurringSuggestion.pattern}
              </button>
              <button onClick={() => setRecurringSuggestion(null)} className="text-[9px] shrink-0" style={{ color: "var(--muted)" }}>✕</button>
            </motion.div>
          )}
        </AnimatePresence>

      {/* ── AI Assistant ──────────────────────────────────────────────────── */}
      <AiAssistant
        apiKey={apiKey}
        tasks={tasks}
        onTaskCreated={(task) => {
          setPending(task.id, task);
          setTasks(p => [task, ...p]);
        }}
        onCompleteTask={(id) => { const t = tasks.find(x => x.id === id); if (t && !t.done) toggle(id); }}
        onReopenTask={(id) => { const t = tasks.find(x => x.id === id); if (t && t.done) toggle(id); }}
        onDeleteTask={deleteTask}
        onSetPriority={changePriority}
        onBulkAction={bulkActionFromAi}
      />

      {/* ── Feature modals & overlays ─────────────────────────────────────── */}
      <FocusTimer taskTitle={focusTask} onClose={() => setFocusTask(null)} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} tasks={tasks} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <TemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        selectedTasks={Array.from(selectedIds).map(id => {
          const t = tasks.find(t => t.id === id);
          return t ? { title: t.title, priority: t.priority, tags: t.tags, project: t.project } : null;
        }).filter(Boolean) as { title: string; priority: Priority; tags: string[]; project?: string }[]}
        onApply={async (templateTasks) => {
          for (const t of templateTasks) {
            const saved = await createTask({ title: t.title, priority: t.priority, tags: t.tags ?? [], project: t.project });
            setPending(saved.id, saved); setTasks(p => [saved, ...p]);
          }
        }}
      />
    </>
  );
}
