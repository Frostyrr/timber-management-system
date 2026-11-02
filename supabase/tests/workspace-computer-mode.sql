\set ON_ERROR_STOP on
begin;
insert into auth.users(id,raw_user_meta_data) values('70000000-0000-0000-0000-000000000001','{"full_name":"MFA admin"}');
update timber.profiles set role='Administrator',status='active' where id='70000000-0000-0000-0000-000000000001';
insert into auth.sessions(id,user_id,factor_id) values('70000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000003');
insert into auth.mfa_factors values('70000000-0000-0000-0000-000000000003','70000000-0000-0000-0000-000000000001','verified','totp');
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims',jsonb_build_object('session_id','70000000-0000-0000-0000-000000000002','aal','aal1')::text,true);

insert into timber.operator_factors values('70000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000003');
insert into timber.mfa_leases(session_id,user_id,expires_at,verified_at)
values('70000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000001',now()+interval '1 minute',now()-interval '1 hour');
select set_config('request.jwt.claims','{"session_id":"70000000-0000-0000-0000-000000000002","aal":"aal2"}',true);
set local role authenticated;
do $$begin
 if not public.operator_computer_mode() then raise exception 'Default must be shared'; end if;
 if not public.operator_access(true) then raise exception 'Active work should survive old 30 minute cap'; end if;
 if public.operator_computer_mode(false) then raise exception 'Personal selection failed'; end if;
end $$;
reset role;
do $$begin
 if not exists(select 1 from timber.mfa_leases where expires_at=now()+interval '30 minutes' and not shared_computer) then raise exception 'Personal expiry incorrect'; end if;
end $$;
set local role authenticated;
select public.operator_computer_mode(true);
reset role;
do $$begin
 if not exists(select 1 from timber.mfa_leases where expires_at=now()+interval '5 minutes' and shared_computer) then raise exception 'Shared expiry incorrect'; end if;
end $$;
update timber.mfa_leases set expires_at=now()-interval '1 second';
set local role authenticated;
do $$begin
 if public.operator_access(true) then raise exception 'Expired lease renewed'; end if;
 begin perform public.operator_computer_mode(false); raise exception 'Mode change bypassed lock';
 exception when others then if sqlerrm<>'Unlock workspace before changing computer mode.' then raise; end if; end;
end $$;
reset role;
update timber.mfa_leases set expires_at=now()+interval '1 minute',verified_at=now()-interval '9 hours';
set local role authenticated;
do $$begin
 if public.operator_access(true) then raise exception 'Eight hour cap bypassed'; end if;
end $$;
reset role;
do $$begin
 if has_function_privilege('anon','public.operator_computer_mode(boolean)','execute') then raise exception 'Anonymous access allowed'; end if;
end $$;
rollback;
