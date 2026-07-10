-- 농사일지 초기 스키마: entries(일지) / work_items(작업 기록) / expenses(비용 기록)
-- 개인용 1계정 기준이지만, 나중에 공개/다중 사용자 전환을 고려해 user_id 기준 RLS를 처음부터 적용한다.

create extension if not exists "pgcrypto";

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  weather text check (weather in ('맑음', '흐림', '비', '눈')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table if not exists public.work_items (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  content text not null,
  tag text check (tag in ('sow', 'harvest')),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  content text not null,
  amount numeric(12, 0) not null,
  created_at timestamptz not null default now()
);

create index if not exists work_items_entry_id_idx on public.work_items (entry_id);
create index if not exists expenses_entry_id_idx on public.expenses (entry_id);
create index if not exists entries_user_date_idx on public.entries (user_id, entry_date desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
before update on public.entries
for each row execute function public.set_updated_at();

alter table public.entries enable row level security;
alter table public.work_items enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "entries_owner_all" on public.entries;
create policy "entries_owner_all" on public.entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "work_items_owner_all" on public.work_items;
create policy "work_items_owner_all" on public.work_items
  for all using (
    exists (select 1 from public.entries e where e.id = work_items.entry_id and e.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.entries e where e.id = work_items.entry_id and e.user_id = auth.uid())
  );

drop policy if exists "expenses_owner_all" on public.expenses;
create policy "expenses_owner_all" on public.expenses
  for all using (
    exists (select 1 from public.entries e where e.id = expenses.entry_id and e.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.entries e where e.id = expenses.entry_id and e.user_id = auth.uid())
  );
