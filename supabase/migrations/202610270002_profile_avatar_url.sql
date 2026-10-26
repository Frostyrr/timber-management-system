-- Migration: 202610270002_profile_avatar_url.sql
-- Description: Add avatar_url to timber.profiles and synchronize with Google OAuth metadata

begin;

-- 1. Add avatar_url column to timber.profiles
alter table timber.profiles 
  add column if not exists avatar_url text check(avatar_url is null or length(avatar_url) <= 1000);

-- 2. Backfill existing profiles with Google profile picture from auth.users
update timber.profiles p
set avatar_url = coalesce(
  nullif(u.raw_user_meta_data->>'avatar_url', ''),
  nullif(u.raw_user_meta_data->>'picture', '')
)
from auth.users u
where u.id = p.id
  and (p.avatar_url is null or p.avatar_url = '');

-- 3. Upgrade timber.new_member() to persist Google avatar on first sign-in
create or replace function timber.new_member() returns trigger language plpgsql security definer set search_path='' as $$
declare
  google_avatar text;
  google_name text;
begin
  google_avatar := coalesce(
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(new.raw_user_meta_data->>'picture', '')
  );
  google_name := left(coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'name', ''), 'New member'), 160);

  insert into timber.profiles(id, name, avatar_url)
  values(new.id, google_name, google_avatar)
  on conflict (id) do update set
    avatar_url = coalesce(excluded.avatar_url, timber.profiles.avatar_url);

  return new;
end $$;

-- 4. Synchronize avatar on subsequent Google sign-ins when auth.users is updated
drop trigger if exists timber_member_updated on auth.users;
create trigger timber_member_updated after update on auth.users for each row execute function timber.new_member();

-- 5. Upgrade public.inventory_identity() to synchronize avatar_url and return it
create or replace function public.inventory_identity() returns jsonb 
language plpgsql security definer set search_path='' as $$
declare
  p timber.profiles;
  u auth.users;
  google_avatar text;
begin
  select * into p from timber.profiles where id = auth.uid();
  select * into u from auth.users where id = auth.uid();
  if not found and p is null then
    return null;
  end if;

  google_avatar := coalesce(
    nullif(u.raw_user_meta_data->>'avatar_url', ''),
    nullif(u.raw_user_meta_data->>'picture', '')
  );

  if google_avatar is not null and p.avatar_url is distinct from google_avatar then
    update timber.profiles set avatar_url = google_avatar where id = p.id;
    p.avatar_url := google_avatar;
  end if;

  return to_jsonb(p) || jsonb_build_object('email', coalesce(u.email, ''));
end $$;

revoke all on function public.inventory_identity() from public, anon;
grant execute on function public.inventory_identity() to authenticated;

commit;
