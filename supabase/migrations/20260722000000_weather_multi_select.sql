-- 날씨를 단일 선택에서 다중 선택으로 전환: entries.weather를 text -> text[]로 변경

alter table public.entries drop constraint if exists entries_weather_check;

alter table public.entries
  alter column weather type text[]
  using case when weather is null then null else array[weather] end;

alter table public.entries
  add constraint entries_weather_check
  check (weather is null or weather <@ array['맑음', '흐림', '비', '눈']::text[]);
