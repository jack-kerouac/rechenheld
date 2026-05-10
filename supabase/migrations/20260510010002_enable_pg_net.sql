-- Enable pg_net for async HTTP calls from triggers.
create extension if not exists pg_net with schema extensions;

-- Re-create the trigger function with exception handling so a push notification
-- failure never blocks battle creation.
create or replace function public.notify_battle()
returns trigger
language plpgsql
security definer
as $$
declare
  secret text;
begin
  begin
    select decrypted_secret into secret
    from vault.decrypted_secrets
    where name = 'notify_battle_secret';

    perform net.http_post(
      url     := 'https://prnknykrriywnyjnjnxq.supabase.co/functions/v1/notify-battle',
      body    := row_to_json(new)::text::jsonb,
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'x-trigger-secret', secret
      )
    );
  exception when others then
    null; -- never block battle creation on push failure
  end;
  return new;
end;
$$;
