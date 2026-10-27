-- Execute após 202610280003_dex_tracker.sql.
-- Publica apenas nickname, avatar e totais das dex. Não libera tabelas privadas.
begin;
create or replace function public.pokeatlas_public_profile(p_nickname text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_account_id uuid;
  v_nickname text;
  v_avatar_url text;
begin
  if p_nickname is null or btrim(p_nickname) !~ '^[A-Za-z0-9_]{3,20}$' then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  select a.id, a.nickname, a.avatar_url into v_account_id, v_nickname, v_avatar_url
  from pokeatlas_private.accounts a where lower(a.nickname) = lower(btrim(p_nickname));
  if v_account_id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  return jsonb_build_object('ok', true, 'profile', jsonb_build_object(
    'nickname', v_nickname,
    'avatar_url', v_avatar_url,
    'trackers', jsonb_build_object(
      'pokedex', (select count(*) from pokeatlas_private.tracker_marks m where m.account_id = v_account_id and m.tracker_kind = 'pokedex'),
      'shinydex', (select count(*) from pokeatlas_private.tracker_marks m where m.account_id = v_account_id and m.tracker_kind = 'shinydex')
    )
  ));
end;
$$;
revoke all on function public.pokeatlas_public_profile(text) from public, anon, authenticated;
grant execute on function public.pokeatlas_public_profile(text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
