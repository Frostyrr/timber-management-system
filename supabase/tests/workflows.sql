\set ON_ERROR_STOP on
begin;
insert into auth.users values ('00000000-0000-0000-0000-000000000001','{"full_name":"Test admin"}'),('00000000-0000-0000-0000-000000000002','{"full_name":"Test staff"}');
update timber.profiles set status='active',role=case when id='00000000-0000-0000-0000-000000000001' then 'Administrator' else 'Staff' end;
insert into timber.people(id,name,department,title) select id,name,department,title from timber.profiles on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.inventory_mutate('{"type":"item","item":{"id":"00000000-0000-0000-0000-000000000003","name":"Camera","tag":"TEST-01","category":"Camera","location":"Office","condition":"Good"}}','00000000-0000-0000-0000-000000000004');
select public.inventory_mutate(jsonb_build_object('type','checkout','itemId','00000000-0000-0000-0000-000000000003','borrowerId','00000000-0000-0000-0000-000000000002','useType','publication_use','purpose','Coverage','due',now()+interval '1 day','condition','Good'),'00000000-0000-0000-0000-000000000005');
select public.inventory_mutate(jsonb_build_object('type','checkout','itemId','00000000-0000-0000-0000-000000000003','borrowerId','00000000-0000-0000-0000-000000000002','useType','publication_use','purpose','Coverage','due',now()+interval '1 day','condition','Good'),'00000000-0000-0000-0000-000000000005');
do $$begin
 if jsonb_array_length(public.inventory_snapshot()->'loans')<>1 then raise exception 'Retry duplicated release'; end if;
 begin
 perform public.inventory_mutate(jsonb_build_object('type','checkout','itemId','00000000-0000-0000-0000-000000000003','borrowerId','00000000-0000-0000-0000-000000000002','useType','publication_use','purpose','Coverage','due',now()+interval '1 day','condition','Good'),gen_random_uuid());
 raise exception 'Double checkout accepted';
 exception when others then if sqlerrm<>'Equipment unavailable.' then raise; end if; end;
end$$;
select public.inventory_mutate(jsonb_build_object('type','return','loanId',public.inventory_snapshot()->'loans'->0->>'id','condition','Damaged'),gen_random_uuid());
do $$begin
 if jsonb_array_length(public.inventory_snapshot()->'incidents')<>1 then raise exception 'Missing return incident'; end if;
 begin
 perform public.inventory_mutate(jsonb_build_object('type','return','loanId',public.inventory_snapshot()->'loans'->0->>'id','condition','Good'),gen_random_uuid());
 raise exception 'Repeated return accepted';
 exception when others then if sqlerrm<>'Usage record already closed.' then raise; end if; end;
 begin execute 'delete from timber.audit_logs'; raise exception 'Audit deletion accepted'; exception when insufficient_privilege then null; end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$begin
 begin perform public.inventory_mutate('{"type":"item"}',gen_random_uuid()); raise exception 'Staff mutation accepted'; exception when others then if sqlerrm<>'Approved operator access required.' then raise; end if; end;
end$$;
rollback;
