-- Migration: 202610250005_recent_public_activity.sql
-- Exposes a sanitized, public-safe read-only function for recent equipment activity logs
-- Allows the landing/login terminal stream to fetch real database events without exposing sensitive PII.

begin;

create or replace function public.recent_public_activity() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  return (
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', e.id,
      'action', e.action,
      'at', e.happened_at,
      'itemName', coalesce((e.after_data->>'name'), (e.before_data->>'name'), (select name from timber.items where id = e.entity_id), 'Equipment item'),
      'tag', coalesce((e.after_data->>'tag'), (e.before_data->>'tag'), (select tag from timber.items where id = e.entity_id), 'TP-EQP'),
      'category', coalesce((e.after_data->>'category'), (e.before_data->>'category'), (select category from timber.items where id = e.entity_id), 'Equipment'),
      'details', case 
        when e.action = 'checkout' then coalesce(coalesce(e.use_type, 'Staff') || ' checkout: ' || coalesce(e.reason, 'Coverage assignment'), 'Equipment checked out')
        when e.action = 'return' then 'Returned in ' || coalesce((e.after_data->>'condition'), 'Good') || ' condition'
        when e.action = 'item' then 'Catalog record registered or updated'
        when e.action = 'incident' then 'Incident report documented'
        when e.action = 'resolve' then 'Incident resolved & verified'
        when e.action = 'archive' then 'Decommissioned to archives'
        when e.action = 'unarchive' then 'Restored from archives'
        else coalesce(e.reason, e.action)
      end
    ))), '[]'::jsonb)
    from (
      select * from timber.audit_logs 
      where action in ('checkout', 'return', 'item', 'incident', 'resolve', 'archive', 'unarchive')
      order by happened_at desc 
      limit 5
    ) e
  );
end $$;

grant execute on function public.recent_public_activity() to anon, authenticated;

commit;
