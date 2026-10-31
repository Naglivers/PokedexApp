-- Execute este arquivo inteiro no SQL Editor do Supabase, após a query 020.
-- Corrige o erro 42702 no salvamento das badges do RetroAchievements.
-- Pode ser executado novamente; não apaga badges ou progresso existentes.
begin;

create or replace function public.pokeatlas_ra_finish(
  p_account_id uuid,
  p_claim uuid,
  p_source_url text,
  p_badges jsonb,
  p_error boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row pokeatlas_private.ra_sync;
  v_badge jsonb;
begin
  select s.* into v_row
  from pokeatlas_private.ra_sync as s
  where s.account_id = p_account_id
  for update;

  if not found or p_claim is null or p_source_url is null
    or v_row.claim <> p_claim or v_row.source_url <> p_source_url
    or v_row.claim_until < now() then
    return jsonb_build_object('ok', false, 'code', 'stale');
  end if;

  if not exists (
    select 1 from pokeatlas_private.friend_codes as fc
    where fc.account_id = p_account_id and fc.retroachievements = p_source_url
  ) then
    update pokeatlas_private.ra_sync set claim_until = now()
    where account_id = p_account_id;
    return jsonb_build_object('ok', false, 'code', 'link_changed');
  end if;

  if p_error then
    update pokeatlas_private.ra_sync set claim_until = now(), last_error = true
    where account_id = p_account_id;
    return jsonb_build_object('ok', true);
  end if;

  if p_badges is null or jsonb_typeof(p_badges) <> 'array' then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;
  if jsonb_array_length(p_badges) > 100 then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  for v_badge in select entry.badge from jsonb_array_elements(p_badges) as entry(badge) loop
    if (v_badge->>'total')::integer <= 0
      or (v_badge->>'awarded')::integer < (v_badge->>'total')::integer
      or (v_badge->>'mode') not in ('softcore', 'hardcore')
      or char_length(v_badge->>'title') not between 1 and 200
      or jsonb_typeof(v_badge->'versions') <> 'array'
      or ((v_badge->>'image') is not null
        and (v_badge->>'image') !~ '^/Images/[0-9]+[.]png$') then
      return jsonb_build_object('ok', false, 'code', 'invalid_input');
    end if;
  end loop;

  delete from pokeatlas_private.ra_badges where account_id = p_account_id;
  insert into pokeatlas_private.ra_badges (
    account_id, ra_game_id, game, title, versions, image,
    mode, total, awarded, source_url
  )
  select
    p_account_id, (entry.badge->>'ra_game_id')::integer,
    entry.badge->>'game', entry.badge->>'title', entry.badge->'versions',
    entry.badge->>'image', entry.badge->>'mode',
    (entry.badge->>'total')::integer, (entry.badge->>'awarded')::integer,
    p_source_url
  from jsonb_array_elements(p_badges) as entry(badge);

  update pokeatlas_private.ra_sync
  set claim_until = now(), synced_at = now(), last_error = false
  where account_id = p_account_id;
  return jsonb_build_object('ok', true, 'count', jsonb_array_length(p_badges));
end;
$$;

revoke all on function public.pokeatlas_ra_finish(uuid, uuid, text, jsonb, boolean)
from public, anon, authenticated;
grant execute on function public.pokeatlas_ra_finish(uuid, uuid, text, jsonb, boolean)
to service_role;

notify pgrst, 'reload schema';
commit;
