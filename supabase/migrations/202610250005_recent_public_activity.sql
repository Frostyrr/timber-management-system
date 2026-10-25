-- Migration: 202610250005_recent_public_activity.sql
-- Exposes a sanitized, public-safe read-only function for recent equipment usage & return logs
-- Fetches the 5 most recent checkout and return events from timber.releases and timber.items.

begin;

create or replace function public.recent_public_activity() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  return (
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', e.id,
      'action', e.action,
      'at', e.at,
      'itemName', i.name,
      'tag', i.tag,
      'category', i.category,
      'details', e.details
    ))), '[]'::jsonb)
    from (
      -- Actual checkouts (equipment usage)
      select 
        r.id::text || '-out' as id,
        'checkout' as action,
        r.released_at as at,
        r.item_id,
        'Checked out for ' || r.purpose as details
      from timber.releases r
      union all
      -- Actual returns
      select 
        r.id::text || '-in' as id,
        'return' as action,
        r.returned_at as at,
        r.item_id,
        'Returned in ' || coalesce(r.condition_after, 'Good') || ' condition' as details
      from timber.releases r
      where r.returned_at is not null
      order by at desc
      limit 5
    ) e
    join timber.items i on i.id = e.item_id
  );
end $$;

grant execute on function public.recent_public_activity() to anon, authenticated;

commit;
