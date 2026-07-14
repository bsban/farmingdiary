-- 할일 목록: 날짜와 무관한 단순 체크리스트 (달력 화면 사이드바)

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists todos_user_id_idx on public.todos (user_id, created_at);

alter table public.todos enable row level security;

drop policy if exists "todos_owner_all" on public.todos;
create policy "todos_owner_all" on public.todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
