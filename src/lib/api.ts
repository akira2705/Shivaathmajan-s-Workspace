import { Priority, Recurrence, Task, MOCK_TASKS } from "./mockData";

// ─────────────────────────────────────────────────────────────────────────
// localStorage-backed "API" — this is a backend-free demo. Every function
// below keeps the exact signature the original server-backed version had,
// so page.tsx and other callers need no changes.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "taskflow_tasks";

function readTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    /* ignore quota errors */
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function fetchTasks(): Promise<{ tasks: Task[]; day: { day_number: number; date: string } }> {
  let tasks = readTasks();
  if (tasks.length === 0) {
    tasks = MOCK_TASKS.map((t) => ({ ...t }));
    writeTasks(tasks);
  }
  return {
    tasks,
    day: { day_number: 1, date: new Date().toISOString().slice(0, 10) },
  };
}

export async function createTask(payload: {
  id?: string; title: string; priority: Priority; tags: string[]; dueTime?: string; dueDate?: string;
  recurring?: Recurrence; linkUrl?: string; linkLabel?: string; project?: string; subtasks?: Task["subtasks"];
}): Promise<Task> {
  const task: Task = {
    id: payload.id ?? newId(),
    title: payload.title,
    priority: payload.priority,
    tags: payload.tags ?? [],
    done: false,
    dueTime: payload.dueTime,
    dueDate: payload.dueDate,
    recurring: payload.recurring ?? "none",
    linkUrl: payload.linkUrl,
    linkLabel: payload.linkLabel,
    project: payload.project,
    subtasks: payload.subtasks ?? [],
  };
  const tasks = readTasks();
  tasks.unshift(task);
  writeTasks(tasks);
  return task;
}

export async function updateTask(id: string, patch: Partial<{
  title: string; priority: Priority; tags: string[]; done: boolean;
  dueTime: string | null; dueDate: string | null; recurring: Recurrence;
  linkUrl: string | null; linkLabel: string | null; project: string | null; subtasks: Task["subtasks"];
}>): Promise<void> {
  const tasks = readTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return;
  tasks[idx] = { ...tasks[idx], ...patch } as Task;
  writeTasks(tasks);
}

export async function deleteTaskApi(id: string): Promise<void> {
  const tasks = readTasks().filter((t) => t.id !== id);
  writeTasks(tasks);
}

// Bulk action helper — replaces the old POST /api/tasks/bulk call.
// Mirrors the same ids/action/value semantics used by the reference app.
export async function bulkActionApi(ids: string[], action: string, value?: string): Promise<void> {
  let tasks = readTasks();
  if (action === "delete") {
    tasks = tasks.filter((t) => !ids.includes(t.id));
  } else if (action === "done") {
    tasks = tasks.map((t) => (ids.includes(t.id) ? { ...t, done: true } : t));
  } else if (action === "undone") {
    tasks = tasks.map((t) => (ids.includes(t.id) ? { ...t, done: false } : t));
  } else if (action === "priority" && value) {
    tasks = tasks.map((t) => (ids.includes(t.id) ? { ...t, priority: value as Priority } : t));
  }
  writeTasks(tasks);
}

// Wipes all locally stored demo data. Used by the "clear local data" action
// that replaces the old server-backed logout.
export function clearAllLocalData(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
