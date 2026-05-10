import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { player_id, subscription } = await req.json();
  console.log("[push/subscribe] player_id:", player_id, "endpoint:", subscription?.endpoint?.slice(0, 60));

  if (!player_id || !subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      player_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[push/subscribe] DB error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log("[push/subscribe] saved ok");
  return NextResponse.json({ ok: true });
}
