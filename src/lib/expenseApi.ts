import { Expense, ExpenseCategory, MOCK_EXPENSES } from "./expenseData";

// localStorage-backed "API" for expenses — same pattern as src/lib/api.ts.
const STORAGE_KEY = "taskflow_expenses";

function readExpenses(): Expense[] {
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

function writeExpenses(expenses: Expense[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch {
    /* ignore quota errors */
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function fetchExpenses(): Promise<Expense[]> {
  let expenses = readExpenses();
  if (expenses.length === 0) {
    expenses = MOCK_EXPENSES.map((e) => ({ ...e }));
    writeExpenses(expenses);
  }
  return expenses;
}

export async function createExpense(payload: {
  id?: string; description: string; amount: number; category: ExpenseCategory; date?: string; note?: string;
}): Promise<Expense> {
  const expense: Expense = {
    id: payload.id ?? newId(),
    description: payload.description,
    amount: payload.amount,
    category: payload.category,
    date: payload.date ?? new Date().toISOString().slice(0, 10),
    note: payload.note,
  };
  const expenses = readExpenses();
  expenses.unshift(expense);
  writeExpenses(expenses);
  return expense;
}

export async function updateExpense(id: string, patch: Partial<Omit<Expense, "id">>): Promise<void> {
  const expenses = readExpenses();
  const idx = expenses.findIndex((e) => e.id === id);
  if (idx === -1) return;
  expenses[idx] = { ...expenses[idx], ...patch };
  writeExpenses(expenses);
}

export async function deleteExpense(id: string): Promise<void> {
  writeExpenses(readExpenses().filter((e) => e.id !== id));
}
