import { NextRequest, NextResponse } from "next/server";
import { groqChat, GroqError } from "@/lib/groq";
import { buildSystemPrompt } from "@/lib/ai-skill";

export async function POST(req: NextRequest) {
  const { messages, context, apiKey } = await req.json();

  if (!Array.isArray(messages)) return NextResponse.json({ error: "Missing messages" }, { status: 400 });

  const now = new Date().toLocaleString("en-US", {
    weekday: "long", hour: "2-digit", minute: "2-digit", hour12: true,
  });

  const contextBlock = `It's currently ${now}.

What's on their plate:
- ${context?.pendingCount ?? 0} tasks still pending
- ${context?.urgentCount ?? 0} marked urgent
- ${context?.todayCount ?? 0} due today
${context?.taskSummary ? `\nTheir current task list:\n${context.taskSummary}` : ""}
${context?.expenseSummary ? `\nThey're also tracking expenses. This month's total so far: $${Number(context.expenseTotalMonth ?? 0).toFixed(2)}.\nRecent expenses:\n${context.expenseSummary}` : ""}`;

  const systemPrompt = buildSystemPrompt(contextBlock);

  try {
    const reply = await groqChat({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-12),
      ],
      temperature: 0.75,
      maxTokens: 350,
      apiKey,
    });
    return NextResponse.json({ reply: reply || "Yeah I'm not sure on that one." });
  } catch (e) {
    const status = e instanceof GroqError ? e.status : 502;
    return NextResponse.json({ error: `${e instanceof Error ? e.message : e}` }, { status });
  }
}
