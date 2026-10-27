-- Execute inteiro após 202610280001_accounts.sql.
begin;

create table if not exists pokeatlas_private.tracker_marks (
  account_id uuid not null references pokeatlas_private.accounts(id) on delete cascade,
  tracker_kind text not null check (tracker_kind in ('pokedex', 'shinydex')),
  pokemon_id integer not null check (pokemon_id between 1 and 20000),
  created_at timestamptz not null default now(),
  primary key (account_id, tracker_kind, pokemon_id)
);
alter table pokeatlas_private.tracker_marks enable row level security;
revoke all on pokeatlas_private.tracker_marks from public, anon, authenticated;

create or replace function public.pokeatlas_tracker_get(p_token text, p_tracker text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account_id uuid := pokeatlas_private.session_account(p_token);
begin
  if v_account_id is null then
    return jsonb_build_object('ok', false, 'code', 'session_expired');
  end if;
  if p_tracker is null or p_tracker not in ('pokedex', 'shinydex') then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;
  return jsonb_build_object('ok', true, 'pokemon_ids', coalesce((
    select jsonb_agg(m.pokemon_id order by m.pokemon_id)
    from pokeatlas_private.tracker_marks m
    where m.account_id = v_account_id and m.tracker_kind = p_tracker
  ), '[]'::jsonb));
end;
$$;

create or replace function public.pokeatlas_tracker_set(
  p_token text, p_tracker text, p_pokemon_ids integer[], p_caught boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account_id uuid := pokeatlas_private.session_account(p_token);
begin
  if v_account_id is null then
    return jsonb_build_object('ok', false, 'code', 'session_expired');
  end if;
  if p_tracker is null or p_tracker not in ('pokedex', 'shinydex')
    or p_caught is null or p_pokemon_ids is null
    or cardinality(p_pokemon_ids) not between 1 and 30
    or exists (select 1 from unnest(p_pokemon_ids) as ids(id) where id is null or id not between 1 and 20000) then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;
  if p_caught then
    insert into pokeatlas_private.tracker_marks(account_id, tracker_kind, pokemon_id)
    select v_account_id, p_tracker, id from (select distinct unnest(p_pokemon_ids) as id) ids
    on conflict do nothing;
  else
    delete from pokeatlas_private.tracker_marks m
    where m.account_id = v_account_id and m.tracker_kind = p_tracker
      and m.pokemon_id = any(p_pokemon_ids);
  end if;
  return public.pokeatlas_tracker_get(p_token, p_tracker);
end;
$$;

revoke all on function public.pokeatlas_tracker_get(text, text) from public, anon, authenticated;
revoke all on function public.pokeatlas_tracker_set(text, text, integer[], boolean) from public, anon, authenticated;
grant execute on function public.pokeatlas_tracker_get(text, text) to authenticated;
grant execute on function public.pokeatlas_tracker_set(text, text, integer[], boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
