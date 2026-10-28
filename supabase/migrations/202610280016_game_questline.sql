-- Execute após 001 (contas).
begin;
create table if not exists pokeatlas_private.game_quests (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references pokeatlas_private.accounts(id) on delete cascade,
 game text not null check(game ~ '^[a-z0-9-]{1,100}$'),
 title text not null check(char_length(title) between 3 and 180),
 completed boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists game_quests_account_game on pokeatlas_private.game_quests(account_id,game,created_at);
alter table pokeatlas_private.game_quests enable row level security;
revoke all on pokeatlas_private.game_quests from public,anon,authenticated;
create or replace function public.pokeatlas_game_quests(p_token text,p_game text,p_action text default 'list',p_id uuid default null,p_title text default null,p_completed boolean default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_account uuid:=pokeatlas_private.session_account(p_token);
begin
 if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
 if p_game is null or p_game !~ '^[a-z0-9-]{1,100}$' or p_action is null or p_action not in ('list','create','set','remove') then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
 if p_action='create' then
  if p_title is null or char_length(btrim(p_title)) not between 3 and 180 then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
  if not pokeatlas_private.allow_attempt('quest-create:'||v_account::text,20) then return jsonb_build_object('ok',false,'code','rate_limited'); end if;
  if (select count(*) from pokeatlas_private.game_quests where account_id=v_account and game=p_game)>=500 then return jsonb_build_object('ok',false,'code','limit'); end if;
  insert into pokeatlas_private.game_quests(account_id,game,title) values(v_account,p_game,btrim(p_title));
 elsif p_action='set' then
  if p_completed is null then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
  update pokeatlas_private.game_quests set completed=p_completed where id=p_id and account_id=v_account and game=p_game;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
 elsif p_action='remove' then
  delete from pokeatlas_private.game_quests where id=p_id and account_id=v_account and game=p_game;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
 end if;
 return jsonb_build_object('ok',true,'quests',coalesce((
  select jsonb_agg(jsonb_build_object('id',id,'title',title,'completed',completed,'created_at',created_at) order by created_at,id)
  from pokeatlas_private.game_quests where account_id=v_account and game=p_game
 ),'[]'::jsonb));
end;
$$;
revoke all on function public.pokeatlas_game_quests(text,text,text,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.pokeatlas_game_quests(text,text,text,uuid,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
