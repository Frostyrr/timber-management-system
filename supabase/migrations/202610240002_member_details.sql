begin;
alter table timber.profiles add column title text not null default '' check(length(title)<=120);
alter table timber.profiles add constraint valid_profile_name check(length(trim(name)) between 1 and 160);
alter table timber.profiles add constraint valid_department check(length(department)<=160);

-- Retain the original transaction implementation privately, behind the extended API.
alter function public.inventory_mutate(jsonb,uuid) set schema timber;
revoke all on function timber.inventory_mutate(jsonb,uuid) from public,anon,authenticated;

create function public.inventory_mutate(action jsonb, request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare p timber.profiles; target timber.profiles; stored jsonb; operation text:=action->>'type';
begin
 if operation in ('membership','update-profile','delete-profile') then
   -- Acquire before profile row locks to serialize concurrent access changes.
   perform pg_advisory_xact_lock(872341);
 end if;
 if operation not in ('update-profile','delete-profile') then
   perform timber.inventory_mutate(action,request_id);
   return;
 end if;
 select * into p from timber.profiles where id=auth.uid() for share;
 if p.status is distinct from 'active' or p.role is distinct from 'Administrator' then
   raise exception 'Active administrator required.';
 end if;
 if request_id is null then raise exception 'Request ID required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p.id::text||request_id::text,0));
 select payload into stored from timber.requests q where q.actor=p.id and q.request_id=inventory_mutate.request_id;
 if found then
   if stored<>action then raise exception 'Request ID already used with different input.'; end if;
   return;
 end if;
 if length(trim(coalesce(action->>'reason',''))) not between 1 and 1000 then raise exception 'Document a reason.'; end if;
 select * into target from timber.profiles where id=(action->>'id')::uuid for update;
 if not found then raise exception 'Member not found.'; end if;
 if target.id=p.id then raise exception 'Another administrator must change your details or access.'; end if;
 perform set_config('timber.request_id',request_id::text,true);
 perform set_config('timber.reason',action->>'reason',true);
 if operation='delete-profile' then
   -- Suspension preserves foreign keys, historical attribution and return accountability.
   update timber.profiles set status='suspended' where id=target.id;
 else
   update timber.profiles set name=trim(coalesce(action->>'name',name)),
     title=trim(coalesce(action->>'title',title)),
     department=trim(coalesce(action->>'department',department)),
     role=coalesce(action->>'role',role),status=coalesce(action->>'status',status)
   where id=target.id;
 end if;
 insert into timber.requests values(p.id,request_id,action);
end $$;
revoke all on function public.inventory_mutate(jsonb,uuid) from public,anon;
grant execute on function public.inventory_mutate(jsonb,uuid) to authenticated;
commit;
