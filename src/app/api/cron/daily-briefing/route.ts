import { NextRequest, NextResponse } from "next/server";
import * as webpush from "web-push";
import { groqChat, GroqError } from "@/lib/groq";
import { getRedis, PUSH_SUBSCRIPTION_KEY, TASK_SNAPSHOT_KEY } from "@/lib/redis";
import type { TaskSnapshotItem } from "@/app/api/tasks/snapshot/route";

// Vercel Cron calls GET by default (see vercel.json). Vercel automatically
// sends `Authorization: Bearer ${CRON_SECRET}` on cron-triggered requests
// when CRON_SECRET is set — this is the documented Vercel Cron auth
// convention, so we just check for it here rather than inventing our own.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();
  const [subscription, snapshot] = await Promise.all([
    redis.get<webpush.PushSubscription>(PUSH_SUBSCRIPTION_KEY),
    redis.get<TaskSnapshotItem[]>(TASK_SNAPSHOT_KEY),
  ]);

  // Nothing to do yet — no browser has enabled push, or no task snapshot
  // has been posted. Not an error: just a no-op 200.
  if (!subscription || !snapshot) {
    return NextResponse.json({ ok: true, sent: false, message: "No subscription or task snapshot on file — nothing to send." });
  }

  const tasks = Array.isArray(snapshot) ? snapshot : [];
  const pending  = tasks.filter((t) => !t.done);
  const urgent   = pending.filter((t) => t.priority === "urgent");
  const today    = new Date().toISOString().slice(0, 10);
  const overdue  = pending.filter((t) => t.dueDate && t.dueDate < today);
  const dueToday = pending.filter((t) => t.dueDate === today);

  const summary = pending.slice(0, 10).map((t) =>
    `[${t.priority}] ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`
  ).join("\n");

  const now = new Date().toLocaleString("en-US", {
    weekday: "long", day: "numeric", month: "long",
  });

  // Same prompt/model/style as src/app/api/ai/briefing/route.ts — this is
  // the exact same briefing, just sourced from the Redis snapshot instead
  // of a live request body, and delivered via push instead of in-page.
  const prompt = `You are writing a short morning briefing for a busy business owner. Today is ${now}.

Task snapshot:
- ${pending.length} pending, ${urgent.length} urgent, ${overdue.length} overdue, ${dueToday.length} due today
${summary ? `\nTop tasks:\n${summary}` : ""}

Write a 2-3 sentence morning briefing. Be direct and practical. Start with the most critical thing. No fluff, no bullet points. Plain text only. Don't say "Good morning" — just get straight to it.`;

  let briefingText: string;
  try {
    briefingText = await groqChat({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      maxTokens: 120,
    });
  } catch (e) {
    const status = e instanceof GroqError ? e.status : 502;
    return NextResponse.json({ error: `${e instanceof Error ? e.message : e}` }, { status });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY || "",
    process.env.VAPID_PRIVATE_KEY || ""
  );

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title: "Your TaskFlow Briefing", body: briefingText })
    );
    return NextResponse.json({ ok: true, sent: true });
  } catch (e) {
    // Standard cleanup for an expired/invalid subscription.
    const statusCode = e instanceof webpush.WebPushError ? e.statusCode : undefined;
    if (statusCode === 410 || statusCode === 404) {
      await redis.del(PUSH_SUBSCRIPTION_KEY);
      return NextResponse.json({ ok: true, sent: false, message: "Push subscription expired and was removed." });
    }
    return NextResponse.json({ error: `${e instanceof Error ? e.message : e}` }, { status: 502 });
  }
}
