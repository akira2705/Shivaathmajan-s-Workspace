import { NextRequest, NextResponse } from "next/server";
import { todayStr } from "@/lib/date";
import { groqChat, GroqError } from "@/lib/groq";

const PRIORITIES = ["urgent", "high", "medium", "low", "followup"];

export async function POST(req: NextRequest) {
  const { text, apiKey } = await req.json();
  if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

  const prompt = `You convert a rough spoken/typed task description into structured JSON.
Return ONLY valid JSON, no markdown, no explanation, with this exact shape:
{"title": string, "priority": one of ${JSON.stringify(PRIORITIES)}, "tags": string[], "dueTime": "HH:MM"|null, "dueDate": "YYYY-MM-DD"|null}

Rules:
- priority: urgent/asap/now → urgent | important/critical → high | normal → medium | whenever/someday → low | "follow up"/"check on"/"ping" → followup
- tags: pick 1-3 from [Call, Finance, Send, Field, Admin, Personal, Visit, Meeting, Plan, Docs]
- dueTime: if a time is mentioned convert to 24h "HH:MM", otherwise null
- dueDate: if a date is mentioned convert to "YYYY-MM-DD", otherwise null. Today is ${todayStr()}. "tomorrow" means the next day.

Input: "${text}"`;

  try {
    const raw = await groqChat({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      responseFormat: { type: "json_object" },
      apiKey,
    });

    const parsed = JSON.parse(raw || "{}");
    return NextResponse.json({
      title:    String(parsed.title ?? text).slice(0, 200),
      priority: PRIORITIES.includes(parsed.priority) ? parsed.priority : "medium",
      tags:     Array.isArray(parsed.tags) ? parsed.tags.slice(0, 4).map(String) : [],
      dueTime:  typeof parsed.dueTime === "string" && /^\d{2}:\d{2}$/.test(parsed.dueTime) ? parsed.dueTime : null,
      dueDate:  typeof parsed.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate) ? parsed.dueDate : null,
    });
  } catch (e) {
    const status = e instanceof GroqError ? e.status : 502;
    return NextResponse.json({ error: `${e instanceof Error ? e.message : e}` }, { status });
  }
}
