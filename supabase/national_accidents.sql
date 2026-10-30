-- 전국 사고 다발지역 수집용 변경 사항입니다. Supabase SQL Editor에서 한 번 실행합니다.
alter table public.accident_hotspots add column if not exists region_code text;
create index if not exists accident_hotspots_year_region_idx on public.accident_hotspots (year, region_code);
create index if not exists accident_hotspots_year_lat_lng_idx on public.accident_hotspots (year, lat, lng);

-- 전국 수집이 끝난 연도에만 지역 수를 기록합니다. 값이 없으면 이전 대전 전용 자료입니다.
alter table public.accident_imports add column if not exists region_count integer;

-- 연도·지역별 수집 상태. success + row_count 0은 "정상 조회 결과 0건", failed는 "조회 실패"입니다.
create table if not exists public.accident_import_regions (
  year integer not null check (year between 2017 and 2100),
  region_code text not null,
  region_name text not null,
  status text not null check (status in ('importing', 'success', 'failed')),
  row_count integer check (row_count >= 0),
  error text,
  attempted_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (year, region_code),
  check (status <> 'success' or row_count is not null)
);
alter table public.accident_import_regions enable row level security;
revoke all on public.accident_import_regions from anon, authenticated;
grant all on public.accident_import_regions to service_role;
