-- Execute após 202610280001_accounts.sql.
-- Concede administração à conta naglivers já existente, pelo UUID permanente.
begin;
create table if not exists pokeatlas_private.forum_admins (
  slot integer primary key default 1 check (slot = 1),
  account_id uuid not null unique references pokeatlas_private.accounts(id) on delete restrict
);
do $$
begin
  if not exists (select 1 from pokeatlas_private.forum_admins) then
    insert into pokeatlas_private.forum_admins(account_id)
    select id from pokeatlas_private.accounts where lower(nickname) = 'naglivers';
    if not found then raise exception 'Cadastre a conta naglivers no app antes de executar esta query.'; end if;
  end if;
end;
$$;
create table if not exists pokeatlas_private.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references pokeatlas_private.accounts(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 4 and 140),
  body text not null check (char_length(btrim(body)) between 10 and 20000),
  kind text not null default 'post' check (kind in ('post','news')),
  source_url text check (source_url is null or (char_length(source_url) <= 2048 and source_url ~ '^https?://[^[:space:]]+$')),
  status text not null default 'published' check (status in ('published','hidden')),
  pinned boolean not null default false,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pokeatlas_forum_feed on pokeatlas_private.forum_posts(status, pinned desc, created_at desc, id desc);
create index if not exists pokeatlas_forum_news on pokeatlas_private.forum_posts(kind, status, created_at desc);
create table if not exists pokeatlas_private.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references pokeatlas_private.forum_posts(id) on delete cascade,
  author_id uuid not null references pokeatlas_private.accounts(id) on delete restrict,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now()
);
create index if not exists pokeatlas_forum_replies on pokeatlas_private.forum_comments(post_id,status,created_at,id);
create table if not exists pokeatlas_private.forum_audit (
  id bigint generated always as identity primary key,
  post_id uuid not null references pokeatlas_private.forum_posts(id) on delete restrict,
  actor_id uuid not null references pokeatlas_private.accounts(id) on delete restrict,
  action text not null,
  previous_data jsonb not null,
  created_at timestamptz not null default now()
);
alter table pokeatlas_private.forum_admins enable row level security;
alter table pokeatlas_private.forum_posts enable row level security;
alter table pokeatlas_private.forum_comments enable row level security;
alter table pokeatlas_private.forum_audit enable row level security;
revoke all on pokeatlas_private.forum_admins, pokeatlas_private.forum_posts, pokeatlas_private.forum_comments, pokeatlas_private.forum_audit from public, anon, authenticated;

create or replace function pokeatlas_private.forum_is_admin(p_account uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_account is not null and exists(select 1 from pokeatlas_private.forum_admins where account_id = p_account);
$$;
create or replace function pokeatlas_private.forum_post_json(p_id uuid, p_full boolean default false)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'title', p.title, 'body', case when p_full then p.body else null end,
    'excerpt', left(p.body,240), 'kind', p.kind, 'source_url', p.source_url,
    'status', p.status, 'pinned', p.pinned, 'locked', p.locked,
    'created_at', p.created_at, 'updated_at', p.updated_at,
    'author', jsonb_build_object('nickname', a.nickname, 'avatar_url', a.avatar_url),
    'comment_count', (select count(*) from pokeatlas_private.forum_comments c where c.post_id = p.id and c.status = 'published')
  ) from pokeatlas_private.forum_posts p join pokeatlas_private.accounts a on a.id = p.author_id where p.id = p_id;
$$;
create or replace function pokeatlas_private.forum_comment_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'body', c.body, 'status', c.status, 'created_at', c.created_at,
    'author', jsonb_build_object('nickname', a.nickname, 'avatar_url', a.avatar_url))
  from pokeatlas_private.forum_comments c join pokeatlas_private.accounts a on a.id = c.author_id where c.id = p_id;
$$;
revoke all on function pokeatlas_private.forum_is_admin(uuid) from public,anon,authenticated;
revoke all on function pokeatlas_private.forum_post_json(uuid,boolean) from public,anon,authenticated;
revoke all on function pokeatlas_private.forum_comment_json(uuid) from public,anon,authenticated;

