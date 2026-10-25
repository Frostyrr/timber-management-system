begin;

-- 1. Security Sessions Table
create table if not exists timber.security_sessions (
  id text primary key,
  user_id uuid references timber.profiles(id) on delete cascade,
  user_name text not null,
  user_email text not null,
  ip text not null default '127.0.0.1',
  location text not null default 'Unknown',
  device text not null default 'Unknown Device',
  browser text not null default 'Unknown Browser',
  os text not null default 'Unknown OS',
  started_at timestamptz not null default now(),
  last_active timestamptz not null default now(),
  is_current boolean not null default false,
  status text not null default 'active' check(status in ('active', 'revoked', 'expired'))
);
alter table timber.security_sessions enable row level security;
revoke all on timber.security_sessions from public, anon, authenticated;

-- 2. Security Login Events Table
create table if not exists timber.security_logins (
  id text primary key,
  user_id uuid references timber.profiles(id) on delete set null,
  user_name text,
  email text not null,
  happened_at timestamptz not null default now(),
  ip text not null default '127.0.0.1',
  location text not null default 'Unknown',
  device text not null default 'Unknown',
  user_agent text not null default '',
  status text not null check(status in ('success', 'failed')),
  failure_reason text check(failure_reason in ('unauthorized_domain', 'account_suspended', 'invalid_credentials', 'rate_limited', 'unrecognized_device')),
  is_new_device boolean not null default false,
  risk_level text not null default 'low' check(risk_level in ('low', 'medium', 'high'))
);
alter table timber.security_logins enable row level security;
revoke all on timber.security_logins from public, anon, authenticated;

-- 3. Security Threats Table
create table if not exists timber.security_threats (
  id text primary key,
  type text not null check(type in ('impossible_travel', 'brute_force', 'new_device_login', 'unauthorized_domain_attempt', 'session_anomaly', 'account_lockout')),
  severity text not null check(severity in ('critical', 'high', 'medium', 'low')),
  title text not null,
  description text not null,
  target_email text not null,
  ip text not null,
  location text not null,
  detected_at timestamptz not null default now(),
  status text not null default 'active' check(status in ('active', 'investigating', 'resolved', 'dismissed')),
  resolution_note text
);
alter table timber.security_threats enable row level security;
revoke all on timber.security_threats from public, anon, authenticated;

-- Seed initial telemetry threats (idempotent)
insert into timber.security_threats (id, type, severity, title, description, target_email, ip, location, detected_at, status, resolution_note)
values
  ('thr-01', 'impossible_travel', 'critical', 'Impossible Geolocation Travel Detected',
   'Account authenticated from Frankfurt, Germany (Tor exit node) only 48 minutes after an active session in Cagayan de Oro, Philippines.',
   'ryan.ilagan@thetimberland.pub', '185.220.101.5', 'Frankfurt, Germany', now() - interval '48 minutes', 'active', null),
  ('thr-02', 'unauthorized_domain_attempt', 'high', 'Non-Institutional Domain Access Blocked',
   'Repeated authentication attempts from unauthorized personal webmail domain (@gmail.com) blocked by institutional domain guardrails.',
   'unknown.intruder@gmail.com', '119.93.18.204', 'Davao City, Philippines', now() - interval '2 hours', 'active', null),
  ('thr-03', 'brute_force', 'medium', 'Consecutive Failed Password Threshold Exceeded',
   '5 consecutive failed credential attempts detected on staff account within 3 minutes. Temporary lockout threshold triggered.',
   'alyssa.delacruz@thetimberland.pub', '124.106.141.12', 'Cagayan de Oro, Philippines', now() - interval '14 hours', 'active', null)
on conflict(id) do nothing;

-- 4. Security Policies Table
create table if not exists timber.security_policies (
  id text primary key default 'primary',
  allowed_domains text[] not null default array['thetimberland.pub', 'ustp.edu.ph'],
  restrict_to_allowed_domains boolean not null default true,
  whitelisted_emails jsonb not null default '[]'::jsonb,
  session_timeout_minutes integer not null default 720,
  max_failed_attempts_before_lock integer not null default 5,
  notify_on_new_device boolean not null default true,
  require_admin_mfa boolean not null default true
);
alter table timber.security_policies enable row level security;
revoke all on timber.security_policies from public, anon, authenticated;

