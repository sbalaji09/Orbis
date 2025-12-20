-- Provider API Keys (per-user, encrypted at rest by the app server)
-- Run this in your Supabase SQL editor.

create table if not exists public.provider_api_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  encrypted_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create index if not exists provider_api_keys_user_id_idx
  on public.provider_api_keys (user_id);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists provider_api_keys_set_updated_at on public.provider_api_keys;
create trigger provider_api_keys_set_updated_at
before update on public.provider_api_keys
for each row execute function public.set_updated_at();

-- RLS
alter table public.provider_api_keys enable row level security;

drop policy if exists "provider_api_keys_select_own" on public.provider_api_keys;
create policy "provider_api_keys_select_own"
on public.provider_api_keys
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "provider_api_keys_insert_own" on public.provider_api_keys;
create policy "provider_api_keys_insert_own"
on public.provider_api_keys
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "provider_api_keys_update_own" on public.provider_api_keys;
create policy "provider_api_keys_update_own"
on public.provider_api_keys
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "provider_api_keys_delete_own" on public.provider_api_keys;
create policy "provider_api_keys_delete_own"
on public.provider_api_keys
for delete
to authenticated
using (auth.uid() = user_id);

