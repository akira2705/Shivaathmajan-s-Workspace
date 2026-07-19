// ─────────────────────────────────────────────────────────────────────────
// Tiny dependency-free fuzzy title matcher. Used for duplicate-task
// detection (tasks/page.tsx addTask) and recurring-pattern detection
// (tasks/page.tsx toggle). Not linguistically rigorous — just cheap and
// good enough for "is this basically the same task title" checks.
// ─────────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

// Classic edit-distance, O(n*m) time / O(m) space — fine for short titles.
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

/** True if two titles are "basically the same task" — exact match, a
 *  substring either direction, or close enough by edit distance (within
 *  ~25% of the longer string's length). */
export function isSimilarTitle(a: string, b: string): boolean {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const dist = levenshtein(na, nb);
  const longer = Math.max(na.length, nb.length);
  return longer > 0 && dist / longer <= 0.25;
}

/** Finds the first candidate whose title is a fuzzy match for `title`. */
export function findSimilarTask<T extends { title: string }>(title: string, candidates: T[]): T | undefined {
  return candidates.find((c) => isSimilarTitle(title, c.title));
}
