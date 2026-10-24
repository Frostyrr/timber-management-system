\set ON_ERROR_STOP on
begin;
insert into auth.users values ('30000000-0000-0000-0000-000000000001','{"full_name":"Admin"}'),('30000000-0000-0000-0000-000000000002','{"full_name":"Custodian"}'),('30000000-0000-0000-0000-000000000003','{"full_name":"Staff"}');
update timber.profiles set status='active',role=case id when '30000000-0000-0000-0000-000000000001' then 'Administrator' when '30000000-0000-0000-0000-000000000002' then 'Inventory Custodian' else 'Staff' end;
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
select public.inventory_mutate('{"type":"person-save","id":"30000000-0000-0000-0000-000000000004","name":"No Google account","department":"Visuals","title":"Photographer"}','30000000-0000-0000-0000-000000000005');
select public.inventory_mutate('{"type":"person-save","id":"30000000-0000-0000-0000-000000000004","name":"No Google account","department":"Visuals","title":"Photographer"}','30000000-0000-0000-0000-000000000005');
do $$begin
 if jsonb_array_length(public.inventory_snapshot()->'people')<>1 then raise exception 'Directory retry duplicated entry'; end if;
 if jsonb_array_length(public.inventory_snapshot()->'profiles')<>1 then raise exception 'Custodian sees account management data'; end if;
 begin perform public.inventory_mutate('{"type":"membership","id":"30000000-0000-0000-0000-000000000003","role":"Administrator","status":"active","reason":"Forbidden"}',gen_random_uuid()); raise exception 'Custodian granted access'; exception when others then if sqlerrm<>'Administrator required.' then raise; end if; end;
end$$;
select public.inventory_mutate('{"type":"item","item":{"id":"30000000-0000-0000-0000-000000000006","name":"Camera","tag":"DIRECTORY-TEST","category":"Camera","location":"Office","condition":"Good"}}',gen_random_uuid());
select public.inventory_mutate(jsonb_build_object('type','checkout','itemId','30000000-0000-0000-0000-000000000006','borrowerId','30000000-0000-0000-0000-000000000004','useType','publication_use','purpose','Event coverage','due',now()+interval '1 day','condition','Good'),gen_random_uuid());
do $$begin
 begin perform public.inventory_mutate('{"type":"person-archive","id":"30000000-0000-0000-0000-000000000004","reason":"Departed"}',gen_random_uuid()); raise exception 'Active borrower archived'; exception when others then if sqlerrm<>'Record outstanding equipment returns before archiving.' then raise; end if; end;
end$$;
select public.inventory_mutate(jsonb_build_object('type','return','loanId',public.inventory_snapshot()->'loans'->0->>'id','condition','Good'),gen_random_uuid());
select public.inventory_mutate('{"type":"person-archive","id":"30000000-0000-0000-0000-000000000004","reason":"Departed"}',gen_random_uuid());
do $$begin
 if jsonb_array_length(public.inventory_snapshot()->'loans')<>1 then raise exception 'Archiving lost history'; end if;
 if not (public.inventory_snapshot()->'people'->0->>'archived')::boolean then raise exception 'Archive failed'; end if;
 begin perform public.inventory_mutate(jsonb_build_object('type','checkout','itemId','30000000-0000-0000-0000-000000000006','borrowerId','30000000-0000-0000-0000-000000000004','useType','member_borrowing','purpose','Practice','due',now()+interval '1 day','condition','Good'),gen_random_uuid()); raise exception 'Archived member release accepted'; exception when others then if sqlerrm<>'Choose an active directory member.' then raise; end if; end;
end$$;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
do $$begin
 begin perform public.inventory_snapshot(); raise exception 'Staff workspace accepted'; exception when others then if sqlerrm<>'Approved membership required.' then raise; end if; end;
 begin perform public.inventory_mutate('{"type":"person-save"}',gen_random_uuid()); raise exception 'Staff directory mutation accepted'; exception when others then if sqlerrm<>'Approved operator access required.' then raise; end if; end;
end$$;
reset role;
do $$begin
 if exists(select 1 from auth.users where id='30000000-0000-0000-0000-000000000004') then raise exception 'Directory entry created auth account'; end if;
 if not exists(select 1 from timber.audit_logs where actor='30000000-0000-0000-0000-000000000002' and action='releases.insert' and subject_id='30000000-0000-0000-0000-000000000004') then raise exception 'Operator and borrower attribution missing'; end if;
end$$;
rollback;
