import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  "mailto:florian.rampp@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { player_id, title, body, url } = await req.json();

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("player_id", player_id);

  if (!subs?.length) return NextResponse.json({ ok: true });

  const payload = JSON.stringify({ title, body, url });
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 86400 }
      )
    )
  );

  // Remove dead subscriptions (410 Gone / 404 Not Found)
  const dead = results
    .map((r, i) =>
      r.status === "rejected" &&
      (r.reason?.statusCode === 410 || r.reason?.statusCode === 404)
        ? subs[i].endpoint
        : null
    )
    .filter(Boolean) as string[];

  if (dead.length) {
    await supabase.from("push_subscriptions").delete().in("endpoint", dead);
  }

  return NextResponse.json({ ok: true });
}
