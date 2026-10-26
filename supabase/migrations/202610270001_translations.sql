begin;
create table if not exists public.pokeatlas_translation_cache (
  cache_key text primary key,
  translated_text text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.pokeatlas_translation_usage (
  user_id uuid references auth.users(id) on delete cascade,
  usage_day date not null default (now() at time zone 'utc')::date,
  characters integer not null default 0,
  primary key (user_id, usage_day)
);
alter table public.pokeatlas_translation_cache enable row level security;
alter table public.pokeatlas_translation_usage enable row level security;
revoke all on public.pokeatlas_translation_cache, public.pokeatlas_translation_usage from anon, authenticated;
grant all on public.pokeatlas_translation_cache, public.pokeatlas_translation_usage to service_role;
create or replace function public.pokeatlas_reserve_translation(p_user uuid, p_characters integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare reserved integer;
begin
  if p_characters < 1 or p_characters > 8000 then return false; end if;
  insert into public.pokeatlas_translation_usage(user_id, characters)
    values (p_user, p_characters)
    on conflict(user_id, usage_day) do update
      set characters = public.pokeatlas_translation_usage.characters + excluded.characters
      where public.pokeatlas_translation_usage.characters + excluded.characters <= 30000
    returning characters into reserved;
  return reserved is not null;
end;
$$;
revoke all on function public.pokeatlas_reserve_translation(uuid, integer) from public, anon, authenticated;
grant execute on function public.pokeatlas_reserve_translation(uuid, integer) to service_role;
commit;
