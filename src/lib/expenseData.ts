export type ExpenseCategory =
  | "Food"
  | "Transport"
  | "Bills"
  | "Shopping"
  | "Health"
  | "Entertainment"
  | "Other";

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  note?: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Food",
  "Transport",
  "Bills",
  "Shopping",
  "Health",
  "Entertainment",
  "Other",
];

export const CATEGORY_META: Record<ExpenseCategory, { color: string; emoji: string }> = {
  Food:          { color: "var(--urgent)",   emoji: "🍔" },
  Transport:     { color: "var(--medium)",   emoji: "🚗" },
  Bills:         { color: "var(--high)",     emoji: "🧾" },
  Shopping:      { color: "var(--followup)", emoji: "🛍️" },
  Health:        { color: "var(--low)",      emoji: "💊" },
  Entertainment: { color: "var(--gold-3)",   emoji: "🎬" },
  Other:         { color: "var(--muted)",    emoji: "📦" },
};

export const MOCK_EXPENSES: Expense[] = [
  { id: "1", description: "Groceries", amount: 42.5, category: "Food", date: new Date().toISOString().slice(0, 10) },
  { id: "2", description: "Bus pass", amount: 20, category: "Transport", date: new Date().toISOString().slice(0, 10) },
];
