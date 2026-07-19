import { NextRequest, NextResponse } from "next/server";
import { groqChat, GroqError } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const { tasks, apiKey } = await req.json();
  if (!Array.isArray(tasks)) return NextResponse.json({ error: "Missing tasks" }, { status: 400 });

  const lines = tasks
    .map((t: { title: string; priority: string; done: boolean }) =>
      `- [${t.done ? "x" : " "}] (${t.priority}) ${t.title}`)
    .join("\n");

  const prompt = `You are a sharp, encouraging personal executive assistant. Based on today's task list below, write a short 3-5 sentence end-of-day summary: what was accomplished, what's still outstanding and most critical, and one clear practical suggestion for tomorrow. Keep the tone warm, direct, and motivating. No markdown headers or bullet points — just clean flowing sentences.

Tasks:
${lines}`;

  try {
    const summary = await groqChat({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      apiKey,
    });
    return NextResponse.json({ summary: summary || "No summary available." });
  } catch (e) {
    const status = e instanceof GroqError ? e.status : 502;
    return NextResponse.json({ error: `${e instanceof Error ? e.message : e}` }, { status });
  }
}
