-- ==============================================================================
-- Migration: 202610250004_account_settings_and_self_delete.sql
-- Description: Enable Account Settings self-deletion and email mapping in identity
--
-- Features:
-- 1. inventory_identity() returns user's authentic email from auth.users.
-- 2. inventory_mutate() allows safe self-deletion with strict guards:
--    - Prevents sole administrator lockout.
--    - Prevents deletion if unreturned equipment loans exist.
--    - Suspends profile and records audit memo for compliance.
-- ==============================================================================

begin;

-- 1. Upgrade public.inventory_identity() to bundle email from auth.users
create or replace function public.inventory_identity() returns jsonb 
language sql stable security definer set search_path='' as $$
  select to_jsonb(p) || jsonb_build_object('email', coalesce(u.email, ''))
  from timber.profiles p
  left join auth.users u on u.id = p.id
  where p.id = auth.uid();
$$;

revoke all on function public.inventory_identity() from public, anon;
grant execute on function public.inventory_identity() to authenticated;

-- 2. Upgrade public.inventory_mutate to support self-requested account deletion
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
 if p.status is distinct from 'active' then
   raise exception 'Active operator access required.';
 end if;
 if request_id is null then raise exception 'Request ID required.'; end if;
 
 select * into target from timber.profiles where id=(action->>'id')::uuid for update;
 if not found then raise exception 'Account profile not found.'; end if;
 
 if operation='delete-profile' then
   if target.id = p.id then
     -- Self-deletion validation
     if p.role = 'Administrator' and (select count(*) from timber.profiles where role='Administrator' and status='active' and id <> p.id) = 0 then
       raise exception 'You cannot delete your account because you are the sole active administrator.';
     end if;
     if exists(select 1 from timber.releases where borrower_id=p.id and returned_at is null) then
       raise exception 'Cannot delete account with unreturned active equipment loans.';
     end if;
   else
     if p.role is distinct from 'Administrator' then
       raise exception 'Active administrator required to delete other accounts.';
     end if;
     if target.role = 'Administrator' and (select count(*) from timber.profiles where role='Administrator' and status='active' and id <> target.id) = 0 then
       raise exception 'Cannot delete the sole active administrator account.';
     end if;
   end if;
   update timber.profiles set status='suspended' where id=target.id;
 else
   if p.role is distinct from 'Administrator' and target.id <> p.id then
     raise exception 'Active administrator required to edit other accounts.';
   end if;
   update timber.profiles set 
     name=trim(coalesce(action->>'name',name)),
     title=trim(coalesce(action->>'title',title)),
     department=trim(coalesce(action->>'department',department)),
     role=case when p.role='Administrator' then coalesce(action->>'role',role) else role end,
     status=case when p.role='Administrator' then coalesce(action->>'status',status) else status end
   where id=target.id;
 end if;
 
 insert into timber.requests values(p.id,request_id,action);
end $$;

revoke all on function public.inventory_mutate(jsonb, uuid) from public, anon;
grant execute on function public.inventory_mutate(jsonb, uuid) to authenticated;

commit;
