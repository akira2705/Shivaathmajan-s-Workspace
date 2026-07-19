import { NextRequest, NextResponse } from "next/server";
import { groqChat, GroqError } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const { tasks, apiKey } = await req.json();

  const pending  = (tasks ?? []).filter((t: {done: boolean}) => !t.done);
  const urgent   = pending.filter((t: {priority: string}) => t.priority === "urgent");
  const overdue  = pending.filter((t: {dueDate?: string}) => t.dueDate && t.dueDate < new Date().toISOString().slice(0,10));
  const dueToday = pending.filter((t: {dueDate?: string}) => t.dueDate === new Date().toISOString().slice(0,10));

  const summary = pending.slice(0, 10).map((t: {priority: string; title: string; dueDate?: string}) =>
    `[${t.priority}] ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`
  ).join("\n");

  const now = new Date().toLocaleString("en-US", {
    weekday: "long", day: "numeric", month: "long",
  });

  const prompt = `You are writing a short morning briefing for a busy business owner. Today is ${now}.

Task snapshot:
- ${pending.length} pending, ${urgent.length} urgent, ${overdue.length} overdue, ${dueToday.length} due today
${summary ? `\nTop tasks:\n${summary}` : ""}

Write a 2-3 sentence morning briefing. Be direct and practical. Start with the most critical thing. No fluff, no bullet points. Plain text only. Don't say "Good morning" — just get straight to it.`;

  try {
    const reply = await groqChat({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      maxTokens: 120,
      apiKey,
    });
    return NextResponse.json({ briefing: reply });
  } catch (e) {
    const status = e instanceof GroqError ? e.status : 502;
    return NextResponse.json({ error: `${e instanceof Error ? e.message : e}` }, { status });
  }
}
