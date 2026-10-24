begin;
create table timber.people (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 160),
 department text not null default '' check(length(department)<=160),
 title text not null default '' check(length(title)<=120),
 archived boolean not null default false
);
alter table timber.people enable row level security;
revoke all on timber.people from public,anon,authenticated;
-- Keep existing borrower IDs so historical releases remain linked.
insert into timber.people(id,name,department,title)
select id,name,department,title from timber.profiles;
alter table timber.releases drop constraint releases_borrower_id_fkey;
alter table timber.releases add foreign key(borrower_id) references timber.people(id);
alter table timber.incidents drop constraint incidents_subject_id_fkey;
alter table timber.incidents add foreign key(subject_id) references timber.people(id);
create trigger audit_people after insert or update or delete on timber.people for each row execute function timber.audit_change();
create or replace function public.inventory_snapshot() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p timber.profiles; manager boolean;
begin
 select * into p from timber.profiles where id=auth.uid();
 if p.status is distinct from 'active' or p.role not in ('Administrator','Inventory Custodian') then raise exception 'Approved membership required.'; end if;
 manager:=p.role in ('Administrator','Inventory Custodian');
 return jsonb_build_object('version',3,
 'people',(select coalesce(jsonb_agg(to_jsonb(d) order by d.name),'[]') from timber.people d),
 'profiles',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from timber.profiles x where p.role='Administrator' or x.id=p.id),
 'items',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('unavailable',
 exists(select 1 from timber.releases r where r.item_id=i.id and r.returned_at is null) or
 exists(select 1 from timber.incidents n where n.item_id=i.id and n.resolved_at is null))),'[]') from timber.items i),
 'loans',(select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
 'id',r.id,'itemId',r.item_id,'borrowerId',r.borrower_id,'useType',r.use_type,'purpose',r.purpose,'event',r.purpose,
 'issuedBy',r.issued_by,'receivedBy',r.received_by,'out',r.released_at,'due',r.due_at,'before',r.condition_before,'returned',r.returned_at,'after',r.condition_after,
 'external',case when manager and c.release_id is not null then jsonb_build_object('name',c.name,'organization',c.organization,'contactMethod',c.contact_method,'contact',c.contact) end))),'[]')
 from timber.releases r left join timber.external_contacts c on c.release_id=r.id where manager or r.borrower_id=p.id),
 'incidents',(select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',n.id,'itemId',n.item_id,'kind',n.kind,'notes',n.notes,'at',n.reported_at,'reporter',n.reporter,'outcome',n.outcome,'resolved',n.resolved_at))),'[]') from timber.incidents n where manager or n.reporter=p.id or n.subject_id=p.id),
 'events',(select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',e.id,'actor',coalesce(e.actor::text,'system'),'actorRole',e.actor_role,'at',e.happened_at,'text',e.action,'action',e.action,'entityId',e.entity_id,'subjectId',e.subject_id,'releaseId',e.release_id,'useType',e.use_type,'requestId',e.request_id,'reason',e.reason,'before',e.before_data,'after',e.after_data)) order by e.happened_at desc),'[]') from timber.audit_logs e where manager or e.actor=p.id or e.subject_id=p.id));
end $$;

create or replace function timber.inventory_mutate(action jsonb, request_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare p timber.profiles; manager boolean; t text:=action->>'type'; item_id uuid; r timber.releases; n timber.incidents; i timber.items;
 stored jsonb; release_id uuid; borrower uuid; kind text; cond text; ext jsonb; target timber.profiles;
begin
 select * into p from timber.profiles where id=auth.uid() for share;
 if p.status is distinct from 'active' or p.role not in ('Administrator','Inventory Custodian') then raise exception 'Approved membership required.'; end if;
 if request_id is null then raise exception 'Request ID required.'; end if;
 manager:=p.role in ('Administrator','Inventory Custodian');
 if t is null or t not in ('item','checkout','return','incident','resolve','archive','correct','membership') then raise exception 'Unknown operation.'; end if;
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
   -- Serializes membership changes, including the last-administrator invariant.
   perform pg_advisory_xact_lock(872341);
   select * into target from timber.profiles where id=(action->>'id')::uuid for update;
   if not found then raise exception 'Member not found.'; end if;
   if target.id=p.id then raise exception 'Another administrator must change your access.'; end if;
   update timber.profiles set role=action->>'role',status=action->>'status' where id=target.id;
 else
   if t in ('return','correct') then
     select * into r from timber.releases where id=(action->>'loanId')::uuid;
     item_id:=r.item_id;
   elsif t='resolve' then
     select * into n from timber.incidents where id=(action->>'id')::uuid;
     item_id:=n.item_id;
   elsif t='item' then item_id:=(action->'item'->>'id')::uuid;
   else item_id:=(action->>'itemId')::uuid;
   end if;
   -- Serialize all operations on the same asset, including first registration.
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
       update timber.items set archived=true where id=i.id;
     else
       update timber.releases set purpose=trim(action->>'purpose'),due_at=(action->>'due')::timestamptz where id=r.id;
     end if;
   end if;
 end if;
 insert into timber.requests values(p.id,request_id,action);
end $$;

create or replace function public.inventory_mutate(action jsonb, request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare p timber.profiles; target timber.profiles; stored jsonb; operation text:=action->>'type'; person_id uuid;
begin
 select * into p from timber.profiles where id=auth.uid();
 if p.status is distinct from 'active' or p.role not in ('Administrator','Inventory Custodian') then raise exception 'Approved operator access required.'; end if;
 if operation in ('person-save','person-archive') then
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
   else
     if length(trim(coalesce(action->>'reason',''))) not between 1 and 1000 then raise exception 'Document a reason.'; end if;
     perform 1 from timber.people where id=person_id for update;
     if not found then raise exception 'Directory member not found.'; end if;
     if exists(select 1 from timber.releases where borrower_id=person_id and returned_at is null) then raise exception 'Record outstanding equipment returns before archiving.'; end if;
     update timber.people set archived=true where id=person_id;
   end if;
   insert into timber.requests values(p.id,request_id,action);
   return;
 end if;
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
revoke all on function timber.inventory_mutate(jsonb,uuid) from public,anon,authenticated;
revoke all on function public.inventory_mutate(jsonb,uuid),public.inventory_snapshot() from public,anon;
grant execute on function public.inventory_mutate(jsonb,uuid),public.inventory_snapshot() to authenticated;
commit;
