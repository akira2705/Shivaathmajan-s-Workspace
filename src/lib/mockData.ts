export type Priority = "urgent" | "high" | "medium" | "low" | "followup";

// "monthly" added for the recurring-pattern detection feature (a task
// completed ~3 times a month apart gets suggested as monthly, not weekly).
export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  tags: string[];
  done: boolean;
  dueTime?: string;
  dueDate?: string;
  recurring?: Recurrence;
  linkUrl?: string;
  linkLabel?: string;
  streak?: number;
  project?: string;
  subtasks?: SubTask[];
}

export const PRIORITY_META: Record<
  Priority,
  { label: string; color: string; emoji: string }
> = {
  urgent: { label: "Urgent", color: "var(--urgent)", emoji: "🔴" },
  high: { label: "High", color: "var(--high)", emoji: "🟠" },
  medium: { label: "Medium", color: "var(--medium)", emoji: "🟡" },
  low: { label: "Low", color: "var(--low)", emoji: "🔵" },
  followup: { label: "Follow-up", color: "var(--followup)", emoji: "🟣" },
};

export const PRIORITY_ORDER: Priority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "followup",
];

export const MOCK_TASKS: Task[] = [
  { id: "1", title: "Draft Q3 project plan", priority: "high", tags: ["Planning"], done: false },
  { id: "2", title: "Reply to client feedback email", priority: "medium", tags: ["Email"], done: false },
];
