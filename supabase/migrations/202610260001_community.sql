-- Execute este arquivo no SQL Editor do SEU projeto Supabase.
-- Depois habilite Authentication > Sign In / Providers > Anonymous Sign-Ins.
-- As tabelas brutas são privadas: apenas agregados são públicos.
begin;

create table if not exists public.pokeatlas_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  pokemon_id integer not null check (pokemon_id between 1 and 20000),
  created_at timestamptz not null default now(),
  primary key (user_id, pokemon_id)
);
create index if not exists pokeatlas_likes_pokemon_idx on public.pokeatlas_likes (pokemon_id);

create table if not exists public.pokeatlas_page_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null check (length(path) between 1 and 180 and path ~ '^/[a-zA-Z0-9/_-]*$'),
  visited_on date not null default (timezone('utc', now()))::date,
  created_at timestamptz not null default now(),
  primary key (user_id, path, visited_on)
);
create index if not exists pokeatlas_views_path_idx on public.pokeatlas_page_views (path, visited_on);

alter table public.pokeatlas_likes enable row level security;
alter table public.pokeatlas_page_views enable row level security;
revoke all on public.pokeatlas_likes from anon, authenticated;
revoke all on public.pokeatlas_page_views from anon, authenticated;
grant select on public.pokeatlas_likes to authenticated;

drop policy if exists "Read own Pokemon likes" on public.pokeatlas_likes;
create policy "Read own Pokemon likes" on public.pokeatlas_likes for select to authenticated using ((select auth.uid()) = user_id);

-- Publica apenas contagens, nunca user_id ou eventos individuais.
create or replace function public.pokeatlas_community_overview()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'likes', coalesce((select jsonb_agg(row_to_json(r)) from (
      select pokemon_id, count(*)::integer as total from public.pokeatlas_likes
      group by pokemon_id order by count(*) desc, pokemon_id asc limit 6
    ) r), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(row_to_json(r)) from (
      select path, count(*)::integer as views from public.pokeatlas_page_views
      group by path order by count(*) desc, path asc limit 6
    ) r), '[]'::jsonb),
    'total_likes', (select count(*) from public.pokeatlas_likes),
    'total_visits', (select count(*) from public.pokeatlas_page_views)
  );
$$;

create or replace function public.pokeatlas_like_counts(p_pokemon_ids integer[])
returns table(pokemon_id integer, total bigint)
language sql stable security definer set search_path = '' as $$
  select l.pokemon_id, count(*) from public.pokeatlas_likes l
  where l.pokemon_id = any(p_pokemon_ids[1:100]) group by l.pokemon_id;
$$;

create or replace function public.pokeatlas_set_like(p_pokemon_id integer, p_liked boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_pokemon_id is null or p_pokemon_id not between 1 and 20000 or p_liked is null then
    raise exception 'Invalid Pokemon or like state' using errcode = '22023';
  end if;
  if p_liked then
    insert into public.pokeatlas_likes(user_id, pokemon_id) values (current_user_id, p_pokemon_id) on conflict do nothing;
  else
    delete from public.pokeatlas_likes where user_id = current_user_id and pokemon_id = p_pokemon_id;
  end if;
  return jsonb_build_object('liked', p_liked, 'total', (select count(*) from public.pokeatlas_likes where pokemon_id = p_pokemon_id));
end;
$$;

-- Uma visita por identidade/página/dia UTC. Atualizar a página não infla o ranking.
create or replace function public.pokeatlas_track_page(p_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_path is null or length(p_path) > 180 or p_path !~ '^/[a-zA-Z0-9/_-]*$' then
    raise exception 'Invalid path' using errcode = '22023';
  end if;
  insert into public.pokeatlas_page_views(user_id, path) values(current_user_id, p_path) on conflict do nothing;
end;
$$;

revoke all on function public.pokeatlas_community_overview() from public;
revoke all on function public.pokeatlas_like_counts(integer[]) from public;
revoke all on function public.pokeatlas_set_like(integer, boolean) from public;
revoke all on function public.pokeatlas_track_page(text) from public;
grant execute on function public.pokeatlas_community_overview() to anon, authenticated;
grant execute on function public.pokeatlas_like_counts(integer[]) to anon, authenticated;
grant execute on function public.pokeatlas_set_like(integer, boolean) to authenticated;
grant execute on function public.pokeatlas_track_page(text) to authenticated;

commit;
