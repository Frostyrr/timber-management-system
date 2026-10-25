-- Migration 202610250002_cleanup_mock_archives.sql
-- Clean up all mock / test archived equipment and staff directory entries,
-- and add complete Preservation Lifecycle support (restore, purge, and archive note editing)
begin;

-- 1. Remove mock/test archived equipment from database
delete from timber.external_contacts where release_id in (select id from timber.releases where item_id in (select id from timber.items where archived = true));
delete from timber.incidents where item_id in (select id from timber.items where archived = true);
delete from timber.releases where item_id in (select id from timber.items where archived = true);
delete from timber.items where archived = true;

-- 2. Remove mock/test archived staff directory members from database
delete from timber.external_contacts where release_id in (select id from timber.releases where borrower_id in (select id from timber.people where archived = true));
delete from timber.incidents where subject_id in (select id from timber.people where archived = true);
delete from timber.releases where borrower_id in (select id from timber.people where archived = true);
delete from timber.people where archived = true;

-- 3. Add archive_reason columns for preservation memos
alter table timber.items add column if not exists archive_reason text;
alter table timber.people add column if not exists archive_reason text;

-- 4. Extend timber.inventory_mutate to support unarchive, purge-archive, purge-all-archives, and archive-note
create or replace function timber.inventory_mutate(action jsonb, request_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare p timber.profiles; manager boolean; t text:=action->>'type'; item_id uuid; r timber.releases; n timber.incidents; i timber.items;
 stored jsonb; release_id uuid; borrower uuid; kind text; cond text; ext jsonb; target timber.profiles;
begin
 select * into p from timber.profiles where id=auth.uid() for share;
 if p.status is distinct from 'active' or p.role not in ('Administrator','Inventory Custodian') then raise exception 'Approved membership required.'; end if;
 if request_id is null then raise exception 'Request ID required.'; end if;
 manager:=p.role in ('Administrator','Inventory Custodian');
 if t is null or t not in ('item','checkout','return','incident','resolve','archive','unarchive','archive-note','purge-archive','purge-all-archives','correct','membership') then raise exception 'Unknown operation.'; end if;
 if t<>'incident' and not manager then raise exception 'Custodian or administrator required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p.id::text||request_id::text,0));
 select payload into stored from timber.requests q where q.actor=p.id and q.request_id=inventory_mutate.request_id;
 if found then
   if stored<>action then raise exception 'Request ID already used with different input.'; end if;
   return;
 end if;
 perform set_config('timber.request_id',request_id::text,true);
 perform set_config('timber.reason',coalesce(action->>'reason',''),true);
 if t='membership' then
   if p.role<>'Administrator' then raise exception 'Administrator required.'; end if;
   if length(trim(coalesce(action->>'reason',''))) not between 1 and 1000 then raise exception 'Document a reason.'; end if;
   perform pg_advisory_xact_lock(872341);
   select * into target from timber.profiles where id=(action->>'id')::uuid for update;
   if not found then raise exception 'Member not found.'; end if;
   if target.id=p.id then raise exception 'Another administrator must change your access.'; end if;
   update timber.profiles set role=action->>'role',status=action->>'status' where id=target.id;
 elsif t='purge-all-archives' then
   if action->>'targetType' is null or action->>'targetType' in ('all', 'equipment') then
     delete from timber.external_contacts where release_id in (select id from timber.releases where item_id in (select id from timber.items where archived = true));
     delete from timber.incidents where item_id in (select id from timber.items where archived = true);
     delete from timber.releases where item_id in (select id from timber.items where archived = true);
     delete from timber.items where archived = true;
   end if;
   if action->>'targetType' is null or action->>'targetType' in ('all', 'staff') then
     delete from timber.external_contacts where release_id in (select id from timber.releases where borrower_id in (select id from timber.people where archived = true));
     delete from timber.incidents where subject_id in (select id from timber.people where archived = true);
     delete from timber.releases where borrower_id in (select id from timber.people where archived = true);
     delete from timber.people where archived = true;
   end if;
 elsif t='archive-note' then
   if length(trim(coalesce(action->>'reason',''))) not between 1 and 1000 then raise exception 'Document a reason.'; end if;
   if action->>'targetType' = 'equipment' then
     update timber.items set archive_reason = trim(action->>'reason') where id = (action->>'id')::uuid;
   else
     update timber.people set archive_reason = trim(action->>'reason') where id = (action->>'id')::uuid;
   end if;
 else
   if t in ('return','correct') then
     select * into r from timber.releases where id=(action->>'loanId')::uuid;
     item_id:=r.item_id;
   elsif t='resolve' then
     select * into n from timber.incidents where id=(action->>'id')::uuid;
     item_id:=n.item_id;
   elsif t='item' then item_id:=(action->'item'->>'id')::uuid;
   elsif t='purge-archive' and action->>'targetType'='equipment' then
     item_id:=(action->>'id')::uuid;
   else item_id:=(action->>'itemId')::uuid;
   end if;
   if item_id is null then raise exception 'Record not found.'; end if;
   perform pg_advisory_xact_lock(hashtextextended(item_id::text,1));
   select * into i from timber.items where id=item_id for update;
   if t<>'item' and not found then raise exception 'Equipment not found.'; end if;
   if t='item' then
     cond:=action->'item'->>'condition';
     if i.id is null and cond not in ('Good','Fair') then raise exception 'Register usable equipment first.'; end if;
     if i.id is not null and cond is distinct from i.condition then raise exception 'Change condition through return or incident resolution.'; end if;
     insert into timber.items(id,name,tag,category,location,condition) values(item_id,trim(action->'item'->>'name'),trim(action->'item'->>'tag'),trim(action->'item'->>'category'),trim(action->'item'->>'location'),cond)
     on conflict(id) do update set name=excluded.name,tag=excluded.tag,category=excluded.category,location=excluded.location;
   elsif t='checkout' then
     if i.archived or i.condition not in ('Good','Fair') or exists(select 1 from timber.releases where releases.item_id=i.id and returned_at is null) or exists(select 1 from timber.incidents where incidents.item_id=i.id and resolved_at is null) then raise exception 'Equipment unavailable.'; end if;
     if (action->>'due')::timestamptz <= now() then raise exception 'Choose a future return deadline.'; end if;
     if action->>'useType'<>'external_borrowing' then
       borrower:=(action->>'borrowerId')::uuid;
       perform 1 from timber.people where id=borrower and not archived for share;
       if not found then raise exception 'Choose an active directory member.'; end if;
     end if;
     insert into timber.releases(item_id,borrower_id,use_type,purpose,issued_by,due_at,condition_before)
     values(i.id,borrower,action->>'useType',trim(action->>'purpose'),p.id,(action->>'due')::timestamptz,trim(action->>'condition')) returning id into release_id;
     if action->>'useType'='external_borrowing' then
       ext:=action->'external';
       if ext->>'contactMethod'='email' and (ext->>'contact') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email.'; end if;
       if ext->>'contactMethod'='phone' and ((ext->>'contact') !~ '^[+0-9 ().-]+$' or length(regexp_replace(ext->>'contact','[^0-9]','','g')) not between 7 and 15) then raise exception 'Enter a valid phone number.'; end if;
       insert into timber.external_contacts values(release_id,trim(ext->>'name'),coalesce(trim(ext->>'organization'),''),ext->>'contactMethod',trim(ext->>'contact'));
     end if;
   elsif t='return' then
     select * into r from timber.releases where id=r.id for update;
     if r.returned_at is not null then raise exception 'Usage record already closed.'; end if;
     cond:=action->>'condition';
     update timber.releases set returned_at=now(),received_by=p.id,condition_after=cond where id=r.id;
     update timber.items set condition=cond where id=i.id;
     if cond in ('Damaged','Missing') then insert into timber.incidents(item_id,subject_id,reporter,kind,notes) values(i.id,r.borrower_id,p.id,cond,'Condition recorded on return. Review required; no responsibility presumed.'); end if;
   elsif t='incident' then
     select * into r from timber.releases where releases.item_id=i.id and returned_at is null;
     if not manager and r.borrower_id is distinct from p.id then raise exception 'Only report equipment currently assigned to you.'; end if;
     insert into timber.incidents(item_id,subject_id,reporter,kind,notes) values(i.id,r.borrower_id,p.id,action->>'kind',trim(action->>'notes'));
     update timber.items set condition=action->>'kind' where id=i.id;
   elsif t='resolve' then
     select * into n from timber.incidents where id=n.id for update;
     if n.resolved_at is not null then raise exception 'Incident already resolved.'; end if;
     if length(trim(coalesce(action->>'outcome',''))) not between 1 and 4000 then raise exception 'Document the outcome.'; end if;
     update timber.incidents set resolved_at=now(),outcome=trim(action->>'outcome') where id=n.id;
     update timber.items set condition=action->>'condition' where id=i.id;
   elsif t in ('archive','correct') then
     if length(trim(coalesce(action->>'reason',''))) not between 1 and 1000 then raise exception 'Document a reason.'; end if;
     if t='archive' then
       if exists(select 1 from timber.releases where releases.item_id=i.id and returned_at is null) or exists(select 1 from timber.incidents where incidents.item_id=i.id and resolved_at is null) then raise exception 'Resolve active usage and incidents before archiving.'; end if;
       update timber.items set archived=true, archive_reason=trim(coalesce(action->>'reason', 'Decommissioned from publication inventory')) where id=i.id;
     else
       update timber.releases set purpose=trim(action->>'purpose'),due_at=(action->>'due')::timestamptz where id=r.id;
     end if;
   elsif t='unarchive' then
     update timber.items set archived=false where id=i.id;
   elsif t='purge-archive' then
     delete from timber.external_contacts where release_id in (select id from timber.releases where item_id = i.id);
     delete from timber.incidents where item_id = i.id;
     delete from timber.releases where item_id = i.id;
     delete from timber.items where id = i.id;
   end if;
 end if;
 insert into timber.requests values(p.id,request_id,action);
end $$;

-- 5. Extend public.inventory_mutate to route person-unarchive, archive-note, and staff purge-archive
create or replace function public.inventory_mutate(action jsonb, request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare p timber.profiles; target timber.profiles; stored jsonb; operation text:=action->>'type'; person_id uuid;
begin
 select * into p from timber.profiles where id=auth.uid();
 if p.status is distinct from 'active' or p.role not in ('Administrator','Inventory Custodian') then raise exception 'Approved operator access required.'; end if;
 if operation in ('person-save','person-archive','person-unarchive') then
   select * into p from timber.profiles where id=auth.uid() for share;
   if p.status is distinct from 'active' or p.role not in ('Administrator','Inventory Custodian') then raise exception 'Approved operator access required.'; end if;
   if request_id is null then raise exception 'Request ID required.'; end if;
   perform pg_advisory_xact_lock(hashtextextended(p.id::text||request_id::text,0));
   select payload into stored from timber.requests q where q.actor=p.id and q.request_id=inventory_mutate.request_id;
   if found then
     if stored<>action then raise exception 'Request ID already used with different input.'; end if;
     return;
   end if;
   person_id:=(action->>'id')::uuid;
   if person_id is null then raise exception 'Directory ID required.'; end if;
   perform set_config('timber.request_id',request_id::text,true);
   perform set_config('timber.reason',coalesce(action->>'reason',''),true);
   if operation='person-save' then
     insert into timber.people(id,name,department,title) values(person_id,trim(action->>'name'),trim(coalesce(action->>'department','')),trim(coalesce(action->>'title','')))
     on conflict(id) do update set name=excluded.name,department=excluded.department,title=excluded.title;
   elsif operation='person-archive' then
     if length(trim(coalesce(action->>'reason',''))) not between 1 and 1000 then raise exception 'Document a reason.'; end if;
     perform 1 from timber.people where id=person_id for update;
     if not found then raise exception 'Directory member not found.'; end if;
     if exists(select 1 from timber.releases where borrower_id=person_id and returned_at is null) then raise exception 'Record outstanding equipment returns before archiving.'; end if;
     update timber.people set archived=true, archive_reason=trim(coalesce(action->>'reason', 'Archived from staff directory')) where id=person_id;
   elsif operation='person-unarchive' then
     perform 1 from timber.people where id=person_id for update;
     if not found then raise exception 'Directory member not found.'; end if;
     update timber.people set archived=false where id=person_id;
   end if;
   insert into timber.requests values(p.id,request_id,action);
   return;
 end if;
 if operation='purge-archive' and action->>'targetType'='staff' then
   person_id:=(action->>'id')::uuid;
   if person_id is null then raise exception 'Directory ID required.'; end if;
   delete from timber.external_contacts where release_id in (select id from timber.releases where borrower_id = person_id);
   delete from timber.incidents where subject_id = person_id;
   delete from timber.releases where borrower_id = person_id;
   delete from timber.people where id = person_id;
   insert into timber.requests values(p.id,request_id,action);
   return;
 end if;
 if operation='archive-note' then
   perform timber.inventory_mutate(action, request_id);
   return;
 end if;
 if operation in ('membership','update-profile','delete-profile') then
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
 perform timber.inventory_mutate(action,request_id);
end $$;

grant execute on function public.inventory_mutate(jsonb, uuid) to authenticated;

commit;
