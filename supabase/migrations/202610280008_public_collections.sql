-- Execute depois da migração 006. Consulta pública de capturas, sem dados de login.
begin;
create or replace function public.pokeatlas_public_tracker(p_nickname text, p_tracker text, p_game text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_account_id uuid; v_ids jsonb;
begin
  if p_nickname is null or btrim(p_nickname) !~ '^[A-Za-z0-9_]{3,20}$'
    or p_tracker is null or p_tracker not in ('pokedex', 'shinydex', 'gamesdex')
    or (p_tracker = 'gamesdex' and (p_game is null or p_game !~ '^[a-z0-9-]{1,80}$'))
    or (p_tracker <> 'gamesdex' and p_game is not null)
    then return jsonb_build_object('ok', false, 'code', 'invalid_input'); end if;
  select a.id into v_account_id from pokeatlas_private.accounts a where lower(a.nickname) = lower(btrim(p_nickname));
  if v_account_id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if p_tracker = 'gamesdex' then
    select jsonb_agg(m.pokemon_id order by m.pokemon_id) into v_ids
    from pokeatlas_private.game_tracker_marks m where m.account_id = v_account_id and m.game_key = p_game;
  else
    select jsonb_agg(m.pokemon_id order by m.pokemon_id) into v_ids
    from pokeatlas_private.tracker_marks m where m.account_id = v_account_id and m.tracker_kind = p_tracker;
  end if;
  return jsonb_build_object('ok', true, 'pokemon_ids', coalesce(v_ids, '[]'::jsonb));
end;
$$;
revoke all on function public.pokeatlas_public_tracker(text, text, text) from public, anon, authenticated;
grant execute on function public.pokeatlas_public_tracker(text, text, text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
