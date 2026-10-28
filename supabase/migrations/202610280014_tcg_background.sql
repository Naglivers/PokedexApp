-- Execute após 001 (contas) e 010 (administrador).
begin;
create table if not exists pokeatlas_private.tcg_background (
 card_id text not null, language text not null,
 status text not null default 'pending' check(status in ('pending','done','error')),
 claim uuid not null default gen_random_uuid(),
 card_name text, local_id text, set_id text, set_name text, image text,
 main_ids integer[] not null default '{}', pokemon_ids integer[] not null default '{}',
 reviewed boolean not null default false,
 model text, updated_at timestamptz not null default now(),
 primary key(card_id,language)
);
create index if not exists tcg_background_species on pokeatlas_private.tcg_background using gin(pokemon_ids);
create table if not exists pokeatlas_private.tcg_background_budget (
 day date primary key, used integer not null default 0 check(used between 0 and 20)
);
alter table pokeatlas_private.tcg_background enable row level security;
alter table pokeatlas_private.tcg_background_budget enable row level security;
revoke all on pokeatlas_private.tcg_background,pokeatlas_private.tcg_background_budget from public,anon,authenticated;

create or replace function public.pokeatlas_tcg_background_get(p_card_id text,p_language text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('ok',true,'analysis',(
  select jsonb_build_object('status',status,'pokemon_ids',pokemon_ids,'reviewed',reviewed,'updated_at',updated_at)
  from pokeatlas_private.tcg_background where card_id=p_card_id and language=p_language
 ));
$$;
create or replace function public.pokeatlas_tcg_background_list(p_pokemon_id integer,p_languages text[],p_page integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if p_pokemon_id is null or p_pokemon_id not between 1 and 20000 or p_page is null or p_page not between 0 and 10000 or cardinality(p_languages) not between 1 and 10 then
  return jsonb_build_object('ok',false,'code','invalid_input');
 end if;
 return jsonb_build_object('ok',true,'total',(
  select count(*) from pokeatlas_private.tcg_background b where status='done' and p_pokemon_id=any(pokemon_ids) and not(p_pokemon_id=any(main_ids)) and language=any(p_languages)
 ),'cards',coalesce((
  select jsonb_agg(row_to_json(result)) from (
   select card_id as id,language,card_name as name,local_id as "localId",set_name,image,reviewed
   from pokeatlas_private.tcg_background b where status='done' and p_pokemon_id=any(pokemon_ids) and not(p_pokemon_id=any(main_ids)) and language=any(p_languages)
   order by updated_at desc,card_id,language limit 18 offset p_page*18
  ) result
 ),'[]'::jsonb));
end;
$$;
create or replace function public.pokeatlas_tcg_background_claim(p_token text,p_card_id text,p_language text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_account uuid:=pokeatlas_private.session_account(p_token); v_row pokeatlas_private.tcg_background; v_used integer;
begin
 if v_account is null or not exists(select 1 from pokeatlas_private.forum_admins where account_id=v_account) then return jsonb_build_object('ok',false,'code','forbidden'); end if;
 if p_card_id is null or p_card_id !~ '^[a-zA-Z0-9._-]{1,100}$' or p_language is null or p_language not in ('en','pt-br','es','fr','de','it','ja','zh-tw','id','th') then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
 -- Serializa reservas por carta, inclusive antes de existir registro.
 perform pg_advisory_xact_lock(hashtextextended('tcg:'||p_language||':'||p_card_id,0));
 select * into v_row from pokeatlas_private.tcg_background where card_id=p_card_id and language=p_language;
 if found then
  if v_row.status='done' then return jsonb_build_object('ok',true,'cached',true); end if;
  if v_row.status='pending' and v_row.updated_at>now()-interval '5 minutes' then return jsonb_build_object('ok',false,'code','busy'); end if;
 end if;
 insert into pokeatlas_private.tcg_background_budget(day,used) values(current_date,1)
 on conflict(day) do update set used=tcg_background_budget.used+1 where tcg_background_budget.used<20
 returning used into v_used;
 if v_used is null then return jsonb_build_object('ok',false,'code','daily_limit'); end if;
 insert into pokeatlas_private.tcg_background(card_id,language) values(p_card_id,p_language)
 on conflict(card_id,language) do update set claim=gen_random_uuid(),status='pending',updated_at=now()
 returning * into v_row;
 return jsonb_build_object('ok',true,'cached',false,'claim',v_row.claim);
end;
$$;
create or replace function public.pokeatlas_tcg_background_finish(p_card_id text,p_language text,p_claim uuid,p_metadata jsonb,p_main_ids integer[],p_pokemon_ids integer[],p_model text,p_error boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_error then
  update pokeatlas_private.tcg_background set status='error',updated_at=now() where card_id=p_card_id and language=p_language and claim=p_claim and status='pending';
  return jsonb_build_object('ok',found);
 end if;
 if p_metadata is null or p_main_ids is null or p_pokemon_ids is null or cardinality(p_pokemon_ids)>20
 or exists(select 1 from unnest(p_main_ids||p_pokemon_ids) ids(id) where id is null or id not between 1 and 20000)
 or p_main_ids&&p_pokemon_ids or p_model is null or char_length(p_model)>100
 or char_length(p_metadata->>'name') not between 1 and 200
 or char_length(p_metadata->>'set_name') not between 1 and 200
 or (p_metadata->>'image') is null or (p_metadata->>'image') !~ '^https://assets[.]tcgdex[.]net/[^[:space:]]+$'
 then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
 update pokeatlas_private.tcg_background set status='done',card_name=p_metadata->>'name',
 local_id=p_metadata->>'localId',set_id=p_metadata->>'set_id',set_name=p_metadata->>'set_name',image=p_metadata->>'image',
 main_ids=p_main_ids,pokemon_ids=array(select distinct unnest(p_pokemon_ids)),model=p_model,reviewed=false,updated_at=now()
 where card_id=p_card_id and language=p_language and claim=p_claim and status='pending';
 return jsonb_build_object('ok',found);
end;
$$;
create or replace function public.pokeatlas_tcg_background_correct(p_token text,p_card_id text,p_language text,p_pokemon_ids integer[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_account uuid:=pokeatlas_private.session_account(p_token);
begin
 if v_account is null or not exists(select 1 from pokeatlas_private.forum_admins where account_id=v_account) then return jsonb_build_object('ok',false,'code','forbidden'); end if;
 if p_pokemon_ids is null or cardinality(p_pokemon_ids)>20 or exists(select 1 from unnest(p_pokemon_ids) ids(id) where id is null or id not between 1 and 20000) then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
 update pokeatlas_private.tcg_background set pokemon_ids=array(select distinct id from unnest(p_pokemon_ids) ids(id) where not(id=any(main_ids))),reviewed=true,updated_at=now()
 where card_id=p_card_id and language=p_language and status='done';
 return jsonb_build_object('ok',found);
end;
$$;
revoke all on function public.pokeatlas_tcg_background_get(text,text) from public,anon,authenticated;
revoke all on function public.pokeatlas_tcg_background_list(integer,text[],integer) from public,anon,authenticated;
revoke all on function public.pokeatlas_tcg_background_claim(text,text,text) from public,anon,authenticated;
revoke all on function public.pokeatlas_tcg_background_finish(text,text,uuid,jsonb,integer[],integer[],text,boolean) from public,anon,authenticated;
revoke all on function public.pokeatlas_tcg_background_correct(text,text,text,integer[]) from public,anon,authenticated;
grant execute on function public.pokeatlas_tcg_background_get(text,text),public.pokeatlas_tcg_background_list(integer,text[],integer) to anon,authenticated;
grant execute on function public.pokeatlas_tcg_background_claim(text,text,text),public.pokeatlas_tcg_background_correct(text,text,text,integer[]) to authenticated;
grant execute on function public.pokeatlas_tcg_background_finish(text,text,uuid,jsonb,integer[],integer[],text,boolean) to service_role;
notify pgrst,'reload schema';
commit;
