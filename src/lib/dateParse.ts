// ─────────────────────────────────────────────────────────────────────────
// Lightweight, dependency-free natural-language date phrases for the manual
// add bar's "quick date" shortcut (tasks/page.tsx). No AI call — just a
// handful of literal phrases. Native <input type="date"> can't accept free
// text, so this backs a small shortcut <select> instead (see feature 7).
// ─────────────────────────────────────────────────────────────────────────

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function fmt(d: Date): string {
  return new Intl.DateTimeFormat("en-CA").format(d); // YYYY-MM-DD
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/**
 * Parses a small set of natural-language date phrases into "YYYY-MM-DD".
 * Supports: "today", "tomorrow", weekday names (next occurrence, strictly
 * in the future — "monday" typed on a Monday means *next* Monday), and
 * "in N days". Returns null for anything else.
 */
export function parseNaturalDate(input: string): string | null {
  const s = input.trim().toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (s === "today") return fmt(today);
  if (s === "tomorrow") return fmt(addDays(today, 1));

  const inDays = s.match(/^in (\d+) days?$/);
  if (inDays) return fmt(addDays(today, Number(inDays[1])));

  const idx = WEEKDAYS.indexOf(s);
  if (idx !== -1) {
    const todayIdx = today.getDay();
    let delta = idx - todayIdx;
    if (delta <= 0) delta += 7; // always the *next* occurrence, never today
    return fmt(addDays(today, delta));
  }

  return null;
}
