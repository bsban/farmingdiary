-- 하루 기록에 딸린 사진: entry_id 기준으로 붙는 사진 목록 + 전용 storage 버킷

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  storage_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists photos_entry_id_idx on public.photos (entry_id);

alter table public.photos enable row level security;

drop policy if exists "photos_owner_all" on public.photos;
create policy "photos_owner_all" on public.photos
  for all using (
    exists (select 1 from public.entries e where e.id = photos.entry_id and e.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.entries e where e.id = photos.entry_id and e.user_id = auth.uid())
  );

-- storage: 비공개 버킷, 경로는 {user_id}/{entry_id}/{filename} 규칙으로 소유자만 접근
insert into storage.buckets (id, name, public)
values ('entry-photos', 'entry-photos', false)
on conflict (id) do nothing;

drop policy if exists "entry_photos_owner_select" on storage.objects;
create policy "entry_photos_owner_select" on storage.objects
  for select using (
    bucket_id = 'entry-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "entry_photos_owner_insert" on storage.objects;
create policy "entry_photos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'entry-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "entry_photos_owner_delete" on storage.objects;
create policy "entry_photos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'entry-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
