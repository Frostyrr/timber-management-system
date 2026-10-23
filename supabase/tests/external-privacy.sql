\set ON_ERROR_STOP on
begin;
insert into auth.users values ('10000000-0000-0000-0000-000000000001','{"full_name":"Manager"}'),('10000000-0000-0000-0000-000000000002','{"full_name":"Staff"}'),('10000000-0000-0000-0000-000000000003','{"full_name":"Pending"}');
update timber.profiles set status='active',role='Administrator' where id='10000000-0000-0000-0000-000000000001';
update timber.profiles set status='active' where id='10000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select public.inventory_mutate('{"type":"item","item":{"id":"10000000-0000-0000-0000-000000000004","name":"External test camera","tag":"EXTERNAL-TEST","category":"Camera","location":"Office","condition":"Good"}}',gen_random_uuid());
do $$declare a jsonb; s jsonb; begin
 a:=jsonb_build_object('type','checkout','itemId','10000000-0000-0000-0000-000000000004','useType','external_borrowing','purpose','External event','due',now()+interval '1 day','condition','Good','external',jsonb_build_object('name','Fictional borrower','organization','Test','contactMethod','email','contact','invalid'));
 begin perform public.inventory_mutate(a,gen_random_uuid()); raise exception 'Invalid contact accepted'; exception when others then if sqlerrm<>'Enter a valid email.' then raise; end if; end;
 s:=public.inventory_snapshot();
 if jsonb_array_length(s->'loans')<>0 then raise exception 'Failed contact did not roll back release'; end if;
 if exists(select 1 from jsonb_array_elements(s->'events') e where e->>'action'='releases.insert') then raise exception 'Failed contact did not roll back audit'; end if;
 a:=jsonb_set(a,'{external,contact}','"fictional@example.invalid"');
 perform public.inventory_mutate(a,gen_random_uuid());
 s:=public.inventory_snapshot();
 if jsonb_array_length(s->'loans')<>1 then raise exception 'External release missing'; end if;
 if (s->'events')::text like '%fictional@example.invalid%' then raise exception 'Audit leaked contact'; end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$declare s jsonb; begin
 s:=public.inventory_snapshot();
 if jsonb_array_length(s->'loans')<>0 then raise exception 'Unrelated staff can read external releases'; end if;
 if jsonb_array_length(s->'events')<>0 then raise exception 'Unrelated staff can read audit records'; end if;
 if not (s->'items'->0->>'unavailable')::boolean then raise exception 'Hidden release incorrectly appears available'; end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
do $$begin
 begin perform public.inventory_snapshot(); raise exception 'Pending membership accepted'; exception when others then if sqlerrm<>'Approved membership required.' then raise; end if; end;
end$$;
rollback;
