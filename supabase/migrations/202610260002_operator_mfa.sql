-- Apply after all earlier migrations. Enforces MFA immediately; read docs/MFA-ROLLOUT.md first.
begin;
create table timber.operator_factors(user_id uuid primary key, factor_id uuid not null);
alter table timber.operator_factors enable row level security;
revoke all on timber.operator_factors from public,anon,authenticated;
create table timber.mfa_leases (
 session_id uuid primary key, user_id uuid not null, expires_at timestamptz not null,
 proof_at bigint not null default 0, verified_at timestamptz not null default now()
);
create table timber.mfa_intents (
 id uuid primary key default gen_random_uuid(), session_id uuid not null, user_id uuid not null,
 scope text not null check(scope in ('unlock','inventory','security')), payload jsonb not null,
 baseline bigint not null, created_at timestamptz not null default now(), approved_until timestamptz
);
create table timber.mfa_proofs (session_id uuid not null, proof_at bigint not null, primary key(session_id,proof_at));
create table timber.mfa_events (id bigint generated always as identity primary key, user_id uuid, session_id uuid, event text not null, at timestamptz not null default now());
alter table timber.mfa_leases enable row level security;
alter table timber.mfa_intents enable row level security;
alter table timber.mfa_proofs enable row level security;
alter table timber.mfa_events enable row level security;
revoke all on timber.mfa_leases,timber.mfa_intents,timber.mfa_proofs,timber.mfa_events from public,anon,authenticated;

create function timber.mfa_session() returns uuid language plpgsql security definer set search_path='' as $$
declare sid uuid := (auth.jwt()->>'session_id')::uuid;
begin
 if not exists(select 1 from timber.profiles where id=auth.uid() and status='active' and role in ('Administrator','Inventory Custodian')) then raise exception 'Approved operator access required.'; end if;
 if sid is null or not exists(select 1 from auth.sessions s where s.id=sid and s.user_id=auth.uid()) then raise exception 'Sign in again.'; end if;
 return sid;
end $$;
create function timber.mfa_timestamp() returns bigint language sql stable set search_path='' as $$
 select coalesce(max((entry->>'timestamp')::bigint),0) from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]')) entry where entry->>'method'='totp'
