-- Trigger that calls the notify-battle edge function on every new battle.
-- The secret is stored in Supabase Vault (see migration 20260510010001).
-- The pg_net call is fire-and-forget (async), so it does not block the INSERT.

create or replace function public.notify_battle()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Secret reading added in migration 20260510010001; placeholder here.
  perform net.http_post(
    url     := 'https://prnknykrriywnyjnjnxq.supabase.co/functions/v1/notify-battle',
    body    := row_to_json(new)::text::jsonb,
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-trigger-secret', ''
    )
  );
  return new;
end;
$$;

create trigger on_battle_inserted
  after insert on public.battles
  for each row execute function public.notify_battle();
