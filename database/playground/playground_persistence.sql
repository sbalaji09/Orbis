-- Playground Persistence (per-user)
-- Run this in your Supabase SQL editor.

-- Keep updated_at fresh (idempotent)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Baselines
create table if not exists public.playground_baselines (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  prompt text not null,
  outputs jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists playground_baselines_user_id_idx
  on public.playground_baselines (user_id);

drop trigger if exists playground_baselines_set_updated_at on public.playground_baselines;
create trigger playground_baselines_set_updated_at
before update on public.playground_baselines
for each row execute function public.set_updated_at();

alter table public.playground_baselines enable row level security;

drop policy if exists "playground_baselines_select_own" on public.playground_baselines;
create policy "playground_baselines_select_own"
on public.playground_baselines
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "playground_baselines_insert_own" on public.playground_baselines;
create policy "playground_baselines_insert_own"
on public.playground_baselines
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "playground_baselines_update_own" on public.playground_baselines;
create policy "playground_baselines_update_own"
on public.playground_baselines
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "playground_baselines_delete_own" on public.playground_baselines;
create policy "playground_baselines_delete_own"
on public.playground_baselines
for delete
to authenticated
using (auth.uid() = user_id);

-- Runs
create table if not exists public.playground_runs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  prompt text not null,
  outputs jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists playground_runs_user_id_created_at_idx
  on public.playground_runs (user_id, created_at desc);

drop trigger if exists playground_runs_set_updated_at on public.playground_runs;
create trigger playground_runs_set_updated_at
before update on public.playground_runs
for each row execute function public.set_updated_at();

alter table public.playground_runs enable row level security;

drop policy if exists "playground_runs_select_own" on public.playground_runs;
create policy "playground_runs_select_own"
on public.playground_runs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "playground_runs_insert_own" on public.playground_runs;
create policy "playground_runs_insert_own"
on public.playground_runs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "playground_runs_update_own" on public.playground_runs;
create policy "playground_runs_update_own"
on public.playground_runs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "playground_runs_delete_own" on public.playground_runs;
create policy "playground_runs_delete_own"
on public.playground_runs
for delete
to authenticated
using (auth.uid() = user_id);

-- Last session state (single row per user)
create table if not exists public.playground_state (
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists playground_state_set_updated_at on public.playground_state;
create trigger playground_state_set_updated_at
before update on public.playground_state
for each row execute function public.set_updated_at();

alter table public.playground_state enable row level security;

drop policy if exists "playground_state_select_own" on public.playground_state;
create policy "playground_state_select_own"
on public.playground_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "playground_state_insert_own" on public.playground_state;
create policy "playground_state_insert_own"
on public.playground_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "playground_state_update_own" on public.playground_state;
create policy "playground_state_update_own"
on public.playground_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "playground_state_delete_own" on public.playground_state;
create policy "playground_state_delete_own"
on public.playground_state
for delete
to authenticated
using (auth.uid() = user_id);
