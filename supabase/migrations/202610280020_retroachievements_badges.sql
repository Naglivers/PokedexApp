-- Execute após as queries 001, 015, 017 e 018.
begin;
create table if not exists pokeatlas_private.ra_sync (
 account_id uuid primary key references pokeatlas_private.accounts(id) on delete cascade,
 source_url text not null, claim uuid not null default gen_random_uuid(),
 claim_until timestamptz not null default now(), attempted_at timestamptz,
 synced_at timestamptz, last_error boolean not null default false
);
create table if not exists pokeatlas_private.ra_badges (
 account_id uuid not null references pokeatlas_private.accounts(id) on delete cascade,
 ra_game_id integer not null check(ra_game_id>0),
 game text not null references pokeatlas_private.quest_games(game),
 title text not null, versions jsonb not null, image text,
 mode text not null check(mode in ('softcore','hardcore')),
 total integer not null check(total>0), awarded integer not null,
 source_url text not null, synced_at timestamptz not null default now(),
 primary key(account_id,ra_game_id), check(awarded>=total)
);
alter table pokeatlas_private.ra_sync enable row level security;
alter table pokeatlas_private.ra_badges enable row level security;
revoke all on pokeatlas_private.ra_sync,pokeatlas_private.ra_badges from public,anon,authenticated;

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
create or replace function public.pokeatlas_ra_claim(p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_account uuid:=pokeatlas_private.session_account(p_token);
begin
 if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
 return public.pokeatlas_ra_claim_account(v_account);
end;
$$;
create or replace function public.pokeatlas_ra_finish(p_account_id uuid,p_claim uuid,p_source_url text,p_badges jsonb,p_error boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row pokeatlas_private.ra_sync; b jsonb;
begin
 select * into v_row from pokeatlas_private.ra_sync where account_id=p_account_id for update;
 if not found or v_row.claim<>p_claim or v_row.source_url<>p_source_url or v_row.claim_until<now() then
  return jsonb_build_object('ok',false,'code','stale');
 end if;
 if not exists(select 1 from pokeatlas_private.friend_codes where account_id=p_account_id and retroachievements=p_source_url) then
  update pokeatlas_private.ra_sync set claim_until=now() where account_id=p_account_id;
  return jsonb_build_object('ok',false,'code','link_changed');
 end if;
 if p_error then
  update pokeatlas_private.ra_sync set claim_until=now(),last_error=true where account_id=p_account_id;
  return jsonb_build_object('ok',true);
 end if;
 if p_badges is null or jsonb_typeof(p_badges)<>'array' or jsonb_array_length(p_badges)>100 then
  return jsonb_build_object('ok',false,'code','invalid_input');
 end if;
 -- Only the server's service role can call this function.
 for b in select value from jsonb_array_elements(p_badges) loop
  if (b->>'total')::integer<=0 or (b->>'awarded')::integer<(b->>'total')::integer
   or (b->>'mode') not in ('softcore','hardcore')
   or char_length(b->>'title') not between 1 and 200
   or jsonb_typeof(b->'versions')<>'array'
   or ((b->>'image') is not null and (b->>'image') !~ '^/Images/[0-9]+[.]png$')
   then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
 end loop;
 delete from pokeatlas_private.ra_badges where account_id=p_account_id;
 insert into pokeatlas_private.ra_badges(account_id,ra_game_id,game,title,versions,image,mode,total,awarded,source_url)
 select p_account_id,(b->>'ra_game_id')::integer,b->>'game',b->>'title',b->'versions',b->>'image',
 b->>'mode',(b->>'total')::integer,(b->>'awarded')::integer,p_source_url
 from jsonb_array_elements(p_badges) b;
 update pokeatlas_private.ra_sync set claim_until=now(),synced_at=now(),last_error=false where account_id=p_account_id;
 return jsonb_build_object('ok',true,'count',jsonb_array_length(p_badges));
end;
$$;
create or replace function public.pokeatlas_ra_profile(p_nickname text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_account uuid; v_url text;
begin
 select id into v_account from pokeatlas_private.accounts where lower(nickname)=lower(p_nickname);
 if v_account is null then return jsonb_build_object('ok',false,'code','not_found'); end if;
 select retroachievements into v_url from pokeatlas_private.friend_codes where account_id=v_account;
 return jsonb_build_object('ok',true,'linked',coalesce(v_url<>'',false),'source_url',v_url,
 'synced_at',(select synced_at from pokeatlas_private.ra_sync where account_id=v_account and source_url=v_url),
 'last_error',coalesce((select last_error from pokeatlas_private.ra_sync where account_id=v_account and source_url=v_url),false),
 'badges',coalesce((
  select jsonb_agg(jsonb_build_object('ra_game_id',ra_game_id,'game',game,'title',title,'versions',versions,
   'image',image,'mode',mode,'total',total,'awarded',awarded) order by ra_game_id)
  from pokeatlas_private.ra_badges where account_id=v_account and source_url=v_url
 ),'[]'::jsonb));
end;
$$;
create or replace function public.pokeatlas_ra_accounts(p_after uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(account_id order by account_id),'[]'::jsonb) from (
  select account_id from pokeatlas_private.friend_codes where retroachievements is not null and retroachievements<>''
  and (p_after is null or account_id>p_after) order by account_id limit 3
 ) a;
$$;
revoke all on function public.pokeatlas_ra_claim_account(uuid),public.pokeatlas_ra_finish(uuid,uuid,text,jsonb,boolean),public.pokeatlas_ra_accounts(uuid),public.pokeatlas_ra_claim(text),public.pokeatlas_ra_profile(text) from public,anon,authenticated;
grant execute on function public.pokeatlas_ra_claim_account(uuid),public.pokeatlas_ra_finish(uuid,uuid,text,jsonb,boolean),public.pokeatlas_ra_accounts(uuid) to service_role;
grant execute on function public.pokeatlas_ra_claim(text) to authenticated;
grant execute on function public.pokeatlas_ra_profile(text) to anon,authenticated;
notify pgrst,'reload schema';
commit;

