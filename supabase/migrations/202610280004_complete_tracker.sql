-- Execute inteiro após 202610280003_dex_tracker.sql.
-- Completa somente a coleção da conta e do tracker escolhidos, em uma transação.
begin;
create or replace function public.pokeatlas_tracker_complete(
  p_token text, p_tracker text, p_pokemon_ids integer[]
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account_id uuid := pokeatlas_private.session_account(p_token);
begin
  if v_account_id is null then
    return jsonb_build_object('ok', false, 'code', 'session_expired');
  end if;
  if p_tracker is null or p_tracker not in ('pokedex', 'shinydex')
    or p_pokemon_ids is null or cardinality(p_pokemon_ids) not between 1 and 2000
    or exists (select 1 from unnest(p_pokemon_ids) as ids(id) where id is null or id not between 1 and 20000) then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;
  insert into pokeatlas_private.tracker_marks(account_id, tracker_kind, pokemon_id)
  select v_account_id, p_tracker, id from (select distinct unnest(p_pokemon_ids) as id) ids
  on conflict do nothing;
  return public.pokeatlas_tracker_get(p_token, p_tracker);
end;
$$;
revoke all on function public.pokeatlas_tracker_complete(text, text, integer[]) from public, anon, authenticated;
grant execute on function public.pokeatlas_tracker_complete(text, text, integer[]) to authenticated;
notify pgrst, 'reload schema';
commit;
