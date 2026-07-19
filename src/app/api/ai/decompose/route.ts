import { NextRequest, NextResponse } from "next/server";
import { groqChat, GroqError } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const { title, apiKey } = await req.json();
  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  const prompt = `You break a task down into a short checklist of concrete subtasks.
Return ONLY valid JSON, no markdown, no explanation, with this exact shape:
{"subtasks": string[]}

Rules:
- Produce 3 to 6 subtasks.
- Each subtask should be short (under 8 words), concrete, and actionable — a single next step, not a restatement of the whole task.
- Order them in the sequence they'd actually get done.
- Don't repeat the task title itself as a subtask.

Task: "${title}"`;

  try {
    const raw = await groqChat({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      responseFormat: { type: "json_object" },
      apiKey,
    });

    const parsed = JSON.parse(raw || "{}");
    const subtasks = Array.isArray(parsed.subtasks)
      ? parsed.subtasks.map((s: unknown) => String(s).slice(0, 120)).filter(Boolean).slice(0, 6)
      : [];
    return NextResponse.json({ subtasks });
  } catch (e) {
    const status = e instanceof GroqError ? e.status : 502;
    return NextResponse.json({ error: `${e instanceof Error ? e.message : e}` }, { status });
  }
}
