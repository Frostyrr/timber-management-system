\set ON_ERROR_STOP on
begin;
insert into auth.users values ('20000000-0000-0000-0000-000000000001','{"full_name":"Admin"}'),('20000000-0000-0000-0000-000000000002','{"full_name":"Member"}');
update timber.profiles set role='Administrator',status='active' where id='20000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
do $$declare a jsonb; rid uuid:=gen_random_uuid(); s jsonb; before_count int; begin
 a:='{"type":"update-profile","id":"20000000-0000-0000-0000-000000000002","name":"Approved member","department":"Visuals","title":"Photographer","role":"Staff","status":"active","reason":"Approved publication member"}';
 perform public.inventory_mutate(a,rid);
 before_count:=jsonb_array_length(public.inventory_snapshot()->'events');
 perform public.inventory_mutate(a,rid);
 if jsonb_array_length(public.inventory_snapshot()->'events')<>before_count then raise exception 'Retry duplicated audit'; end if;
 if not exists(select 1 from jsonb_array_elements(public.inventory_snapshot()->'profiles') p where p->>'name'='Approved member' and p->>'title'='Photographer' and p->>'status'='active') then raise exception 'Profile update missing'; end if;
 begin perform public.inventory_mutate(jsonb_set(a,'{id}','"20000000-0000-0000-0000-000000000001"'),gen_random_uuid()); raise exception 'Self-edit accepted'; exception when others then if sqlerrm<>'Another administrator must change your details or access.' then raise; end if; end;
 perform public.inventory_mutate('{"type":"delete-profile","id":"20000000-0000-0000-0000-000000000002","reason":"Membership ended"}',gen_random_uuid());
 if not exists(select 1 from jsonb_array_elements(public.inventory_snapshot()->'profiles') p where p->>'name'='Approved member' and p->>'status'='suspended') then raise exception 'Suspension must retain profile'; end if;
end$$;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
do $$begin
 begin perform public.inventory_snapshot(); raise exception 'Suspended access accepted'; exception when others then if sqlerrm<>'Approved membership required.' then raise; end if; end;
 begin perform public.inventory_mutate('{"type":"update-profile"}',gen_random_uuid()); raise exception 'Suspended edit accepted'; exception when others then if sqlerrm<>'Approved operator access required.' then raise; end if; end;
end$$;
rollback;
