// Single source of truth for "today" in the browser's local timezone.
// This standalone demo has no server/business timezone, so we just use
// the visitor's local time rather than a fixed timezone.

/** Returns today's date in the local timezone as YYYY-MM-DD. */
export function todayStr(): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

/** Returns the current month in the local timezone as YYYY-MM. */
export function currentMonth(): string {
  return todayStr().slice(0, 7);
}
