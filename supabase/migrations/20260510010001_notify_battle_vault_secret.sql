-- Store the trigger secret in Supabase Vault (encrypted at rest).
select vault.create_secret(
  '6ed0ef97ee302ddb528147e843cbd1ae27a79091ecaaa5b5dd5b5db38b7440fb',
  'notify_battle_secret'
);

-- Update the trigger function to read the secret from Vault instead of a DB setting.
create or replace function public.notify_battle()
returns trigger
language plpgsql
security definer
as $$
declare
  secret text;
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
  return new;
end;
$$;
