import { NextRequest, NextResponse } from "next/server";
import { todayStr } from "@/lib/date";
import { groqChat, GroqError } from "@/lib/groq";
import { EXPENSE_CATEGORIES } from "@/lib/expenseData";

export async function POST(req: NextRequest) {
  const { text, apiKey } = await req.json();
  if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

  const prompt = `You convert a rough typed expense description into structured JSON.
Return ONLY valid JSON, no markdown, no explanation, with this exact shape:
{"description": string, "amount": number, "category": one of ${JSON.stringify(EXPENSE_CATEGORIES)}, "date": "YYYY-MM-DD"|null}

Rules:
- amount: extract the numeric amount mentioned (strip currency symbols/commas). If no amount is mentioned, use 0.
- description: a short clean label for the expense (e.g. "Groceries at Tesco", "Uber to airport").
- category: pick the single best fit from the list above based on what the expense is for.
- date: if a date/relative date is mentioned (e.g. "yesterday", "last friday") convert to "YYYY-MM-DD", otherwise null. Today is ${todayStr()}.

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
      description: String(parsed.description ?? text).slice(0, 200),
      amount:      typeof parsed.amount === "number" && parsed.amount >= 0 ? parsed.amount : 0,
      category:    EXPENSE_CATEGORIES.includes(parsed.category) ? parsed.category : "Other",
      date:        typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null,
    });
  } catch (e) {
    const status = e instanceof GroqError ? e.status : 502;
    return NextResponse.json({ error: `${e instanceof Error ? e.message : e}` }, { status });
  }
}
