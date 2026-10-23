-- Application tables are private. Only the narrow authenticated RPCs below are exposed.
begin;
create schema if not exists timber;
revoke all on schema timber from public, anon, authenticated;

create table timber.profiles (
 id uuid primary key references auth.users(id), name text not null,
 department text not null default '',
 role text not null default 'Staff' check (role in ('Administrator','Inventory Custodian','Staff')),
 status text not null default 'pending' check (status in ('pending','active','suspended'))
);
create table timber.items (
 id uuid primary key, name text not null check(length(trim(name)) between 1 and 160),
 tag text not null check(length(trim(tag)) between 1 and 80),
 category text not null check(length(trim(category)) between 1 and 100),
 location text not null check(length(trim(location)) between 1 and 160),
 condition text not null check(condition in ('Good','Fair','Damaged','Missing')),
 archived boolean not null default false
);
create unique index unique_asset_tag on timber.items(lower(trim(tag)));
create table timber.releases (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references timber.items,
 borrower_id uuid references timber.profiles, use_type text not null check(use_type in ('publication_use','member_borrowing','external_borrowing')),
 purpose text not null check(length(trim(purpose)) between 1 and 200),
 issued_by uuid not null references timber.profiles, received_by uuid references timber.profiles,
 released_at timestamptz not null default now(), due_at timestamptz not null,
 condition_before text not null check(length(trim(condition_before)) between 1 and 200),
 returned_at timestamptz, condition_after text check(condition_after in ('Good','Fair','Damaged','Missing')),
 check ((use_type='external_borrowing') = (borrower_id is null)),
 check (due_at > released_at),
 check ((returned_at is null) = (received_by is null)),
 check ((returned_at is null) = (condition_after is null))
);
create unique index one_active_release on timber.releases(item_id) where returned_at is null;
create table timber.external_contacts (
 release_id uuid primary key references timber.releases, name text not null check(length(trim(name)) between 1 and 120),
 organization text not null default '' check(length(organization)<=160),
 contact_method text not null check(contact_method in ('email','phone')),
 contact text not null check(length(trim(contact)) between 1 and 160)
);
create table timber.incidents (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references timber.items,
 subject_id uuid references timber.profiles, reporter uuid not null references timber.profiles,
 kind text not null check(kind in ('Damaged','Missing')), notes text not null check(length(trim(notes)) between 1 and 4000),
 reported_at timestamptz not null default now(), resolved_at timestamptz, outcome text,
 check (resolved_at is null or length(trim(outcome)) between 1 and 4000)
);
create table timber.audit_logs (
 id uuid primary key default gen_random_uuid(), actor uuid, actor_role text not null,
 happened_at timestamptz not null default clock_timestamp(), action text not null,
 entity_id uuid not null, subject_id uuid, release_id uuid, use_type text,
 request_id uuid, reason text, before_data jsonb, after_data jsonb
);
create table timber.requests (
 actor uuid not null, request_id uuid not null, payload jsonb not null,
 primary key(actor,request_id)
);
-- Defense in depth: no policies or grants permit clients to access private tables.
alter table timber.profiles enable row level security;
alter table timber.items enable row level security;
alter table timber.releases enable row level security;
alter table timber.external_contacts enable row level security;
alter table timber.incidents enable row level security;
alter table timber.audit_logs enable row level security;
alter table timber.requests enable row level security;

create function timber.new_member() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into timber.profiles(id,name) values(new.id, left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'New member'),160));
 return new;
end $$;
create trigger timber_member_created after insert on auth.users for each row execute function timber.new_member();
insert into timber.profiles(id,name) select id,left(coalesce(nullif(raw_user_meta_data->>'full_name',''),'New member'),160) from auth.users on conflict do nothing;

create function timber.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare b jsonb; a jsonb; d jsonb; actor_id uuid := auth.uid(); actor_role text;
begin
 if TG_OP <> 'INSERT' then b:=to_jsonb(old); end if;
 if TG_OP <> 'DELETE' then a:=to_jsonb(new); end if;
 d:=coalesce(a,b);
 select role into actor_role from timber.profiles where id=actor_id;
 insert into timber.audit_logs(actor,actor_role,action,entity_id,subject_id,release_id,use_type,request_id,reason,before_data,after_data)
 values(actor_id,coalesce(actor_role,'Database maintenance'),TG_TABLE_NAME||'.'||lower(TG_OP),
 coalesce((d->>'item_id')::uuid,(d->>'id')::uuid),
 coalesce((d->>'borrower_id')::uuid,(d->>'subject_id')::uuid),
 case when TG_TABLE_NAME='releases' then (d->>'id')::uuid end,d->>'use_type',
 nullif(current_setting('timber.request_id',true),'')::uuid,
 nullif(current_setting('timber.reason',true),''),b,a);
 return coalesce(new,old);
end $$;
-- External contact values deliberately never enter the audit feed.
create trigger audit_items after insert or update or delete on timber.items for each row execute function timber.audit_change();
create trigger audit_releases after insert or update or delete on timber.releases for each row execute function timber.audit_change();
create trigger audit_incidents after insert or update or delete on timber.incidents for each row execute function timber.audit_change();
create trigger audit_profiles after insert or update or delete on timber.profiles for each row execute function timber.audit_change();
create function timber.reject_audit_change() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Audit records are append-only.'; end $$;
create trigger protect_audit before update or delete or truncate on timber.audit_logs for each statement execute function timber.reject_audit_change();

create function public.inventory_identity() returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(p) from timber.profiles p where id=auth.uid();
$$;

create function public.inventory_snapshot() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p timber.profiles; manager boolean;
begin
 select * into p from timber.profiles where id=auth.uid();
 if p.status is distinct from 'active' then raise exception 'Approved membership required.'; end if;
 manager:=p.role in ('Administrator','Inventory Custodian');
 return jsonb_build_object('version',3,
 'profiles',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from timber.profiles x where manager or x.id=p.id),
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

create function public.inventory_mutate(action jsonb, request_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare p timber.profiles; manager boolean; t text:=action->>'type'; item_id uuid; r timber.releases; n timber.incidents; i timber.items;
 stored jsonb; release_id uuid; borrower uuid; kind text; cond text; ext jsonb; target timber.profiles;
begin
 select * into p from timber.profiles where id=auth.uid() for share;
 if p.status is distinct from 'active' then raise exception 'Approved membership required.'; end if;
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
       if not exists(select 1 from timber.profiles where id=borrower and status='active') then raise exception 'Choose an approved member.'; end if;
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

revoke all on all functions in schema timber from public,anon,authenticated;
revoke all on function public.inventory_identity(), public.inventory_snapshot(), public.inventory_mutate(jsonb,uuid) from public,anon;
grant execute on function public.inventory_identity(), public.inventory_snapshot(), public.inventory_mutate(jsonb,uuid) to authenticated;
revoke all on all tables in schema timber from public,anon,authenticated;
commit;