create or replace function public.pokeatlas_forum_list(p_kind text default 'all', p_search text default '', p_offset integer default 0, p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_posts jsonb; v_total bigint;
begin
  if p_kind is null or p_kind not in ('all','post','news') or p_search is null or char_length(p_search)>100
    or p_offset is null or p_offset<0 or p_offset>100000 or p_limit is null or p_limit not between 1 and 50
    then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
  select count(*) into v_total from pokeatlas_private.forum_posts p
  where p.status='published' and (p_kind='all' or p.kind=p_kind)
    and (btrim(p_search)='' or p.title ilike '%'||btrim(p_search)||'%' or p.body ilike '%'||btrim(p_search)||'%');
  select jsonb_agg(pokeatlas_private.forum_post_json(q.id,false) order by q.pinned desc,q.created_at desc,q.id desc)
  into v_posts from (
    select p.id,p.pinned,p.created_at from pokeatlas_private.forum_posts p
    where p.status='published' and (p_kind='all' or p.kind=p_kind)
      and (btrim(p_search)='' or p.title ilike '%'||btrim(p_search)||'%' or p.body ilike '%'||btrim(p_search)||'%')
    order by p.pinned desc,p.created_at desc,p.id desc offset p_offset limit p_limit
  ) q;
  return jsonb_build_object('ok',true,'posts',coalesce(v_posts,'[]'::jsonb),'total',v_total);
end;
$$;
create or replace function public.pokeatlas_forum_post(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from pokeatlas_private.forum_posts where id=p_id and status='published')
    then return jsonb_build_object('ok',false,'code','not_found'); end if;
  return jsonb_build_object('ok',true,'post',pokeatlas_private.forum_post_json(p_id,true));
end;
$$;
create or replace function public.pokeatlas_forum_comments(p_id uuid,p_offset integer default 0,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_comments jsonb; v_total bigint;
begin
  if p_offset is null or p_offset<0 or p_offset>100000 or p_limit is null or p_limit not between 1 and 50
    then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
  if not exists(select 1 from pokeatlas_private.forum_posts where id=p_id and status='published')
    then return jsonb_build_object('ok',false,'code','not_found'); end if;
  select count(*) into v_total from pokeatlas_private.forum_comments where post_id=p_id and status='published';
  select jsonb_agg(pokeatlas_private.forum_comment_json(q.id) order by q.created_at,q.id) into v_comments from (
    select id,created_at from pokeatlas_private.forum_comments where post_id=p_id and status='published'
    order by created_at,id offset p_offset limit p_limit
  ) q;
  return jsonb_build_object('ok',true,'comments',coalesce(v_comments,'[]'::jsonb),'total',v_total);
end;
$$;
create or replace function public.pokeatlas_forum_access(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_account uuid := pokeatlas_private.session_account(p_token);
begin
  if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
  return jsonb_build_object('ok',true,'is_admin',pokeatlas_private.forum_is_admin(v_account));
end;
$$;
create or replace function public.pokeatlas_forum_create(p_token text,p_title text,p_body text,p_kind text default 'post',p_source_url text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account uuid := pokeatlas_private.session_account(p_token); v_id uuid;
begin
  if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
  if p_kind is null or p_kind not in ('post','news') or p_title is null or char_length(btrim(p_title)) not between 4 and 140
    or p_body is null or char_length(btrim(p_body)) not between 10 and 20000
    or (p_source_url is not null and (char_length(p_source_url)>2048 or p_source_url !~ '^https?://[^[:space:]]+$'))
    then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
  if p_kind='news' and not pokeatlas_private.forum_is_admin(v_account)
    then return jsonb_build_object('ok',false,'code','forbidden'); end if;
  if not pokeatlas_private.allow_attempt('forum-post:'||v_account::text,5)
    then return jsonb_build_object('ok',false,'code','rate_limited'); end if;
  insert into pokeatlas_private.forum_posts(author_id,title,body,kind,source_url)
  values(v_account,btrim(p_title),btrim(p_body),p_kind,p_source_url) returning id into v_id;
  return jsonb_build_object('ok',true,'post',pokeatlas_private.forum_post_json(v_id,true));
end;
$$;
create or replace function public.pokeatlas_forum_reply(p_token text,p_id uuid,p_body text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account uuid := pokeatlas_private.session_account(p_token); v_locked boolean; v_id uuid;
begin
  if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 5000
    then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
  select locked into v_locked from pokeatlas_private.forum_posts where id=p_id and status='published' for update;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  if v_locked and not pokeatlas_private.forum_is_admin(v_account)
    then return jsonb_build_object('ok',false,'code','locked'); end if;
  if not pokeatlas_private.allow_attempt('forum-reply:'||v_account::text,20)
    then return jsonb_build_object('ok',false,'code','rate_limited'); end if;
  insert into pokeatlas_private.forum_comments(post_id,author_id,body) values(p_id,v_account,btrim(p_body)) returning id into v_id;
  return jsonb_build_object('ok',true,'comment',pokeatlas_private.forum_comment_json(v_id));
end;
$$;
create or replace function public.pokeatlas_forum_admin_post(p_token text,p_id uuid,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_account uuid := pokeatlas_private.session_account(p_token); v_post jsonb; v_comments jsonb;
begin
  if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
  if not pokeatlas_private.forum_is_admin(v_account) then return jsonb_build_object('ok',false,'code','forbidden'); end if;
  if p_offset is null or p_offset<0 or p_offset>100000 then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
  v_post := pokeatlas_private.forum_post_json(p_id,true);
  if v_post is null then return jsonb_build_object('ok',false,'code','not_found'); end if;
  select jsonb_agg(pokeatlas_private.forum_comment_json(q.id) order by q.created_at,q.id) into v_comments from (
    select id,created_at from pokeatlas_private.forum_comments where post_id=p_id order by created_at,id offset p_offset limit 20
  ) q;
  return jsonb_build_object('ok',true,'post',v_post,'comments',coalesce(v_comments,'[]'::jsonb),
    'total',(select count(*) from pokeatlas_private.forum_comments where post_id=p_id));
end;
$$;
create or replace function public.pokeatlas_forum_admin_save(
  p_token text,p_id uuid,p_title text,p_body text,p_kind text,p_source_url text,p_published boolean,p_pinned boolean,p_locked boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account uuid := pokeatlas_private.session_account(p_token); v_old pokeatlas_private.forum_posts%rowtype;
begin
  if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
  if not pokeatlas_private.forum_is_admin(v_account) then return jsonb_build_object('ok',false,'code','forbidden'); end if;
  if p_title is null or char_length(btrim(p_title)) not between 4 and 140 or p_body is null or char_length(btrim(p_body)) not between 10 and 20000
    or p_kind is null or p_kind not in ('post','news') or p_published is null or p_pinned is null or p_locked is null
    or (p_source_url is not null and (char_length(p_source_url)>2048 or p_source_url !~ '^https?://[^[:space:]]+$'))
    then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
  select * into v_old from pokeatlas_private.forum_posts where id=p_id for update;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  insert into pokeatlas_private.forum_audit(post_id,actor_id,action,previous_data)
  values(p_id,v_account,'edit_post',to_jsonb(v_old));
  update pokeatlas_private.forum_posts set title=btrim(p_title),body=btrim(p_body),kind=p_kind,source_url=p_source_url,
    status=case when p_published then 'published' else 'hidden' end,pinned=p_pinned,locked=p_locked,updated_at=now()
  where id=p_id;
  return jsonb_build_object('ok',true,'post',pokeatlas_private.forum_post_json(p_id,true));
end;
$$;
create or replace function public.pokeatlas_forum_admin_comment(p_token text,p_id uuid,p_comment uuid,p_visible boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_account uuid := pokeatlas_private.session_account(p_token); v_old pokeatlas_private.forum_comments%rowtype;
begin
  if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
  if not pokeatlas_private.forum_is_admin(v_account) then return jsonb_build_object('ok',false,'code','forbidden'); end if;
  if p_visible is null then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
  select * into v_old from pokeatlas_private.forum_comments where id=p_comment and post_id=p_id for update;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  insert into pokeatlas_private.forum_audit(post_id,actor_id,action,previous_data)
  values(p_id,v_account,'moderate_comment',to_jsonb(v_old));
  update pokeatlas_private.forum_comments set status=case when p_visible then 'published' else 'hidden' end where id=p_comment;
  return jsonb_build_object('ok',true);
end;
$$;

revoke all on function public.pokeatlas_forum_list(text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.pokeatlas_forum_post(uuid) from public,anon,authenticated;
revoke all on function public.pokeatlas_forum_comments(uuid,integer,integer) from public,anon,authenticated;
revoke all on function public.pokeatlas_forum_access(text) from public,anon,authenticated;
revoke all on function public.pokeatlas_forum_create(text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.pokeatlas_forum_reply(text,uuid,text) from public,anon,authenticated;
revoke all on function public.pokeatlas_forum_admin_post(text,uuid,integer) from public,anon,authenticated;
revoke all on function public.pokeatlas_forum_admin_save(text,uuid,text,text,text,text,boolean,boolean,boolean) from public,anon,authenticated;
revoke all on function public.pokeatlas_forum_admin_comment(text,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.pokeatlas_forum_list(text,text,integer,integer), public.pokeatlas_forum_post(uuid), public.pokeatlas_forum_comments(uuid,integer,integer) to anon,authenticated;
grant execute on function public.pokeatlas_forum_access(text), public.pokeatlas_forum_create(text,text,text,text,text), public.pokeatlas_forum_reply(text,uuid,text),
  public.pokeatlas_forum_admin_post(text,uuid,integer), public.pokeatlas_forum_admin_save(text,uuid,text,text,text,text,boolean,boolean,boolean),
  public.pokeatlas_forum_admin_comment(text,uuid,uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