-- Initialize default policy row
insert into timber.security_policies (id, allowed_domains, restrict_to_allowed_domains, whitelisted_emails, session_timeout_minutes, max_failed_attempts_before_lock, notify_on_new_device, require_admin_mfa)
values (
  'primary',
  array['thetimberland.pub', 'ustp.edu.ph'],
  true,
  '[
    {"email": "adviser.external@gmail.com", "addedBy": "Marc Elson Rebato", "addedAt": "2026-10-11T00:00:00Z", "note": "Senior Editorial Consultant & Faculty Adviser"},
    {"email": "pico.coordinator@gmail.com", "addedBy": "Marc Elson Rebato", "addedAt": "2026-10-20T00:00:00Z", "note": "Public Information and Communications Office liaison"}
  ]'::jsonb,
  720,
  5,
  true,
  true
)
on conflict(id) do nothing;

-- 5. Security Suspensions Table
create table if not exists timber.security_suspensions (
  user_id uuid primary key references timber.profiles(id) on delete cascade,
  user_name text not null,
  user_email text not null,
  role text not null,
  suspended_at timestamptz not null default now(),
  suspended_by text not null,
  reason text not null,
  previous_status text not null default 'active'
);
alter table timber.security_suspensions enable row level security;
revoke all on timber.security_suspensions from public, anon, authenticated;

-- 6. RPC: security_snapshot()
create or replace function public.security_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p timber.profiles;
  pol timber.security_policies;
begin
  select * into p from timber.profiles where id = auth.uid();
  if p.status is distinct from 'active' or p.role not in ('Administrator', 'Inventory Custodian') then
    raise exception 'Approved administrator or custodian membership required.';
  end if;

  select * into pol from timber.security_policies where id = 'primary';

  return jsonb_build_object(
    'sessions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'userId', s.user_id,
        'userName', s.user_name,
        'userEmail', s.user_email,
        'ip', s.ip,
        'location', s.location,
        'device', s.device,
        'browser', s.browser,
        'os', s.os,
        'startedAt', s.started_at,
        'lastActive', s.last_active,
        'isCurrent', s.is_current,
        'status', s.status
      ) order by s.last_active desc), '[]'::jsonb)
      from timber.security_sessions s
    ),
    'loginEvents', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', l.id,
        'userId', l.user_id,
        'userName', l.user_name,
        'email', l.email,
        'timestamp', l.happened_at,
        'ip', l.ip,
        'location', l.location,
        'device', l.device,
        'userAgent', l.user_agent,
        'status', l.status,
        'failureReason', l.failure_reason,
        'isNewDevice', l.is_new_device,
        'riskLevel', l.risk_level
      ) order by l.happened_at desc), '[]'::jsonb)
      from timber.security_logins l
    ),
    'threats', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id,
        'type', t.type,
        'severity', t.severity,
        'title', t.title,
        'description', t.description,
        'targetEmail', t.target_email,
        'ip', t.ip,
        'location', t.location,
        'timestamp', t.detected_at,
        'status', t.status,
        'resolutionNote', t.resolution_note
      ) order by t.detected_at desc), '[]'::jsonb)
      from timber.security_threats t
    ),
    'policy', jsonb_build_object(
      'allowedDomains', coalesce(to_jsonb(pol.allowed_domains), '[]'::jsonb),
      'restrictToAllowedDomains', coalesce(pol.restrict_to_allowed_domains, true),
      'whitelistedEmails', coalesce(pol.whitelisted_emails, '[]'::jsonb),
      'sessionTimeoutMinutes', coalesce(pol.session_timeout_minutes, 720),
      'maxFailedAttemptsBeforeLock', coalesce(pol.max_failed_attempts_before_lock, 5),
      'notifyOnNewDevice', coalesce(pol.notify_on_new_device, true),
      'requireAdminMFA', coalesce(pol.require_admin_mfa, true)
    ),
    'suspensions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'userId', su.user_id,
        'userName', su.user_name,
        'userEmail', su.user_email,
        'role', su.role,
        'suspendedAt', su.suspended_at,
        'suspendedBy', su.suspended_by,
        'reason', su.reason,
        'previousStatus', su.previous_status
      ) order by su.suspended_at desc), '[]'::jsonb)
      from timber.security_suspensions su
    )
  );
end $$;

