-- Execute após as migrações 003 (trackers) e 005 (perfil público).
-- game_key identifica o conjunto: red-blue, yellow, ruby-sapphire, emerald etc.
-- O agrupamento usa a mesma tabela e RPCs; não exige outra migração.
begin;
create table if not exists pokeatlas_private.game_tracker_marks (
  account_id uuid not null references pokeatlas_private.accounts(id) on delete cascade,
  game_key text not null check (game_key ~ '^[a-z0-9-]{1,80}$'),
  pokemon_id integer not null check (pokemon_id between 1 and 20000),
  created_at timestamptz not null default now(),
  primary key (account_id, game_key, pokemon_id)
);
alter table pokeatlas_private.game_tracker_marks enable row level security;
revoke all on pokeatlas_private.game_tracker_marks from public, anon, authenticated;

create or replace function public.pokeatlas_gamesdex_get(p_token text, p_game text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account_id uuid := pokeatlas_private.session_account(p_token);
begin
  if v_account_id is null then return jsonb_build_object('ok', false, 'code', 'session_expired'); end if;
  if p_game is null or p_game !~ '^[a-z0-9-]{1,80}$' then return jsonb_build_object('ok', false, 'code', 'invalid_input'); end if;
  return jsonb_build_object('ok', true, 'pokemon_ids', coalesce((
    select jsonb_agg(m.pokemon_id order by m.pokemon_id) from pokeatlas_private.game_tracker_marks m
    where m.account_id = v_account_id and m.game_key = p_game
  ), '[]'::jsonb));
end;
$$;

create or replace function public.pokeatlas_gamesdex_summary(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account_id uuid := pokeatlas_private.session_account(p_token);
begin
  if v_account_id is null then return jsonb_build_object('ok', false, 'code', 'session_expired'); end if;
  return jsonb_build_object('ok', true, 'games', coalesce((
    select jsonb_object_agg(g.game_key, g.total) from (
      select m.game_key, count(*) as total from pokeatlas_private.game_tracker_marks m
      where m.account_id = v_account_id group by m.game_key
    ) g
  ), '{}'::jsonb));
end;
$$;

-- Explicit additions and removals; one transaction, no full-collection replacement.
create or replace function public.pokeatlas_tracker_apply(
  p_token text, p_tracker text, p_add_ids integer[], p_remove_ids integer[], p_game text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account_id uuid := pokeatlas_private.session_account(p_token);
begin
  if v_account_id is null then return jsonb_build_object('ok', false, 'code', 'session_expired'); end if;
  if p_tracker is null or p_tracker not in ('pokedex', 'shinydex', 'gamesdex')
    or p_add_ids is null or p_remove_ids is null
    or cardinality(p_add_ids) + cardinality(p_remove_ids) not between 1 and 4000
    or exists (select 1 from unnest(p_add_ids || p_remove_ids) as ids(id) where id is null or id not between 1 and 20000)
    or exists (select 1 from unnest(p_add_ids) as ids(id) where id = any(p_remove_ids))
    or (p_tracker = 'gamesdex' and (p_game is null or p_game !~ '^[a-z0-9-]{1,80}$'))
    or (p_tracker <> 'gamesdex' and p_game is not null) then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;
  if p_tracker = 'gamesdex' then
    delete from pokeatlas_private.game_tracker_marks m where m.account_id = v_account_id and m.game_key = p_game and m.pokemon_id = any(p_remove_ids);
    insert into pokeatlas_private.game_tracker_marks(account_id, game_key, pokemon_id)
    select v_account_id, p_game, id from (select distinct unnest(p_add_ids) as id) ids on conflict do nothing;
    return public.pokeatlas_gamesdex_get(p_token, p_game);
  end if;
  delete from pokeatlas_private.tracker_marks m where m.account_id = v_account_id and m.tracker_kind = p_tracker and m.pokemon_id = any(p_remove_ids);
  insert into pokeatlas_private.tracker_marks(account_id, tracker_kind, pokemon_id)
  select v_account_id, p_tracker, id from (select distinct unnest(p_add_ids) as id) ids on conflict do nothing;
  return public.pokeatlas_tracker_get(p_token, p_tracker);
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
      'shinydex', (select count(*) from pokeatlas_private.tracker_marks m where m.account_id = v_account_id and m.tracker_kind = 'shinydex')
    ),
    'games', coalesce((select jsonb_object_agg(g.game_key, g.total) from (
      select m.game_key, count(*) as total from pokeatlas_private.game_tracker_marks m where m.account_id = v_account_id group by m.game_key
    ) g), '{}'::jsonb)
  ));
end;
$$;

revoke all on function public.pokeatlas_gamesdex_get(text, text) from public, anon, authenticated;
revoke all on function public.pokeatlas_gamesdex_summary(text) from public, anon, authenticated;
revoke all on function public.pokeatlas_tracker_apply(text, text, integer[], integer[], text) from public, anon, authenticated;
grant execute on function public.pokeatlas_gamesdex_get(text, text) to authenticated;
grant execute on function public.pokeatlas_gamesdex_summary(text) to authenticated;
grant execute on function public.pokeatlas_tracker_apply(text, text, integer[], integer[], text) to authenticated;
revoke all on function public.pokeatlas_public_profile(text) from public, anon, authenticated;
grant execute on function public.pokeatlas_public_profile(text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
