-- Execute após 202610280001_accounts.sql.
begin;
create table if not exists pokeatlas_private.friend_codes (
 account_id uuid primary key references pokeatlas_private.accounts(id) on delete cascade,
 retroachievements text, pokemmo text, switch_code text, three_ds_code text, home_code text, champions_code text,
 updated_at timestamptz not null default now()
);
alter table pokeatlas_private.friend_codes enable row level security;
revoke all on pokeatlas_private.friend_codes from public,anon,authenticated;
create or replace function public.pokeatlas_friend_codes_get(p_nickname text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_account uuid;
begin
 select id into v_account from pokeatlas_private.accounts where lower(nickname)=lower(p_nickname);
 if v_account is null then return jsonb_build_object('ok',false,'code','not_found'); end if;
 return jsonb_build_object('ok',true,'codes',coalesce((
  select to_jsonb(c)-'account_id'-'updated_at' from pokeatlas_private.friend_codes c where account_id=v_account
 ),'{}'::jsonb));
end;
$$;
create or replace function public.pokeatlas_friend_codes_save(p_token text,p_codes jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_account uuid:=pokeatlas_private.session_account(p_token);
 v_ra text; v_mmo text; v_switch text; v_ds text; v_home text; v_champions text;
 v_row pokeatlas_private.friend_codes;
begin
 if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
 if p_codes is null or jsonb_typeof(p_codes)<>'object' or pg_column_size(p_codes)>3000 then
  return jsonb_build_object('ok',false,'code','invalid_input');
 end if;
 if exists(select 1 from jsonb_each(p_codes) e where e.key not in ('retroachievements','pokemmo','switch_code','three_ds_code','home_code','champions_code') or jsonb_typeof(e.value) not in ('string','null')) then
  return jsonb_build_object('ok',false,'code','invalid_input');
 end if;
 v_ra:=nullif(btrim(p_codes->>'retroachievements'),'');
 v_mmo:=nullif(btrim(p_codes->>'pokemmo'),'');
 v_switch:=nullif(regexp_replace(regexp_replace(upper(btrim(p_codes->>'switch_code')),'^SW[- ]?',''),'[-[:space:]]','','g'),'');
 v_ds:=nullif(regexp_replace(p_codes->>'three_ds_code','[-[:space:]]','','g'),'');
 v_home:=nullif(regexp_replace(upper(p_codes->>'home_code'),'[-[:space:]]','','g'),'');
 v_champions:=nullif(btrim(p_codes->>'champions_code'),'');
 if v_ra is not null and (char_length(v_ra)>160 or v_ra !~ '^https://(www[.])?retroachievements[.]org/user/[a-zA-Z0-9_.%-]{1,80}/?$') then return jsonb_build_object('ok',false,'code','invalid_ra'); end if;
 if v_mmo is not null and (char_length(v_mmo)>40 or v_mmo ~ '[[:cntrl:]]') then return jsonb_build_object('ok',false,'code','invalid_mmo'); end if;
 if v_switch is not null and v_switch !~ '^[0-9]{12}$' then return jsonb_build_object('ok',false,'code','invalid_switch'); end if;
 if v_ds is not null and v_ds !~ '^[0-9]{12}$' then return jsonb_build_object('ok',false,'code','invalid_ds'); end if;
 if v_home is not null and v_home !~ '^[A-Z]{12}$' then return jsonb_build_object('ok',false,'code','invalid_home'); end if;
 if v_champions is not null and (char_length(v_champions)>64 or v_champions ~ '[[:cntrl:]]') then return jsonb_build_object('ok',false,'code','invalid_champions'); end if;
 insert into pokeatlas_private.friend_codes(account_id,retroachievements,pokemmo,switch_code,three_ds_code,home_code,champions_code)
 values(v_account,v_ra,v_mmo,case when v_switch is null then null else 'SW-'||substr(v_switch,1,4)||'-'||substr(v_switch,5,4)||'-'||substr(v_switch,9,4) end,
 case when v_ds is null then null else substr(v_ds,1,4)||'-'||substr(v_ds,5,4)||'-'||substr(v_ds,9,4) end,v_home,v_champions)
 on conflict(account_id) do update set retroachievements=excluded.retroachievements,pokemmo=excluded.pokemmo,
 switch_code=excluded.switch_code,three_ds_code=excluded.three_ds_code,home_code=excluded.home_code,champions_code=excluded.champions_code,updated_at=now()
 returning * into v_row;
 return jsonb_build_object('ok',true,'codes',to_jsonb(v_row)-'account_id'-'updated_at');
end;
$$;
revoke all on function public.pokeatlas_friend_codes_get(text) from public,anon,authenticated;
revoke all on function public.pokeatlas_friend_codes_save(text,jsonb) from public,anon,authenticated;
grant execute on function public.pokeatlas_friend_codes_get(text) to anon,authenticated;
grant execute on function public.pokeatlas_friend_codes_save(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