$$;
create function public.operator_access(renew boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
declare sid uuid:=timber.mfa_session(); valid boolean;
begin
 valid := auth.jwt()->>'aal'='aal2' and exists(select 1 from auth.mfa_factors f join timber.operator_factors trusted on trusted.factor_id=f.id and trusted.user_id=f.user_id join auth.sessions sess on sess.factor_id=f.id where sess.id=sid and f.user_id=auth.uid() and f.status='verified' and f.factor_type='totp') and exists(select 1 from timber.mfa_leases l where l.session_id=sid and l.user_id=auth.uid() and l.expires_at>now() and l.verified_at>now()-interval '30 minutes');
 if valid and renew then update timber.mfa_leases set expires_at=least(now()+interval '3 minutes',verified_at+interval '30 minutes') where session_id=sid and expires_at>now(); valid:=found; end if;
 return coalesce(valid,false);
end $$;
create function public.operator_lock() returns void language plpgsql security definer set search_path='' as $$
declare sid uuid:=timber.mfa_session();
begin
 update timber.mfa_leases set expires_at=now() where session_id=sid;
 delete from timber.mfa_intents where session_id=sid;
 insert into timber.mfa_events(user_id,session_id,event) values(auth.uid(),sid,'locked');
end $$;
create function public.operator_begin(scope text, payload jsonb default '{}'::jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare sid uuid:=timber.mfa_session(); result uuid;
begin
 if scope not in ('unlock','inventory','security') or payload is null then raise exception 'Invalid verification request.'; end if;
 if scope<>'unlock' and not public.operator_access(false) then raise exception 'Unlock workspace first.'; end if;
 if scope='inventory' and payload->>'type' in ('purge-archive','purge-all-archives') and not exists(select 1 from timber.profiles where id=auth.uid() and role='Administrator') then raise exception 'Administrator required for permanent purging.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(sid::text,4));
 if (select count(*) from timber.mfa_intents where session_id=sid and created_at>now()-interval '1 minute')>=10 then raise exception 'Too many verification requests. Wait a minute.'; end if;
 delete from timber.mfa_intents where session_id=sid and created_at<now()-interval '10 minutes';
 insert into timber.mfa_intents(session_id,user_id,scope,payload,baseline) values(sid,auth.uid(),scope,payload,timber.mfa_timestamp()) returning id into result;
 return result;
end $$;
create function public.operator_complete(intent_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare sid uuid:=timber.mfa_session(); ticket timber.mfa_intents; proof bigint:=timber.mfa_timestamp(); verified_factor uuid; trusted_factor uuid;
begin
 select * into ticket from timber.mfa_intents where id=intent_id and session_id=sid and user_id=auth.uid() for update;
 if not found or ticket.created_at<now()-interval '5 minutes' or ticket.approved_until is not null then raise exception 'Verification expired. Start again.'; end if;
 if auth.jwt()->>'aal' is distinct from 'aal2' or proof<=ticket.baseline or proof<floor(extract(epoch from ticket.created_at)) or proof<extract(epoch from now()-interval '60 seconds') or proof>extract(epoch from now()+interval '5 seconds') then raise exception 'Enter a new authenticator code and verify again.'; end if;
 select f.id into verified_factor from auth.mfa_factors f join auth.sessions sess on sess.factor_id=f.id where sess.id=sid and f.user_id=auth.uid() and f.status='verified' and f.factor_type='totp';
 if verified_factor is null then raise exception 'Authenticator setup required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,5));
 select factor_id into trusted_factor from timber.operator_factors where user_id=auth.uid();
 if trusted_factor is not null and trusted_factor<>verified_factor then raise exception 'Authenticator changed. Contact the project owner for verified recovery.'; end if;
 insert into timber.operator_factors values(auth.uid(),verified_factor) on conflict do nothing;
 if found then insert into timber.mfa_events(user_id,session_id,event) values(auth.uid(),sid,'authenticator registered'); end if;
 insert into timber.mfa_proofs values(sid,proof) on conflict do nothing;
 if not found then raise exception 'Verification already used. Enter a new code.'; end if;
 if ticket.scope='unlock' then
  insert into timber.mfa_leases(session_id,user_id,expires_at,proof_at,verified_at) values(sid,auth.uid(),now()+interval '3 minutes',proof,now()) on conflict(session_id) do update set expires_at=excluded.expires_at,proof_at=excluded.proof_at,verified_at=excluded.verified_at;
  delete from timber.mfa_intents where id=intent_id;
 else
  update timber.mfa_intents set approved_until=now()+interval '60 seconds' where id=intent_id;
 end if;
 insert into timber.mfa_events(user_id,session_id,event) values(auth.uid(),sid,ticket.scope||' verified');
end $$;
create function timber.require_operator_mfa() returns void language plpgsql security definer set search_path='' as $$
begin if not public.operator_access(false) then raise exception 'MFA_REQUIRED: Unlock workspace to continue.'; end if; end $$;
create function timber.consume_mfa(scope_name text, action_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare ticket uuid;
begin
 select id into ticket from timber.mfa_intents where user_id=auth.uid() and session_id=(auth.jwt()->>'session_id')::uuid and scope=scope_name and payload=action_data and approved_until>now() order by created_at desc limit 1 for update;
 if ticket is null then raise exception 'Fresh authenticator verification required for this action.'; end if;
 delete from timber.mfa_intents where id=ticket;
end $$;
-- Move implementations into the private schema; wrappers are the only exposed entry points.
alter function public.inventory_snapshot() set schema timber;
alter function timber.inventory_snapshot() rename to inventory_snapshot_before_mfa;
alter function public.inventory_mutate(jsonb,uuid) rename to inventory_mutate_before_mfa;
alter function public.inventory_mutate_before_mfa(jsonb,uuid) set schema timber;

alter function public.security_snapshot() set schema timber;
alter function timber.security_snapshot() rename to security_snapshot_before_mfa;
alter function public.security_mutate(jsonb,uuid) set schema timber;
alter function timber.security_mutate(jsonb,uuid) rename to security_mutate_before_mfa;
-- Preserve the renamed wrapper's explicit PL/pgSQL parameter qualification.
do $$ begin
 execute replace(pg_get_functiondef('timber.inventory_mutate_before_mfa(jsonb,uuid)'::regprocedure), 'inventory_mutate.request_id', 'inventory_mutate_before_mfa.request_id');
end $$;
revoke all on function timber.inventory_snapshot_before_mfa(), timber.inventory_mutate_before_mfa(jsonb,uuid), timber.security_snapshot_before_mfa(), timber.security_mutate_before_mfa(jsonb,uuid) from public,anon,authenticated;
create function public.inventory_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$begin perform timber.require_operator_mfa(); return timber.inventory_snapshot_before_mfa(); end $$;
create function public.inventory_mutate(action jsonb, request_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare target_id text;
begin
 perform timber.require_operator_mfa();
 if action->>'type' in ('purge-archive','purge-all-archives') then
  if not exists(select 1 from timber.profiles where id=auth.uid() and role='Administrator') then raise exception 'Administrator required for permanent purging.'; end if;
  if action->>'type'='purge-archive' then
   if action->>'targetType'='staff' then
    perform 1 from timber.people where id=(action->>'id')::uuid and archived for update;
   else
    perform 1 from timber.items where id=coalesce(action->>'id',action->>'itemId')::uuid and archived for update;
   end if;
   if not found then raise exception 'Only archived records can be purged.'; end if;
  else
   if action->>'targetType' not in ('staff','equipment') or jsonb_typeof(action->'targets') is distinct from 'array' or jsonb_array_length(action->'targets')=0 then raise exception 'Choose an exact set of archived records.'; end if;
   perform timber.consume_mfa('inventory',action);
   for target_id in select jsonb_array_elements_text(action->'targets') loop
    if action->>'targetType'='staff' then
     perform 1 from timber.people where id=target_id::uuid and archived for update;
    else
     perform 1 from timber.items where id=target_id::uuid and archived for update;
    end if;
    if not found then raise exception 'An approved record is no longer archived. Review and verify again.'; end if;
    perform timber.inventory_mutate_before_mfa(jsonb_build_object('type','purge-archive','targetType',action->>'targetType','id',target_id),gen_random_uuid());
   end loop;
   return;
  end if;
 end if;
 if action->>'type' in ('purge-archive','purge-all-archives','membership','delete-profile','self-delete') then perform timber.consume_mfa('inventory',action); end if;
 perform timber.inventory_mutate_before_mfa(action,request_id);
end $$;
create function public.security_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$begin perform timber.require_operator_mfa(); return timber.security_snapshot_before_mfa(); end $$;
create function public.security_mutate(action jsonb, request_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform timber.require_operator_mfa();
 if action->>'type'='update-policy' and action->'patch'->>'requireAdminMFA'='false' then raise exception 'Authenticator verification is mandatory for operators.'; end if;
 if action->>'type'<>'register-session' then perform timber.consume_mfa('security',action); end if;
 perform timber.security_mutate_before_mfa(action,request_id);
end $$;
revoke all on function timber.mfa_session(), timber.mfa_timestamp(), timber.require_operator_mfa(), timber.consume_mfa(text,jsonb) from public,anon,authenticated;
revoke all on function public.operator_access(boolean),public.operator_lock(),public.operator_begin(text,jsonb),public.operator_complete(uuid),public.inventory_snapshot(),public.inventory_mutate(jsonb,uuid),public.security_snapshot(),public.security_mutate(jsonb,uuid) from public,anon;
grant execute on function public.operator_access(boolean),public.operator_lock(),public.operator_begin(text,jsonb),public.operator_complete(uuid),public.inventory_snapshot(),public.inventory_mutate(jsonb,uuid),public.security_snapshot(),public.security_mutate(jsonb,uuid) to authenticated;
commit;
