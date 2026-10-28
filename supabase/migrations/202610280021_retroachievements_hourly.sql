-- Execute após 020. Sincronização RetroAchievements com cache de uma hora.
begin;
create or replace function public.pokeatlas_ra_claim_account(p_account_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_url text; v_row pokeatlas_private.ra_sync;
begin
 select retroachievements into v_url from pokeatlas_private.friend_codes where account_id=p_account_id;
 if v_url is null or v_url='' then return jsonb_build_object('ok',false,'code','not_linked'); end if;
 perform pg_advisory_xact_lock(hashtextextended('ra:'||p_account_id::text,0));
 select * into v_row from pokeatlas_private.ra_sync where account_id=p_account_id;
 if found and v_row.source_url=v_url then
  if v_row.synced_at>now()-interval '1 hour' then return jsonb_build_object('ok',true,'cached',true); end if;
  if v_row.claim_until>now() then return jsonb_build_object('ok',false,'code','busy'); end if;
  if v_row.attempted_at>now()-interval '2 minutes' then return jsonb_build_object('ok',false,'code','rate_limited'); end if;
 end if;
 insert into pokeatlas_private.ra_sync(account_id,source_url,claim_until,attempted_at)
 values(p_account_id,v_url,now()+interval '2 minutes',now())
 on conflict(account_id) do update set source_url=excluded.source_url,claim=gen_random_uuid(),
 claim_until=excluded.claim_until,attempted_at=now(),
 synced_at=case when ra_sync.source_url=excluded.source_url then ra_sync.synced_at end
 returning * into v_row;
 return jsonb_build_object('ok',true,'cached',false,'account_id',p_account_id,'source_url',v_url,'claim',v_row.claim);
end;
$$;

notify pgrst,'reload schema';
commit;
