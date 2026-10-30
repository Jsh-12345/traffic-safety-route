-- Supabase SQL Editor에서 한 번 실행합니다.
create table if not exists public.accident_hotspots (
  id text primary key,
  year integer not null check (year between 2017 and 2100),
  label text not null,
  district text not null default '',
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  type text not null check (type in ('01', '02')),
  type_label text not null,
  radius integer not null check (radius > 0),
  accidents integer not null check (accidents >= 0),
  injuries integer not null check (injuries >= 0),
  fatalities integer not null check (fatalities >= 0),
  updated_at timestamptz not null default now()
);
create index if not exists accident_hotspots_year_idx on public.accident_hotspots (year);
alter table public.accident_hotspots enable row level security;
revoke all on public.accident_hotspots from anon, authenticated;
drop policy if exists "Read accident hotspots" on public.accident_hotspots;
create policy "Read accident hotspots" on public.accident_hotspots
  for select to anon, authenticated using (true);
grant select on public.accident_hotspots to anon, authenticated;
grant all on public.accident_hotspots to service_role;

create table if not exists public.accident_imports (
  year integer primary key,
  row_count integer not null check (row_count > 0),
  imported_at timestamptz not null default now()
);
alter table public.accident_imports enable row level security;
revoke all on public.accident_imports from anon, authenticated;
drop policy if exists "Read completed accident imports" on public.accident_imports;
create policy "Read completed accident imports" on public.accident_imports
  for select to anon, authenticated using (true);
grant select on public.accident_imports to anon, authenticated;
grant all on public.accident_imports to service_role;
-- 전국 수집용 열과 지역별 수집 상태 테이블은 national_accidents.sql을 이어서 실행합니다.

create table if not exists public.route_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  start_region text not null,
  destination_region text not null,
  start_label text,
  destination_label text,
  start_address text,
  destination_address text,
  start_lat double precision,
  start_lng double precision,
  destination_lat double precision,
  destination_lng double precision,
  data_year integer,
  route_type text not null check (route_type in ('fast', 'balanced', 'safe')),
  safety_level integer not null check (safety_level between 0 and 100),
  accident_data_available boolean not null,
  recommended_route text not null,
  candidates jsonb not null check (jsonb_typeof(candidates) = 'array')
);
-- 이미 생성된 테이블에도 선택적인 상세 위치 열을 추가합니다.
alter table public.route_analyses add column if not exists start_label text;
alter table public.route_analyses add column if not exists destination_label text;
alter table public.route_analyses add column if not exists start_address text;
alter table public.route_analyses add column if not exists destination_address text;
alter table public.route_analyses add column if not exists start_lat double precision;
alter table public.route_analyses add column if not exists start_lng double precision;
alter table public.route_analyses add column if not exists destination_lat double precision;
alter table public.route_analyses add column if not exists destination_lng double precision;
create index if not exists route_analyses_user_created_idx on public.route_analyses (user_id, created_at desc);
alter table public.route_analyses enable row level security;
revoke all on public.route_analyses from anon, authenticated;
drop policy if exists "Read own route analyses" on public.route_analyses;
drop policy if exists "Insert own route analyses" on public.route_analyses;
drop policy if exists "Delete own route analyses" on public.route_analyses;
create policy "Read own route analyses" on public.route_analyses
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own route analyses" on public.route_analyses
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Delete own route analyses" on public.route_analyses
  for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, delete on public.route_analyses to authenticated;
