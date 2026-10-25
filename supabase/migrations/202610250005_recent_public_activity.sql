-- Migration: 202610250005_recent_public_activity.sql
-- Exposes a sanitized, public-safe read-only function for recent equipment activity logs
-- Fetches actual equipment usage (checkouts), returns, and registered gear from timber.releases and timber.items.

begin;

create or replace function public.recent_public_activity() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  return (
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', q.id,
      'action', q.action,
      'at', q.at,
      'itemName', q.name,
      'tag', q.tag,
      'category', q.category,
      'details', q.details
    ))), '[]'::jsonb)
    from (
      with activity as (
        -- 1. Actual checkouts (equipment usage) from timber.releases
        select 
          r.id::text || '-out' as id,
          'checkout' as action,
          r.released_at as at,
          i.name as name,
          i.tag as tag,
          i.category as category,
          'Checked out for ' || r.purpose as details,
          1 as priority
        from timber.releases r
        join timber.items i on i.id = r.item_id

        union all

        -- 2. Actual returns from timber.releases
        select 
          r.id::text || '-in' as id,
          'return' as action,
          r.returned_at as at,
          i.name as name,
          i.tag as tag,
          i.category as category,
          'Returned in ' || coalesce(r.condition_after, 'Good') || ' condition' as details,
          1 as priority
        from timber.releases r
        join timber.items i on i.id = r.item_id
        where r.returned_at is not null

        union all

        -- 3. Actual equipment registered in timber.items (ensures database equipment displays even before first checkout)
        select 
          i.id::text || '-reg' as id,
          'checkout' as action,
          coalesce(
            (select max(l.happened_at) from timber.audit_logs l where l.entity_id = i.id),
            now()
          ) as at,
          i.name as name,
          i.tag as tag,
          i.category as category,
          'Equipment registered · ' || i.condition || ' condition in ' || i.location as details,
          2 as priority
        from timber.items i
        where not i.archived
      )
      select id, action, at, name, tag, category, details
      from activity
      order by priority asc, at desc
      limit 5
    ) q
  );
end $$;

grant execute on function public.recent_public_activity() to anon, authenticated;

commit;
