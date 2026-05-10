import { createClient } from "jsr:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush";
import { PushMessageError } from "jsr:@negrel/webpush";

const vapidKeys = await webpush.importVapidKeys(
  JSON.parse(Deno.env.get("VAPID_KEYS")!),
  { extractable: false },
);

const appServer = await webpush.ApplicationServer.new({
  contactInformation: "mailto:florian.rampp@gmail.com",
  vapidKeys,
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get("NOTIFY_BATTLE_SECRET");
  if (req.headers.get("x-trigger-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const battle = await req.json();
  const { challenger_id, opponent_id, id: battleId } = battle;

  const [{ data: players }, { data: subs }] = await Promise.all([
    supabase.from("players").select("id, name").in("id", [challenger_id, opponent_id]),
    supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("player_id", opponent_id),
  ]);

  if (!subs?.length) {
    console.log(`battle=${battleId} opponent=${opponent_id} no subscriptions`);
    return new Response("ok");
  }

  const challenger = players?.find((p) => p.id === challenger_id);
  const opponent = players?.find((p) => p.id === opponent_id);

  const payload = JSON.stringify({
    title: "Rechenheld ⚔️",
    body: `${challenger?.name} fordert ${opponent?.name} heraus!`,
    url: `/duell/${battleId}`,
  });

  const dead: string[] = [];
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        });
        await subscriber.pushTextMessage(payload, { ttl: 86400 });
        console.log(`battle=${battleId} pushed to ${sub.endpoint}`);
      } catch (err) {
        if (
          err instanceof PushMessageError &&
          (err.isGone() || err.response.status === 404)
        ) {
          dead.push(sub.endpoint);
        } else {
          console.error(`battle=${battleId} push failed for ${sub.endpoint}:`, err);
        }
      }
    }),
  );

  if (dead.length) {
    await supabase.from("push_subscriptions").delete().in("endpoint", dead);
    console.log(`battle=${battleId} removed ${dead.length} dead subscription(s)`);
  }

  return new Response("ok");
});
