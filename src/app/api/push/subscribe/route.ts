import { NextRequest, NextResponse } from "next/server";
import { getRedis, PUSH_SUBSCRIPTION_KEY } from "@/lib/redis";

// Receives the PushSubscription JSON produced by the browser's
// `subscription.toJSON()` (see src/lib/usePushSubscription.ts) and stores
// it under a single fixed Redis key. This app has no accounts, so there is
// nothing to key the subscription by beyond "the one browser that enabled
// this" — the standard single-user tradeoff documented in src/lib/api.ts.
export async function POST(req: NextRequest) {
  try {
    const subscription = await req.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
    }
    await getRedis().set(PUSH_SUBSCRIPTION_KEY, subscription);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `${e instanceof Error ? e.message : e}` }, { status: 500 });
  }
}

// Called by usePushSubscription().unsubscribe() so the server forgets the
// subscription in step with the browser unsubscribing locally.
export async function DELETE() {
  try {
    await getRedis().del(PUSH_SUBSCRIPTION_KEY);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `${e instanceof Error ? e.message : e}` }, { status: 500 });
  }
}
