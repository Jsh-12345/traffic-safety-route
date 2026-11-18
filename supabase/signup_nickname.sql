-- 먼저 기존 nickname_snapshot.sql이 적용되어 있어야 합니다.
begin;

create or replace function public.safe_route_claim_signup_nickname()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := new.raw_user_meta_data ->> 'signup_nickname';
begin
  -- 기존 가입 방식 및 이 메타데이터를 사용하지 않는 계정 생성도 허용합니다.
  if requested is null then
    return new;
  end if;

  requested := pg_catalog.lower(pg_catalog.btrim(requested));
  if requested !~ '^[a-z0-9가-힣_]{2,20}$' then
    raise exception 'Invalid signup nickname' using errcode = '22023';
  end if;

  -- nickname의 UNIQUE 제약이 동시 가입도 막습니다. 충돌하면 계정 생성도 롤백됩니다.
  insert into public.login_profiles (user_id, nickname) values (new.id, requested);
  return new;
end;
$$;

revoke all on function public.safe_route_claim_signup_nickname() from public, anon, authenticated;
drop trigger if exists safe_route_claim_signup_nickname on auth.users;
create trigger safe_route_claim_signup_nickname
after insert on auth.users
for each row execute function public.safe_route_claim_signup_nickname();

commit;
