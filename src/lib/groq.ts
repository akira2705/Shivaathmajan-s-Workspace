const GROQ_BASE = "https://api.groq.com/openai/v1";

function getKey(apiKey?: string): string {
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key) throw new GroqError("No Groq API key configured — add it in Settings or .env.local", 400);
  return key;
}

export class GroqError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function groqChat(opts: {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: string };
  apiKey?: string;
}): Promise<string> {
  const key = getKey(opts.apiKey);

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.3,
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.responseFormat) body.response_format = opts.responseFormat;

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new GroqError(`Groq error: ${err.slice(0, 300)}`, 502);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

export async function groqTranscribe(audio: Blob, ext: string, apiKey?: string): Promise<string> {
  const key = getKey(apiKey);

  const form = new FormData();
  form.append("file", audio, `audio.${ext}`);
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", "en");
  form.append("response_format", "json");

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new GroqError(`Whisper error: ${err.slice(0, 200)}`, 502);
  }

  const data = await res.json();
  return data.text ?? "";
}
