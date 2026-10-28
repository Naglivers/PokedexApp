-- Execute após 017 e 018. Corrige a insígnia para 100% da checklist disponível.
begin;
create or replace function public.pokeatlas_questline(
 p_game text,p_token text default null,p_action text default 'list',
 p_quest_id text default null,p_completed boolean default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_account uuid;
 v_game pokeatlas_private.quest_games;
 v_total integer; v_done integer; v_qualified boolean;
begin
 if p_action is null or p_action not in ('list','set') then
  return jsonb_build_object('ok',false,'code','invalid_input');
 end if;
 select * into v_game from pokeatlas_private.quest_games where game=p_game;
 if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
 if p_token is not null then
  v_account:=pokeatlas_private.session_account(p_token);
  if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
 end if;
 if p_action='set' then
  if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
  if p_completed is null or p_quest_id is null or not exists(
   select 1 from pokeatlas_private.quest_catalog where game=p_game and quest_id=p_quest_id
  ) then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
  -- Serialize progress/award changes from multiple devices.
  perform pg_advisory_xact_lock(hashtextextended(v_account::text||':'||p_game,0));
  if p_completed then
   insert into pokeatlas_private.quest_progress(account_id,game,quest_id)
   values(v_account,p_game,p_quest_id) on conflict do nothing;
  else
   delete from pokeatlas_private.quest_progress where account_id=v_account and game=p_game and quest_id=p_quest_id;
  end if;
 end if;
 select count(*),count(p.quest_id) into v_total,v_done
 from pokeatlas_private.quest_catalog q left join pokeatlas_private.quest_progress p
 on p.game=q.game and p.quest_id=q.quest_id and p.account_id=v_account
 where q.game=p_game;
 v_qualified:=v_total>0 and v_done=v_total
  and (select count(distinct category)=3 from pokeatlas_private.quest_catalog where game=p_game);
 if p_action='set' then
  if v_qualified then
   insert into pokeatlas_private.quest_awards(account_id,game) values(v_account,p_game) on conflict do nothing;
  else
   delete from pokeatlas_private.quest_awards where account_id=v_account and game=p_game;
  end if;
 end if;
 return jsonb_build_object('ok',true,'game',p_game,'title',v_game.title,
 'reviewed',v_game.reviewed,'source',v_game.source,'side_source',v_game.side_source,
 'total',v_total,'completed',v_done,'badge',v_qualified,
 'earned_at',case when v_qualified then (select earned_at from pokeatlas_private.quest_awards where account_id=v_account and game=p_game) end,
 'quests',coalesce((
  select jsonb_agg(jsonb_build_object('id',q.quest_id,'title',q.title,
   'category',q.category,'note',q.note,'completed',p.quest_id is not null) order by q.position,q.quest_id)
  from pokeatlas_private.quest_catalog q left join pokeatlas_private.quest_progress p
  on p.game=q.game and p.quest_id=q.quest_id and p.account_id=v_account where q.game=p_game
 ),'[]'::jsonb));
end;
$$;
create or replace function public.pokeatlas_public_quest_badges(p_nickname text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_account uuid;
begin
 select id into v_account from pokeatlas_private.accounts where lower(nickname)=lower(p_nickname);
 if v_account is null then return jsonb_build_object('ok',false,'code','not_found'); end if;
 return jsonb_build_object('ok',true,'games',coalesce((
  select jsonb_agg(jsonb_build_object('game',s.game,'title',s.title,'versions',s.versions,
   'total',s.total,'completed',s.completed,'reviewed',s.reviewed,
   'badge',s.categories=3 and s.total>0 and s.completed=s.total,
   'earned_at',case when s.categories=3 and s.total>0 and s.completed=s.total then a.earned_at end)
   order by s.game)
  from (
   select g.game,g.title,g.versions,g.reviewed,count(q.quest_id)::integer as total,
   count(p.quest_id)::integer as completed,count(distinct q.category) as categories
   from pokeatlas_private.quest_games g
   left join pokeatlas_private.quest_catalog q on q.game=g.game
   left join pokeatlas_private.quest_progress p on p.game=q.game and p.quest_id=q.quest_id and p.account_id=v_account
   group by g.game,g.title,g.versions,g.reviewed
  ) s left join pokeatlas_private.quest_awards a on a.game=s.game and a.account_id=v_account
 ),'[]'::jsonb));
end;
$$;
-- Reconhece conclusões anteriores sem exigir nova marcação.
insert into pokeatlas_private.quest_awards(account_id,game,earned_at)
select p.account_id,q.game,max(p.completed_at)
from pokeatlas_private.quest_catalog q
join pokeatlas_private.quest_progress p on p.game=q.game and p.quest_id=q.quest_id
group by p.account_id,q.game
having count(*)=(select count(*) from pokeatlas_private.quest_catalog all_quests where all_quests.game=q.game)
 and count(distinct q.category)=3
on conflict(account_id,game) do nothing;
notify pgrst,'reload schema';
commit;
