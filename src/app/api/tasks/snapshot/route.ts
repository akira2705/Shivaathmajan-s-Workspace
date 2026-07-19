import { NextRequest, NextResponse } from "next/server";
import { getRedis, TASK_SNAPSHOT_KEY } from "@/lib/redis";

export interface TaskSnapshotItem {
  title: string;
  priority: string;
  done: boolean;
  dueDate?: string;
}

// Receives a compact snapshot of the current (localStorage-only) task list
// and stores it in Redis so the daily-briefing cron job — a stateless
// Vercel Cron function with no access to any browser's localStorage — has
// something to summarize. This is the first data in the app that leaves
// the browser, so only title/priority/done/dueDate are kept, nothing else
// (see src/app/tasks/page.tsx for the throttled caller).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];
    const compact: TaskSnapshotItem[] = tasks.slice(0, 200).map((t: Record<string, unknown>) => ({
      title: String(t.title ?? "").slice(0, 200),
      priority: String(t.priority ?? "medium"),
      done: Boolean(t.done),
      ...(typeof t.dueDate === "string" ? { dueDate: t.dueDate } : {}),
    }));
    await getRedis().set(TASK_SNAPSHOT_KEY, compact);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `${e instanceof Error ? e.message : e}` }, { status: 500 });
  }
}
