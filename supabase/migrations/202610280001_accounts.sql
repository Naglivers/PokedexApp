-- Login com nickname/senha; e-mail e foto opcionais. Execute inteiro no SQL Editor.
-- As tabelas ficam fora da Data API. Somente as RPCs abaixo podem acessá-las.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists pokeatlas_private;
revoke all on schema pokeatlas_private from public, anon, authenticated;

create table if not exists pokeatlas_private.accounts (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (nickname ~ '^[A-Za-z0-9_]{3,20}$'),
  password_hash text not null,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists pokeatlas_account_nickname on pokeatlas_private.accounts (lower(nickname));
create table if not exists pokeatlas_private.sessions (
  token_hash text primary key,
  account_id uuid not null references pokeatlas_private.accounts(id) on delete cascade,
  device_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
create index if not exists pokeatlas_session_account on pokeatlas_private.sessions(account_id);
create table if not exists pokeatlas_private.attempts (
  key text primary key,
  count integer not null,
  since timestamptz not null default now()
);
alter table pokeatlas_private.accounts enable row level security;
alter table pokeatlas_private.sessions enable row level security;
alter table pokeatlas_private.attempts enable row level security;
revoke all on all tables in schema pokeatlas_private from public, anon, authenticated;

create or replace function pokeatlas_private.allow_attempt(p_key text, p_limit integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare attempts integer;
begin
  insert into pokeatlas_private.attempts as t(key, count) values (p_key, 1)
  on conflict (key) do update set
    count = case when t.since < now() - interval '15 minutes' then 1 else t.count + 1 end,
    since = case when t.since < now() - interval '15 minutes' then now() else t.since end
  returning count into attempts;
  return attempts <= p_limit;
end;
$$;

create or replace function pokeatlas_private.profile_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', id, 'nickname', nickname, 'email', email, 'avatar_url', avatar_url)
  from pokeatlas_private.accounts where id = p_id;
$$;

create or replace function pokeatlas_private.session_account(p_token text)
returns uuid language sql stable security definer set search_path = '' as $$
  select account_id from pokeatlas_private.sessions
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and device_id = auth.uid() and expires_at > now();
$$;

create or replace function public.pokeatlas_account_auth(
  p_nickname text, p_password text, p_register boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  account pokeatlas_private.accounts%rowtype;
  name text := btrim(p_nickname);
  token text;
  expiry timestamptz := now() + interval '30 days';
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if name is null or name !~ '^[A-Za-z0-9_]{3,20}$'
     or p_password is null or length(p_password) < 6 or octet_length(p_password) > 72 then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;
  -- Return errors as JSON so failed-attempt counters COMMIT, instead of rolling back.
  if not pokeatlas_private.allow_attempt('device:' || auth.uid()::text, 20) then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
  end if;
  if not pokeatlas_private.allow_attempt('name:' || lower(name), 30) then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
  end if;
  if p_register is true then
    begin
      insert into pokeatlas_private.accounts(nickname, password_hash)
      values (name, extensions.crypt(p_password, extensions.gen_salt('bf', 10)))
      returning * into account;
    exception when unique_violation then
      return jsonb_build_object('ok', false, 'code', 'nickname_taken');
    end;
  else
    select * into account from pokeatlas_private.accounts where lower(nickname) = lower(name);
    if account.id is null then
      -- Same bcrypt cost for unknown and known nicknames.
      perform extensions.crypt(p_password, extensions.gen_salt('bf', 10));
      return jsonb_build_object('ok', false, 'code', 'invalid_credentials');
    end if;
    if extensions.crypt(p_password, account.password_hash) <> account.password_hash then
      return jsonb_build_object('ok', false, 'code', 'invalid_credentials');
    end if;
  end if;
  token := encode(extensions.gen_random_bytes(32), 'hex');
  delete from pokeatlas_private.sessions where account_id = account.id
    and (expires_at <= now() or device_id = auth.uid());
  insert into pokeatlas_private.sessions(token_hash, account_id, device_id, expires_at)
    values (encode(extensions.digest(token, 'sha256'), 'hex'), account.id, auth.uid(), expiry);
  return jsonb_build_object('ok', true, 'session', jsonb_build_object(
    'token', token, 'expires_at', expiry, 'user', pokeatlas_private.profile_json(account.id)));
end;
$$;

create or replace function public.pokeatlas_account_profile(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account_id uuid := pokeatlas_private.session_account(p_token);
begin
  if account_id is null then return jsonb_build_object('ok', false, 'code', 'session_expired'); end if;
  return jsonb_build_object('ok', true, 'user', pokeatlas_private.profile_json(account_id));
end;
$$;

create or replace function public.pokeatlas_account_save(
  p_token text, p_email text default null, p_avatar_url text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := pokeatlas_private.session_account(p_token);
  email_value text := nullif(btrim(p_email), '');
begin
  if account_id is null then return jsonb_build_object('ok', false, 'code', 'session_expired'); end if;
  if email_value is not null and (length(email_value) > 254 or email_value !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then
    return jsonb_build_object('ok', false, 'code', 'invalid_email');
  end if;
  -- Small private avatar, stored in Postgres with the profile; no public bucket.
  if p_avatar_url is not null and (length(p_avatar_url) > 700000
     or p_avatar_url !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$') then
    return jsonb_build_object('ok', false, 'code', 'invalid_photo');
  end if;
  update pokeatlas_private.accounts set email = email_value, avatar_url = p_avatar_url, updated_at = now()
    where id = account_id;
  return jsonb_build_object('ok', true, 'user', pokeatlas_private.profile_json(account_id));
end;
$$;

create or replace function public.pokeatlas_account_logout(p_token text)
returns void language sql security definer set search_path = '' as $$
  delete from pokeatlas_private.sessions
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and device_id = auth.uid();
$$;

revoke all on all functions in schema pokeatlas_private from public, anon, authenticated;
revoke all on function public.pokeatlas_account_auth(text, text, boolean) from public, anon, authenticated;
revoke all on function public.pokeatlas_account_profile(text) from public, anon, authenticated;
revoke all on function public.pokeatlas_account_save(text, text, text) from public, anon, authenticated;
revoke all on function public.pokeatlas_account_logout(text) from public, anon, authenticated;
grant execute on function public.pokeatlas_account_auth(text, text, boolean) to authenticated;
grant execute on function public.pokeatlas_account_profile(text) to authenticated;
grant execute on function public.pokeatlas_account_save(text, text, text) to authenticated;
grant execute on function public.pokeatlas_account_logout(text) to authenticated;
notify pgrst, 'reload schema';
commit;

