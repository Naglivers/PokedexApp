-- Execute after 202610280001_accounts.sql. Saves are private to each account.
begin;
create table if not exists pokeatlas_private.save_boxes (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references pokeatlas_private.accounts(id) on delete cascade,
 file_hash text not null check(file_hash ~ '^[a-f0-9]{64}$'),
 source_key text not null check(source_key ~ '^[a-f0-9]{64}$'),
 game text not null, trainer_name text not null, metadata jsonb not null,
 pokemon_count integer not null, shiny_count integer not null,
 imported_at timestamptz not null default now(),
 unique(account_id,file_hash)
);
create table if not exists pokeatlas_private.save_box_pokemon (
 save_id uuid not null references pokeatlas_private.save_boxes(id) on delete cascade,
 location text not null check(location in ('party','box')),
 box_index integer not null, slot_index integer not null,
 species integer not null check(species between 1 and 20000), data jsonb not null,
 primary key(save_id,location,box_index,slot_index)
);
create index if not exists pokeatlas_save_boxes_owner on pokeatlas_private.save_boxes(account_id,imported_at desc);
alter table pokeatlas_private.save_boxes enable row level security;
alter table pokeatlas_private.save_box_pokemon enable row level security;
revoke all on pokeatlas_private.save_boxes,pokeatlas_private.save_box_pokemon from public,anon,authenticated;

create or replace function public.pokeatlas_save_boxes_list(p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_account uuid:=pokeatlas_private.session_account(p_token);
begin
 if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
 return jsonb_build_object('ok',true,'saves',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'game',s.game,'trainer_name',s.trainer_name,'pokemon_count',s.pokemon_count,'shiny_count',s.shiny_count,'source_key',s.source_key,'imported_at',s.imported_at) order by s.imported_at desc,s.id) from pokeatlas_private.save_boxes s where s.account_id=v_account),'[]'::jsonb));
