-- Server-only token vault. Apply once; browser roles have no access.
begin;
create table timber.bff_sessions (
 id_hash text primary key, ciphertext text not null, expires_at timestamptz not null,
 lock_id uuid, locked_until timestamptz, created_at timestamptz not null default now()
);
alter table timber.bff_sessions enable row level security;
revoke all on timber.bff_sessions from public,anon,authenticated;
create function public.bff_create(id_hash text,ciphertext text,expires_at timestamptz) returns void language sql security definer set search_path='' as $$
 insert into timber.bff_sessions(id_hash,ciphertext,expires_at) values(id_hash,ciphertext,expires_at);
$$;
create function public.bff_acquire(session_hash text,owner_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare entry timber.bff_sessions;
begin
 update timber.bff_sessions s set lock_id=owner_id,locked_until=now()+interval '90 seconds'
 where s.id_hash=session_hash and s.expires_at>now() and (s.locked_until is null or s.locked_until<now()) returning * into entry;
 if not found then return null; end if;
 return jsonb_build_object('ciphertext',entry.ciphertext,'expires_at',entry.expires_at);
end $$;
create function public.bff_commit(session_hash text,owner_id uuid,encrypted_value text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update timber.bff_sessions s set ciphertext=encrypted_value,lock_id=null,locked_until=null where s.id_hash=session_hash and s.lock_id=owner_id and s.locked_until>now() and s.expires_at>now();
 return found;
end $$;
create function public.bff_delete(session_hash text) returns void language sql security definer set search_path='' as $$delete from timber.bff_sessions s where s.id_hash=session_hash;$$;
revoke all on function public.bff_create(text,text,timestamptz),public.bff_acquire(text,uuid),public.bff_commit(text,uuid,text),public.bff_delete(text) from public,anon,authenticated;
grant execute on function public.bff_create(text,text,timestamptz),public.bff_acquire(text,uuid),public.bff_commit(text,uuid,text),public.bff_delete(text) to service_role;
commit;
