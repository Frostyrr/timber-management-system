\set ON_ERROR_STOP on
begin;
insert into auth.users values ('40000000-0000-0000-0000-000000000001','{"full_name":"Audit administrator"}'),('40000000-0000-0000-0000-000000000002','{"full_name":"Audit custodian"}');
update timber.profiles set status='active',role=case id when '40000000-0000-0000-0000-000000000001' then 'Administrator' else 'Inventory Custodian' end;
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',true);
select public.inventory_mutate('{"type":"person-save","id":"40000000-0000-0000-0000-000000000003","name":"Directory member","title":"Video Editor"}',gen_random_uuid());
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000002',true);
do $$declare s jsonb; begin
 s:=public.inventory_snapshot();
 if jsonb_array_length(s->'profiles')<>1 then raise exception 'Custodian received account list'; end if;
 if not exists(select 1 from jsonb_array_elements(s->'events') e where e->>'action'='people.insert' and e->>'actorName'='Audit administrator') then raise exception 'Operator display name missing'; end if;
 if not exists(select 1 from jsonb_array_elements(s->'events') e where e->>'actor'='system' and e->>'actorName'='System') then raise exception 'Maintenance attribution missing'; end if;
end$$;
rollback;