end;
$$;
create or replace function public.pokeatlas_save_boxes_get(p_token text,p_save_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_account uuid:=pokeatlas_private.session_account(p_token); v_save pokeatlas_private.save_boxes;
begin
 if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
 select * into v_save from pokeatlas_private.save_boxes where id=p_save_id and account_id=v_account;
 if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
 return jsonb_build_object('ok',true,'snapshot',v_save.metadata||jsonb_build_object('pokemon',coalesce((select jsonb_agg(p.data order by p.location desc,p.box_index,p.slot_index) from pokeatlas_private.save_box_pokemon p where p.save_id=v_save.id),'[]'::jsonb)));
end;
$$;
create or replace function public.pokeatlas_save_boxes_import(p_token text,p_snapshot jsonb,p_replace_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_account uuid:=pokeatlas_private.session_account(p_token); v_id uuid; v_existing uuid;
 v_entry jsonb; v_box integer; v_slot integer; v_species integer; v_count integer; v_shiny integer;
 v_boxes integer; v_slots integer; v_source text;
begin
 if v_account is null then return jsonb_build_object('ok',false,'code','session_expired'); end if;
 if p_snapshot is null or jsonb_typeof(p_snapshot)<>'object' or pg_column_size(p_snapshot)>16777216
 or p_snapshot->>'schemaVersion' is distinct from '1'
 or coalesce(p_snapshot->>'fileHash','') !~ '^[a-f0-9]{64}$'
 or coalesce(p_snapshot->>'sourceKey','') !~ '^[a-f0-9]{64}$'
 or jsonb_typeof(p_snapshot->'pokemon') is distinct from 'array'
 or jsonb_typeof(p_snapshot->'boxNames') is distinct from 'array'
 or coalesce(length(p_snapshot->>'game'),0) not between 1 and 60
 or coalesce(length(p_snapshot->>'trainerName'),101)>100 then
  return jsonb_build_object('ok',false,'code','invalid_input');
 end if;
 v_boxes:=(p_snapshot->>'boxCount')::integer; v_slots:=(p_snapshot->>'slotsPerBox')::integer;
 v_count:=jsonb_array_length(p_snapshot->'pokemon');
 if v_boxes is null or v_boxes not between 0 and 1024 or v_slots is null or v_slots not between 1 and 128
 or v_count>20000 or jsonb_array_length(p_snapshot->'boxNames')<>v_boxes then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
 -- Serialize imports per account, including concurrent duplicate uploads.
 perform pg_advisory_xact_lock(hashtextextended(v_account::text,0));
 if p_replace_id is not null then
  select source_key into v_source from pokeatlas_private.save_boxes where id=p_replace_id and account_id=v_account for update;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  if v_source<>p_snapshot->>'sourceKey' then return jsonb_build_object('ok',false,'code','different_save'); end if;
 end if;
 select id into v_existing from pokeatlas_private.save_boxes where account_id=v_account and file_hash=p_snapshot->>'fileHash';
 if found then return jsonb_build_object('ok',true,'id',v_existing,'reused',true); end if;
 -- Validate all positions and payload sizes before updating an existing snapshot.
 for v_entry in select value from jsonb_array_elements(p_snapshot->'pokemon') loop
  v_slot:=(v_entry->>'slotIndex')::integer; v_box:=coalesce((v_entry->>'boxIndex')::integer,-1); v_species:=(v_entry->>'species')::integer;
  if jsonb_typeof(v_entry)<>'object' or v_species is null or v_species not between 1 and 20000
  or v_slot is null or coalesce(v_entry->>'location','') not in ('party','box')
  or (v_entry->>'location'='party' and (v_box<>-1 or v_slot not between 0 and 5))
  or (v_entry->>'location'='box' and (v_box<0 or v_box>=v_boxes or v_slot<0 or v_slot>=v_slots))
  or coalesce(length(v_entry->>'rawData'),0) not between 4 and 32768
  or (v_entry->>'rawData') !~ '^[A-Za-z0-9+/]+={0,2}$'
  or jsonb_typeof(v_entry->'isShiny') is distinct from 'boolean'
  or pg_column_size(v_entry)>50000 then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_snapshot->'pokemon') e group by e->>'location',e->>'boxIndex',e->>'slotIndex' having count(*)>1) then return jsonb_build_object('ok',false,'code','invalid_input'); end if;
 select count(*) into v_shiny from jsonb_array_elements(p_snapshot->'pokemon') e where e->>'isShiny'='true';
 if p_replace_id is null then
  insert into pokeatlas_private.save_boxes(account_id,file_hash,source_key,game,trainer_name,metadata,pokemon_count,shiny_count)
  values(v_account,p_snapshot->>'fileHash',p_snapshot->>'sourceKey',p_snapshot->>'game',p_snapshot->>'trainerName',p_snapshot-'pokemon',v_count,v_shiny) returning id into v_id;
 else
  v_id:=p_replace_id;
  update pokeatlas_private.save_boxes set file_hash=p_snapshot->>'fileHash',metadata=p_snapshot-'pokemon',pokemon_count=v_count,shiny_count=v_shiny,imported_at=now() where id=v_id and account_id=v_account;
  delete from pokeatlas_private.save_box_pokemon where save_id=v_id;
 end if;
 insert into pokeatlas_private.save_box_pokemon(save_id,location,box_index,slot_index,species,data)
 select v_id,e->>'location',coalesce((e->>'boxIndex')::integer,-1),(e->>'slotIndex')::integer,(e->>'species')::integer,e from jsonb_array_elements(p_snapshot->'pokemon') e;
 return jsonb_build_object('ok',true,'id',v_id,'reused',false);
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation then
 return jsonb_build_object('ok',false,'code','invalid_input');
end;
$$;
revoke all on function public.pokeatlas_save_boxes_list(text),public.pokeatlas_save_boxes_get(text,uuid),public.pokeatlas_save_boxes_import(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.pokeatlas_save_boxes_list(text),public.pokeatlas_save_boxes_get(text,uuid),public.pokeatlas_save_boxes_import(text,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
