-- Execute após as migrações 006 e 008.
-- Megadex salva IDs de formas, sem misturar com capturas das demais dex.
begin;
create table if not exists pokeatlas_private.mega_tracker_marks (
  account_id uuid not null references pokeatlas_private.accounts(id) on delete cascade,
  pokemon_id integer not null check (pokemon_id in (10033,10034,10035,10036,10090,10073,10304,10305,10278,10037,10279,10071,10038,10039,10280,10040,10041,10042,10281,10043,10044,10282,10283,10045,10072,10046,10047,10284,10048,10049,10065,10050,10064,10051,10066,10052,10053,10054,10055,10070,10087,10067,10056,10306,10057,10307,10074,10089,10076,10062,10063,10079,10308,10088,10058,10309,10059,10310,10060,10068,10285,10311,10312,10286,10287,10069,10288,10289,10290,10291,10313,10292,10293,10294,10295,10296,10314,10326,10297,10298,10299,10300,10301,10075,10315,10316,10302,10317,10318,10319,10303,10320,10321,10322,10323,10324,10325)),
  created_at timestamptz not null default now(),
  primary key(account_id, pokemon_id)
);
alter table pokeatlas_private.mega_tracker_marks enable row level security;
revoke all on pokeatlas_private.mega_tracker_marks from public, anon, authenticated;

create or replace function public.pokeatlas_megadex_get(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account_id uuid := pokeatlas_private.session_account(p_token);
begin
  if v_account_id is null then return jsonb_build_object('ok', false, 'code', 'session_expired'); end if;
  return jsonb_build_object('ok', true, 'pokemon_ids', coalesce((
    select jsonb_agg(m.pokemon_id order by m.pokemon_id) from pokeatlas_private.mega_tracker_marks m where m.account_id = v_account_id
  ), '[]'::jsonb));
end;
$$;

create or replace function public.pokeatlas_megadex_apply(p_token text, p_add_ids integer[], p_remove_ids integer[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_account_id uuid := pokeatlas_private.session_account(p_token);
  v_allowed integer[] := array[10033,10034,10035,10036,10090,10073,10304,10305,10278,10037,10279,10071,10038,10039,10280,10040,10041,10042,10281,10043,10044,10282,10283,10045,10072,10046,10047,10284,10048,10049,10065,10050,10064,10051,10066,10052,10053,10054,10055,10070,10087,10067,10056,10306,10057,10307,10074,10089,10076,10062,10063,10079,10308,10088,10058,10309,10059,10310,10060,10068,10285,10311,10312,10286,10287,10069,10288,10289,10290,10291,10313,10292,10293,10294,10295,10296,10314,10326,10297,10298,10299,10300,10301,10075,10315,10316,10302,10317,10318,10319,10303,10320,10321,10322,10323,10324,10325];
begin
  if v_account_id is null then return jsonb_build_object('ok', false, 'code', 'session_expired'); end if;
  if p_add_ids is null or p_remove_ids is null
    or cardinality(p_add_ids) + cardinality(p_remove_ids) not between 1 and 4000
    or exists (select 1 from unnest(p_add_ids || p_remove_ids) ids(id) where id is null or not (id = any(v_allowed)))
    or exists (select 1 from unnest(p_add_ids) ids(id) where id = any(p_remove_ids))
    then return jsonb_build_object('ok', false, 'code', 'invalid_input'); end if;
  delete from pokeatlas_private.mega_tracker_marks m where m.account_id = v_account_id and m.pokemon_id = any(p_remove_ids);
  insert into pokeatlas_private.mega_tracker_marks(account_id, pokemon_id)
  select v_account_id, id from (select distinct unnest(p_add_ids) id) ids on conflict do nothing;
  return public.pokeatlas_megadex_get(p_token);
end;
$$;

create or replace function public.pokeatlas_public_profile(p_nickname text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_account_id uuid; v_nickname text; v_avatar_url text;
begin
  if p_nickname is null or btrim(p_nickname) !~ '^[A-Za-z0-9_]{3,20}$' then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  select a.id, a.nickname, a.avatar_url into v_account_id, v_nickname, v_avatar_url
  from pokeatlas_private.accounts a where lower(a.nickname) = lower(btrim(p_nickname));
  if v_account_id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'profile', jsonb_build_object(
    'nickname', v_nickname, 'avatar_url', v_avatar_url,
    'trackers', jsonb_build_object(
      'pokedex', (select count(*) from pokeatlas_private.tracker_marks m where m.account_id = v_account_id and m.tracker_kind = 'pokedex'),
      'shinydex', (select count(*) from pokeatlas_private.tracker_marks m where m.account_id = v_account_id and m.tracker_kind = 'shinydex'),
      'megadex', (select count(*) from pokeatlas_private.mega_tracker_marks m where m.account_id = v_account_id)
    ),
    'games', coalesce((select jsonb_object_agg(g.game_key, g.total) from (
      select m.game_key, count(*) as total from pokeatlas_private.game_tracker_marks m where m.account_id = v_account_id group by m.game_key
    ) g), '{}'::jsonb)
  ));
end;
$$;

create or replace function public.pokeatlas_public_tracker(p_nickname text, p_tracker text, p_game text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_account_id uuid; v_ids jsonb;
begin
  if p_nickname is null or btrim(p_nickname) !~ '^[A-Za-z0-9_]{3,20}$'
    or p_tracker is null or p_tracker not in ('pokedex', 'shinydex', 'megadex', 'gamesdex')
    or (p_tracker = 'gamesdex' and (p_game is null or p_game !~ '^[a-z0-9-]{1,80}$'))
    or (p_tracker <> 'gamesdex' and p_game is not null)
    then return jsonb_build_object('ok', false, 'code', 'invalid_input'); end if;
  select a.id into v_account_id from pokeatlas_private.accounts a where lower(a.nickname) = lower(btrim(p_nickname));
  if v_account_id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if p_tracker = 'megadex' then
    select jsonb_agg(m.pokemon_id order by m.pokemon_id) into v_ids
    from pokeatlas_private.mega_tracker_marks m where m.account_id = v_account_id;
  elsif p_tracker = 'gamesdex' then
    select jsonb_agg(m.pokemon_id order by m.pokemon_id) into v_ids
    from pokeatlas_private.game_tracker_marks m where m.account_id = v_account_id and m.game_key = p_game;
  else
    select jsonb_agg(m.pokemon_id order by m.pokemon_id) into v_ids
    from pokeatlas_private.tracker_marks m where m.account_id = v_account_id and m.tracker_kind = p_tracker;
  end if;
  return jsonb_build_object('ok', true, 'pokemon_ids', coalesce(v_ids, '[]'::jsonb));
end;
$$;

revoke all on function public.pokeatlas_megadex_get(text) from public, anon, authenticated;
revoke all on function public.pokeatlas_megadex_apply(text, integer[], integer[]) from public, anon, authenticated;
grant execute on function public.pokeatlas_megadex_get(text) to authenticated;
grant execute on function public.pokeatlas_megadex_apply(text, integer[], integer[]) to authenticated;
revoke all on function public.pokeatlas_public_profile(text) from public, anon, authenticated;
revoke all on function public.pokeatlas_public_tracker(text, text, text) from public, anon, authenticated;
grant execute on function public.pokeatlas_public_profile(text) to anon, authenticated;
grant execute on function public.pokeatlas_public_tracker(text, text, text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
