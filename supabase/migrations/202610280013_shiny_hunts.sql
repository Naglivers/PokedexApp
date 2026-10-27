-- Execute após 001 (contas) e 003 (Dex Tracker).
begin;
create table if not exists pokeatlas_private.shiny_hunts (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references pokeatlas_private.accounts(id) on delete cascade,
 game text not null,
 pokemon_id integer not null check(pokemon_id between 1 and 20000),
 encounters integer not null default 0 check(encounters between 0 and 999999999),
 revision integer not null default 0,
 found_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists shiny_hunts_account on pokeatlas_private.shiny_hunts(account_id,created_at desc);
alter table pokeatlas_private.shiny_hunts enable row level security;
revoke all on pokeatlas_private.shiny_hunts from public,anon,authenticated;

create or replace function public.pokeatlas_shiny_hunts(
 p_token text, p_action text default 'list', p_id uuid default null,
 p_game text default null, p_pokemon_id integer default null,
 p_encounters integer default 0, p_revision integer default 0
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_account uuid := pokeatlas_private.session_account(p_token);
 v_hunt pokeatlas_private.shiny_hunts;
begin
 if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
 if p_action is null or p_action not in ('list','create','save','finish') then
   return jsonb_build_object('ok',false,'code','invalid_input');
 end if;
 if p_action='list' then
   return jsonb_build_object('ok',true,'hunts',coalesce((
     select jsonb_agg(to_jsonb(h)-'account_id' order by h.created_at desc)
     from pokeatlas_private.shiny_hunts h where h.account_id=v_account
   ),'[]'::jsonb));
 end if;
 if p_encounters is null or p_encounters not between 0 and 999999999 then
   return jsonb_build_object('ok',false,'code','invalid_input');
 end if;
 if p_action='create' then
   if p_game is null or p_game not in ('red-blue','yellow','gold-silver','crystal','ruby-sapphire','emerald','firered-leafgreen','diamond-pearl','platinum','heartgold-soulsilver','black-white','black-2-white-2','x-y','omega-ruby-alpha-sapphire','sun-moon','ultra-sun-ultra-moon','lets-go-pikachu-lets-go-eevee','sword-shield','sword-shield-isle-of-armor','sword-shield-crown-tundra','brilliant-diamond-shining-pearl','legends-arceus','scarlet-violet','scarlet-violet-teal-mask','scarlet-violet-indigo-disk','legends-za','legends-za-mega-dimension')
      or p_pokemon_id is null or p_pokemon_id not between 1 and 20000 then
     return jsonb_build_object('ok',false,'code','invalid_input');
   end if;
   if not pokeatlas_private.allow_attempt('shiny-create:'||v_account::text,20) then
     return jsonb_build_object('ok',false,'code','rate_limited');
   end if;
   if (select count(*) from pokeatlas_private.shiny_hunts where account_id=v_account)>=500 then
     return jsonb_build_object('ok',false,'code','limit');
   end if;
   insert into pokeatlas_private.shiny_hunts(account_id,game,pokemon_id,encounters)
   values(v_account,p_game,p_pokemon_id,p_encounters) returning * into v_hunt;
 else
   select * into v_hunt from pokeatlas_private.shiny_hunts
   where id=p_id and account_id=v_account for update;
   if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
   -- Repetir "Achei" não duplica nem altera a contagem já concluída.
   if v_hunt.found_at is not null then
     return jsonb_build_object('ok',true,'hunt',to_jsonb(v_hunt)-'account_id');
   end if;
   if p_revision is null or p_revision<>v_hunt.revision then
     return jsonb_build_object('ok',false,'code','conflict');
   end if;
   update pokeatlas_private.shiny_hunts set encounters=p_encounters,revision=revision+1,
     found_at=case when p_action='finish' then now() else null end,updated_at=now()
   where id=p_id and account_id=v_account returning * into v_hunt;
 end if;
 if p_action='finish' then
   insert into pokeatlas_private.tracker_marks(account_id,tracker_kind,pokemon_id)
   values(v_account,'shinydex',v_hunt.pokemon_id) on conflict do nothing;
 end if;
 return jsonb_build_object('ok',true,'hunt',to_jsonb(v_hunt)-'account_id');
end;
$$;
revoke all on function public.pokeatlas_shiny_hunts(text,text,uuid,text,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.pokeatlas_shiny_hunts(text,text,uuid,text,integer,integer,integer) to authenticated;
notify pgrst,'reload schema';
commit;
