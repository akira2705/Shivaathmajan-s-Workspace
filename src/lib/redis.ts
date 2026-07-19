import { Redis } from "@upstash/redis";

// ─────────────────────────────────────────────────────────────────────────
// This app is single-user / no-auth (see src/lib/api.ts), so there is no
// per-user namespacing here — just two fixed keys. Do not add a user-id
// system; that would be scope creep for a single-browser demo.
// ─────────────────────────────────────────────────────────────────────────
export const PUSH_SUBSCRIPTION_KEY = "taskflow:push-subscription";
export const TASK_SNAPSHOT_KEY = "taskflow:task-snapshot";

let client: Redis | null = null;

// Lazily construct the Redis client on first use (mirrors the lazy getKey()
// pattern in src/lib/groq.ts) so simply importing this module never throws
// or touches env vars at build/import time — only when a route handler
// actually calls getRedis() at request time.
//
// Redis.fromEnv() reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
// (with KV_REST_API_URL / KV_REST_API_TOKEN as fallbacks) — these are the
// exact env var names Vercel's Upstash integration auto-populates.
export function getRedis(): Redis {
  if (!client) client = Redis.fromEnv();
  return client;
}
