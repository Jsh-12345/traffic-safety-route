begin;
alter table public.route_analyses add column if not exists snapshot jsonb;
create table if not exists public.login_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null check (nickname ~ '^[a-z0-9가-힣_]{2,20}$'),
 unique(nickname)
);
alter table public.login_profiles enable row level security;
revoke all on public.login_profiles from anon, authenticated;
grant select, insert, update on public.login_profiles to authenticated;
grant select on public.login_profiles to service_role;
drop policy if exists "own nickname" on public.login_profiles;
create policy "own nickname" on public.login_profiles for all to authenticated
 using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.nickname_attempts (
 key text primary key, started_at timestamptz not null, attempts integer not null
);
alter table public.nickname_attempts enable row level security;
revoke all on public.nickname_attempts from anon, authenticated;
create or replace function public.consume_nickname_attempt(attempt_key text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
 delete from public.nickname_attempts where started_at < now() - interval '1 day';
 insert into public.nickname_attempts as t values(attempt_key, now(), 1)
 on conflict(key) do update set
 attempts = case when t.started_at < now()-interval '10 minutes' then 1 else t.attempts+1 end,
 started_at = case when t.started_at < now()-interval '10 minutes' then now() else t.started_at end
 returning attempts into n;
 return n <= 10;
end $$;
revoke all on function public.consume_nickname_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_nickname_attempt(text) to service_role;
commit;
