begin;
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
 'events',(select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',e.id,'actor',coalesce(e.actor::text,'system'),'actorName',case when e.actor is null then 'System' else coalesce((select name from timber.profiles where id=e.actor),'Unknown operator') end,'actorRole',e.actor_role,'at',e.happened_at,'text',e.action,'action',e.action,'entityId',e.entity_id,'subjectId',e.subject_id,'releaseId',e.release_id,'useType',e.use_type,'requestId',e.request_id,'reason',e.reason,'before',e.before_data,'after',e.after_data)) order by e.happened_at desc),'[]') from timber.audit_logs e where manager or e.actor=p.id or e.subject_id=p.id));
end $$;

revoke all on function public.inventory_snapshot() from public,anon;
grant execute on function public.inventory_snapshot() to authenticated;
commit;
