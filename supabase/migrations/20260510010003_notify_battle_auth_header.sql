-- Add the Authorization header required by the Supabase edge function gateway.
-- The anon key is public (already in NEXT_PUBLIC_SUPABASE_ANON_KEY).
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
        'Authorization',    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybmtueWtycml5d255am5qbnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzM1MzUsImV4cCI6MjA4ODU0OTUzNX0.3PYjQJtJ2yyrYSlpzpsZWKQMPW826-TdUG7dtfIGlhs',
        'x-trigger-secret', secret
      )
    );
  exception when others then
    null;
  end;
  return new;
end;
$$;
