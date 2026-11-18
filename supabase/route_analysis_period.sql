-- 한 해만 선택한 기존 기록은 data_year_end가 NULL이므로 data_year로 읽습니다.
begin;
alter table public.route_analyses
  add column if not exists data_year_end integer
  check (data_year_end is null or (data_year is not null and data_year_end >= data_year));
commit;