-- 7. RPC: security_mutate(action, request_id)
create or replace function public.security_mutate(action jsonb, request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p timber.profiles;
  act_type text := action->>'type';
  target_id uuid;
  target_user timber.profiles;
begin
  select * into p from timber.profiles where id = auth.uid();
  if p.status is distinct from 'active' or p.role not in ('Administrator', 'Inventory Custodian') then
    raise exception 'Approved administrator or custodian membership required.';
  end if;

  if act_type = 'revoke-session' then
    update timber.security_sessions
    set status = 'revoked'
    where id = action->>'sessionId';

  elsif act_type = 'revoke-all-other-sessions' then
    update timber.security_sessions
    set status = 'revoked'
    where user_id = auth.uid() and id <> (action->>'currentSessionId');

  elsif act_type = 'resolve-threat' then
    update timber.security_threats
    set status = 'resolved',
        resolution_note = coalesce(action->>'resolutionNote', 'Resolved by administrator')
    where id = action->>'threatId';

  elsif act_type = 'dismiss-threat' then
    update timber.security_threats
    set status = 'dismissed'
    where id = action->>'threatId';

  elsif act_type = 'suspend-account' then
    if p.role <> 'Administrator' then raise exception 'Administrator access required to suspend accounts.'; end if;
    target_id := nullif(action->>'userId', '')::uuid;
    if target_id is null then raise exception 'Valid member UUID required.'; end if;

    select * into target_user from timber.profiles where id = target_id;
    if not found then raise exception 'Member profile not found.'; end if;
    if target_user.id = p.id then raise exception 'Cannot suspend your own administrator account.'; end if;

    -- Update profile status to suspended
    update timber.profiles set status = 'suspended' where id = target_id;

    -- Invalidate all active sessions for this user
    update timber.security_sessions set status = 'revoked' where user_id = target_id;

    -- Record in suspensions table
    insert into timber.security_suspensions (user_id, user_name, user_email, role, suspended_at, suspended_by, reason, previous_status)
    values (
      target_id,
      coalesce(nullif(action->>'userName', ''), target_user.name),
      coalesce(nullif(action->>'userEmail', ''), (select email from auth.users where id = target_id), target_user.name),
      coalesce(nullif(action->>'role', ''), target_user.role),
      now(),
      p.name,
      coalesce(nullif(action->>'reason', ''), 'Suspended by administrator'),
      coalesce(target_user.status, 'active')
    )
    on conflict(user_id) do update set
      suspended_at = now(),
      suspended_by = excluded.suspended_by,
      reason = excluded.reason;

  elsif act_type = 'reactivate-account' then
    if p.role <> 'Administrator' then raise exception 'Administrator access required to reactivate accounts.'; end if;
    target_id := nullif(action->>'userId', '')::uuid;
    if target_id is null then raise exception 'Valid member UUID required.'; end if;

    update timber.profiles set status = 'active' where id = target_id;
    delete from timber.security_suspensions where user_id = target_id;

  elsif act_type = 'update-policy' then
    if p.role <> 'Administrator' then raise exception 'Administrator access required to modify security policies.'; end if;
    update timber.security_policies
    set restrict_to_allowed_domains = coalesce((action->'patch'->>'restrictToAllowedDomains')::boolean, restrict_to_allowed_domains),
        session_timeout_minutes = coalesce((action->'patch'->>'sessionTimeoutMinutes')::integer, session_timeout_minutes),
        max_failed_attempts_before_lock = coalesce((action->'patch'->>'maxFailedAttemptsBeforeLock')::integer, max_failed_attempts_before_lock),
        notify_on_new_device = coalesce((action->'patch'->>'notifyOnNewDevice')::boolean, notify_on_new_device),
        require_admin_mfa = coalesce((action->'patch'->>'requireAdminMFA')::boolean, require_admin_mfa)
    where id = 'primary';

  elsif act_type = 'add-allowed-domain' then
    if p.role <> 'Administrator' then raise exception 'Administrator access required.'; end if;
    update timber.security_policies
    set allowed_domains = array_append(allowed_domains, trim(action->>'domain'))
    where id = 'primary' and not (allowed_domains @> array[trim(action->>'domain')]);

  elsif act_type = 'remove-allowed-domain' then
    if p.role <> 'Administrator' then raise exception 'Administrator access required.'; end if;
    update timber.security_policies
    set allowed_domains = array_remove(allowed_domains, trim(action->>'domain'))
    where id = 'primary';

  elsif act_type = 'add-authorized-email' then
    if p.role <> 'Administrator' then raise exception 'Administrator access required.'; end if;
    update timber.security_policies
    set whitelisted_emails = whitelisted_emails || jsonb_build_array(jsonb_build_object(
      'email', trim(lower(action->>'email')),
      'addedBy', p.name,
      'addedAt', now(),
      'note', coalesce(action->>'note', 'Authorized external personnel')
    ))
    where id = 'primary';

  elsif act_type = 'remove-authorized-email' then
    if p.role <> 'Administrator' then raise exception 'Administrator access required.'; end if;
    update timber.security_policies
    set whitelisted_emails = (
      select coalesce(jsonb_agg(elem), '[]'::jsonb)
      from jsonb_array_elements(whitelisted_emails) elem
      where elem->>'email' <> trim(lower(action->>'email'))
    )
    where id = 'primary';

  else
    raise exception 'Unknown security mutation type: %', act_type;
  end if;
end $$;

-- 8. Execution Grants
grant execute on function public.security_snapshot() to authenticated;
grant execute on function public.security_mutate(jsonb, uuid) to authenticated;

commit;
