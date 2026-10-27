-- Curtidas vinculadas às contas de nickname. Execute após 202610280001_accounts.sql.
begin;
create table if not exists pokeatlas_private.account_likes (
  account_id uuid not null references pokeatlas_private.accounts(id) on delete cascade,
  pokemon_id integer not null check (pokemon_id between 1 and 20000),
  created_at timestamptz not null default now(),
  primary key (account_id, pokemon_id)
);
create index if not exists pokeatlas_account_likes_pokemon_idx on pokeatlas_private.account_likes(pokemon_id);
revoke all on pokeatlas_private.account_likes from public, anon, authenticated;

create or replace function public.pokeatlas_account_my_likes(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account_id uuid := pokeatlas_private.session_account(p_token);
begin
  if v_account_id is null then return jsonb_build_object('ok', false, 'code', 'session_expired'); end if;
  return jsonb_build_object('ok', true, 'likes', coalesce((
    select jsonb_agg(l.pokemon_id order by l.pokemon_id) from pokeatlas_private.account_likes l where l.account_id = v_account_id
  ), '[]'::jsonb));
end;
$$;

create or replace function public.pokeatlas_account_set_like(
  p_token text, p_pokemon_id integer, p_liked boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account_id uuid := pokeatlas_private.session_account(p_token); total integer;
begin
  if v_account_id is null then return jsonb_build_object('ok', false, 'code', 'session_expired'); end if;
  if p_pokemon_id is null or p_pokemon_id not between 1 and 20000 or p_liked is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;
  if p_liked then
    insert into pokeatlas_private.account_likes(account_id, pokemon_id) values (v_account_id, p_pokemon_id) on conflict do nothing;
  else
    delete from pokeatlas_private.account_likes where account_id = v_account_id and pokemon_id = p_pokemon_id;
  end if;
  select count(*)::integer into total from pokeatlas_private.account_likes where pokemon_id = p_pokemon_id;
  return jsonb_build_object('ok', true, 'liked', p_liked, 'total', total);
end;
$$;

create or replace function public.pokeatlas_account_like_counts(p_pokemon_ids integer[])
returns table(pokemon_id integer, total bigint)
language sql stable security definer set search_path = '' as $$
  select l.pokemon_id, count(*) from pokeatlas_private.account_likes l
  where l.pokemon_id = any(p_pokemon_ids[1:100])
  group by l.pokemon_id;
$$;

create or replace function public.pokeatlas_community_overview()
returns jsonb language sql stable security definer set search_path = '' as $$
  with all_likes as (
    select pokemon_id from public.pokeatlas_likes
    union all
    select pokemon_id from pokeatlas_private.account_likes
  )
  select jsonb_build_object(
    'likes', coalesce((select jsonb_agg(row_to_json(r)) from (
      select pokemon_id, count(*)::integer as total from all_likes group by pokemon_id order by total desc, pokemon_id limit 100
    ) r), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(row_to_json(r)) from (
      select path, count(*)::integer as views from public.pokeatlas_page_views group by path order by views desc, path limit 100
    ) r), '[]'::jsonb),
    'total_likes', (select count(*) from all_likes),
    'total_visits', (select count(*) from public.pokeatlas_page_views)
  );
$$;

revoke all on function public.pokeatlas_account_my_likes(text) from public, anon, authenticated;
revoke all on function public.pokeatlas_account_set_like(text, integer, boolean) from public, anon, authenticated;
revoke all on function public.pokeatlas_account_like_counts(integer[]) from public, anon, authenticated;
grant execute on function public.pokeatlas_account_my_likes(text) to authenticated;
grant execute on function public.pokeatlas_account_set_like(text, integer, boolean) to authenticated;
grant execute on function public.pokeatlas_account_like_counts(integer[]) to anon, authenticated;
revoke all on function public.pokeatlas_community_overview() from public, anon, authenticated;
grant execute on function public.pokeatlas_community_overview() to anon, authenticated;
notify pgrst, 'reload schema';
commit;
