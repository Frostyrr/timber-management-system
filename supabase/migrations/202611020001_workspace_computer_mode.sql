-- Apply before deploying the shared-computer controls.
begin;
alter table timber.mfa_leases add column shared_computer boolean not null default true;
create or replace function public.operator_access(renew boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
declare sid uuid:=timber.mfa_session(); valid boolean;
begin
 valid := auth.jwt()->>'aal'='aal2' and exists(select 1 from auth.mfa_factors f join timber.operator_factors trusted on trusted.factor_id=f.id and trusted.user_id=f.user_id join auth.sessions sess on sess.factor_id=f.id where sess.id=sid and f.user_id=auth.uid() and f.status='verified' and f.factor_type='totp') and exists(select 1 from timber.mfa_leases l where l.session_id=sid and l.user_id=auth.uid() and l.expires_at>now() and l.verified_at>now()-interval '8 hours');
 if valid and renew then update timber.mfa_leases set expires_at=least(now()+case when shared_computer then interval '5 minutes' else interval '30 minutes' end,verified_at+interval '8 hours') where session_id=sid and expires_at>now(); valid:=found; end if;
 return coalesce(valid,false);
end $$;
create or replace function public.operator_complete(intent_id uuid) returns void language plpgsql security definer set search_path='' as $$
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
  insert into timber.mfa_leases(session_id,user_id,expires_at,proof_at,verified_at) values(sid,auth.uid(),now()+case when coalesce((select shared_computer from timber.mfa_leases where session_id=sid),true) then interval '5 minutes' else interval '30 minutes' end,proof,now()) on conflict(session_id) do update set expires_at=excluded.expires_at,proof_at=excluded.proof_at,verified_at=excluded.verified_at;
  delete from timber.mfa_intents where id=intent_id;
 else
  update timber.mfa_intents set approved_until=now()+interval '60 seconds' where id=intent_id;
 end if;
 insert into timber.mfa_events(user_id,session_id,event) values(auth.uid(),sid,ticket.scope||' verified');
end $$;

create function public.operator_computer_mode(shared boolean default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare sid uuid:=timber.mfa_session(); result boolean;
begin
 if shared is not null then
  if not public.operator_access(false) then raise exception 'Unlock workspace before changing computer mode.'; end if;
  update timber.mfa_leases set shared_computer=shared,
   expires_at=least(now()+case when shared then interval '5 minutes' else interval '30 minutes' end,verified_at+interval '8 hours')
   where session_id=sid and user_id=auth.uid() and expires_at>now();
  if not found then raise exception 'Unlock workspace before changing computer mode.'; end if;
  insert into timber.mfa_events(user_id,session_id,event) values(auth.uid(),sid,case when shared then 'shared computer enabled' else 'personal computer enabled' end);
 end if;
 select shared_computer into result from timber.mfa_leases where session_id=sid and user_id=auth.uid();
 return coalesce(result,true);
end $$;
revoke all on function public.operator_computer_mode(boolean) from public,anon;
grant execute on function public.operator_computer_mode(boolean) to authenticated;
commit;
