-- 기존 분석 기록은 변경하지 않고, 선택한 새 기록에만 상세 위치를 저장할 열을 추가합니다.
alter table public.route_analyses add column if not exists start_label text;
alter table public.route_analyses add column if not exists destination_label text;
alter table public.route_analyses add column if not exists start_address text;
alter table public.route_analyses add column if not exists destination_address text;
alter table public.route_analyses add column if not exists start_lat double precision;
alter table public.route_analyses add column if not exists start_lng double precision;
alter table public.route_analyses add column if not exists destination_lat double precision;
alter table public.route_analyses add column if not exists destination_lng double precision;
