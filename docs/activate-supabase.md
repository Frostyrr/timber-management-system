# Activate the hosted inventory database

The frontend is configured locally for project `klxwqnsnrkzgtdspmkrz`. Google credentials belong only in Supabase. The public key cannot install migrations.

1. Open this project in Supabase, choose **SQL Editor**, then **New query**.
2. Copy the entire file `supabase/migrations/202610240001_inventory.sql`, including `begin` and `commit`, into the editor and run it once. This creates a private `timber` schema and three public authenticated RPCs. Do not expose the `timber` schema in API settings. If the query fails, retain the error and do not run fragments separately.
3. Start the frontend from `frontend` with `npm run dev`. Use the localhost port registered in Google and Supabase. Sign in with Google. The first account is pending by design.
4. In Supabase **Authentication → Users**, copy your signed-in account's UUID. In a new SQL Editor query, replace the placeholder below and run:

```sql
begin;
set local timber.reason = 'Initial administrator provisioning by project owner';
update timber.profiles
set role = 'Administrator', status = 'active'
where id = 'YOUR_AUTH_USER_UUID'::uuid
returning id, name, role, status;
commit;
```

Confirm that exactly your account is returned. Click **Check access again** in the application. Later members are approved from Account settings by an administrator.

The live inventory starts empty. Browser demo records are not uploaded. Do not enter real borrower contact details until hosted permission and workflow checks are complete.

Local verification so far: production build; PostgreSQL workflow checks covering retries, double releases, repeated returns, damaged-return incident creation, staff mutation rejection, and denied audit deletion. This does not verify Google OAuth, hosted configuration, concurrent requests, or browser interaction. `supabase/tests/local-auth.sql` is an isolated PostgreSQL test stub—never run it on Supabase. `workflows.sql` likewise uses local test identities and is not a hosted setup script.

Application audit logs are append-only for app users. The project/database owner can alter database protections. Keep privileged credentials outside the frontend.
