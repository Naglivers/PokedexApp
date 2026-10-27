-- Execute após 202610280010_forum.sql.
begin;
alter table pokeatlas_private.forum_posts add column if not exists import_key text;
alter table pokeatlas_private.forum_posts add column if not exists import_source text;
alter table pokeatlas_private.forum_posts add column if not exists source_published_at timestamptz;
create unique index if not exists pokeatlas_forum_import_key on pokeatlas_private.forum_posts(import_key);
create table if not exists pokeatlas_private.forum_news_settings (
  slot integer primary key default 1 check (slot=1),
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table pokeatlas_private.forum_news_settings enable row level security;
revoke all on pokeatlas_private.forum_news_settings from public, anon, authenticated;

create or replace function pokeatlas_private.forum_post_json(p_id uuid, p_full boolean default false)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'title', p.title, 'body', case when p_full then p.body else null end,
    'excerpt', left(p.body,240), 'kind', p.kind, 'source_url', p.source_url,
    'status', p.status, 'pinned', p.pinned, 'locked', p.locked,
    'imported', p.import_key is not null, 'source_name', p.import_source, 'source_published_at', p.source_published_at,
    'created_at', p.created_at, 'updated_at', p.updated_at,
    'author', jsonb_build_object('nickname', a.nickname, 'avatar_url', a.avatar_url),
    'comment_count', (select count(*) from pokeatlas_private.forum_comments c where c.post_id = p.id and c.status = 'published')
  ) from pokeatlas_private.forum_posts p join pokeatlas_private.accounts a on a.id = p.author_id where p.id = p_id;
$$;

create or replace function public.pokeatlas_forum_import_news(p_import_token text,p_entries jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid;
  v_enabled boolean;
  v_entry jsonb;
  v_date timestamptz;
  v_count integer;
begin
  if p_import_token is null or p_import_token !~ '^[a-f0-9]{64}$'
    then return jsonb_build_object('ok',false,'code','forbidden'); end if;
  select enabled into v_enabled from pokeatlas_private.forum_news_settings
    where slot=1 and token_hash=encode(extensions.digest(p_import_token,'sha256'),'hex');
  if not found then return jsonb_build_object('ok',false,'code','forbidden'); end if;
  if not v_enabled then return jsonb_build_object('ok',true,'disabled',true,'imported',0); end if;
  select account_id into v_admin from pokeatlas_private.forum_admins where slot=1;
  if v_admin is null then return jsonb_build_object('ok',false,'code','setup'); end if;
  if p_entries is null or jsonb_typeof(p_entries)<>'array' then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
  if jsonb_array_length(p_entries)>20 or pg_column_size(p_entries)>40000
    then return jsonb_build_object('ok',false,'code','invalid_input'); end if;

  -- Valida o lote inteiro antes de gravar qualquer linha.
  for v_entry in select value from jsonb_array_elements(p_entries) loop
    if jsonb_typeof(v_entry)<>'object'
      or jsonb_typeof(v_entry->'title') is distinct from 'string'
      or jsonb_typeof(v_entry->'summary') is distinct from 'string'
      or jsonb_typeof(v_entry->'url') is distinct from 'string'
      or jsonb_typeof(v_entry->'published_at') is distinct from 'string'
      or char_length(btrim(v_entry->>'title')) not between 4 and 140
      or (v_entry->>'title') !~* '(pok[eé]mon|pok[eé]dex|pokopia|tcg pocket)'
      or char_length(btrim(v_entry->>'summary')) not between 10 and 320
      or char_length(v_entry->>'url')>2048
      or (v_entry->>'url') !~ '^https://www[.]nintendolife[.]com/news/[0-9]{4}/[0-9]{2}/[a-zA-Z0-9_-]+$'
      then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
    begin
      v_date := (v_entry->>'published_at')::timestamptz;
    exception when invalid_datetime_format or datetime_field_overflow then
      return jsonb_build_object('ok',false,'code','invalid_input');
    end;
    if v_date < now()-interval '30 days' or v_date > now()+interval '1 hour'
      then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
  end loop;
  if not pokeatlas_private.allow_attempt('forum-news-import',8)
    then return jsonb_build_object('ok',false,'code','rate_limited'); end if;

  with inserted as (
    insert into pokeatlas_private.forum_posts(
      author_id,title,body,kind,source_url,status,import_key,import_source,source_published_at,created_at,updated_at
    )
    select v_admin,btrim(e->>'title'),
      btrim(e->>'summary') || E'\n\nFonte: Nintendo Life. Leia a matéria completa no link da fonte.',
      'news',e->>'url','published',
      encode(extensions.digest('nintendolife:'||(e->>'url'),'sha256'),'hex'),
      'Nintendo Life',(e->>'published_at')::timestamptz,(e->>'published_at')::timestamptz,(e->>'published_at')::timestamptz
    from jsonb_array_elements(p_entries) entries(e)
    on conflict(import_key) do nothing
    returning id
  ) select count(*)::integer into v_count from inserted;
  return jsonb_build_object('ok',true,'disabled',false,'imported',v_count);
end;
$$;
revoke all on function pokeatlas_private.forum_post_json(uuid,boolean) from public,anon,authenticated;
revoke all on function public.pokeatlas_forum_import_news(text,jsonb) from public,anon,authenticated;
grant execute on function public.pokeatlas_forum_import_news(text,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;

-- Resultado final: copie a chave UMA VEZ para o Secret SUPABASE_NEWS_IMPORT_TOKEN.
-- Ela não é armazenada em texto aberto. Reexecutar não troca a chave existente.
with generated as materialized (
  select encode(extensions.gen_random_bytes(32),'hex') as token
  where not exists(select 1 from pokeatlas_private.forum_news_settings where slot=1)
), inserted as (
  insert into pokeatlas_private.forum_news_settings(slot,token_hash)
  select 1,encode(extensions.digest(token,'sha256'),'hex') from generated
  on conflict(slot) do nothing
  returning slot
)
select token as "SUPABASE_NEWS_IMPORT_TOKEN"
from generated where exists(select 1 from inserted);
