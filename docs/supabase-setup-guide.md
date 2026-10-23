# Supabase setup guide for Timber

Prepared October 24, 2026. This is a setup and implementation guide, not a claim that Supabase is already connected. The current application still uses demo identities and browser-local data.

## 1. What Supabase will do

- PostgreSQL stores equipment, releases, borrowers, incidents, and audit records.
- Supabase Auth handles Google sign-in and sessions.
- Row Level Security (RLS) determines which database records each signed-in person may access.
- Database functions perform release/return operations atomically and create protected audit entries.
- Vercel continues to serve the React frontend. We do not need an Express server or VPS.

Signing into Google proves identity; it does not automatically grant membership or administrator privileges.

## 2. What you do, and what Codex can do

| You handle | Codex can handle in this repository |
| --- | --- |
| Sign into Supabase and create the hosted project | Install/configure the SDK and CLI |
| Choose your organization, plan, region, and save the database password privately | Write versioned SQL migrations, constraints, indexes, RLS, and transactional functions |
| Sign into Google Cloud and create the OAuth app | Replace mock login, connect session/profile loading, and add asynchronous forms |
| Enter private OAuth credentials in the Supabase dashboard | Implement inventory workflows and append-only audit logging |
| Complete account verification, consent, or billing steps if presented | Test roles, concurrency, retries, migration behavior, and audit protections |
| Authenticate the CLI locally when prompted | Inspect pending migrations and apply them to the intended development project once authorized |

I can automate the code and database deployment workflow after account setup. I cannot silently create accounts or complete your sign-in. For now, complete Step 3; the remaining steps describe how we will finish together.

## 3. Create your development project first

1. Open https://supabase.com/dashboard and sign in or create an account.
2. Create/select an organization. Choose the free plan if available and appropriate for your development project; review the dashboard's actual limits rather than assuming unlimited hosting.
3. Create a project named `timber-inventory-dev`.
4. Generate a strong database password and save it privately in a password manager. Do not put it in chat or React environment variables.
5. Choose a region close to your users in the Philippines, such as Singapore if offered.
6. Wait for project provisioning to complete.
7. Find the **Project URL** and **Publishable key** in the project's Connect dialog or API key settings. The URL usually resembles `https://<project-ref>.supabase.co`; publishable keys begin `sb_publishable_`.
8. Keep the project reference/ID as well; the CLI will use it to identify the deployment target.

**Handoff to Codex:** provide the project URL, publishable key, and project reference, or put the first two in `frontend/.env.local` and say it is ready. These are browser-facing configuration, not administrator credentials. Do not provide the database password, Supabase personal access token, secret/service-role key, or Google client secret in chat.

There is no need to create tables manually. We will define them in migrations so the schema is reproducible and reviewable.

## 4. Frontend configuration

A placeholder file is provided at `frontend/.env.example`. Copy it to `frontend/.env.local` only if that local file does not already exist, and replace the placeholders:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
```

The local file is ignored by Git. These proposed variable names will be used by the upcoming integration; adding them alone does not connect the current app. Restart Vite after updating them.

Everything prefixed `VITE_` can be read in the built browser application. Only the public project URL and publishable key belong here. Actual data protection comes from RLS and server validation, not hiding the publishable key. Never use an `sb_secret_` or legacy service-role key in React.

## 5. Implementation sequence we will automate

### A. Database and permissions

Create `supabase/` at the repository root, with migrations and database tests. Start with:

- `profiles`: authenticated identity mapping, approved membership status, role, and department.
- `inventory_items`: uniquely tagged equipment, condition, and archive status.
- `equipment_releases`: publication use / member borrowing / external borrowing, responsible member or external snapshot, purpose, dates, and issuing/receiving actors.
- Restricted external contact details linked to the release.
- `inventory_incidents`: equipment/release references, report, resolution, and actors.
- `audit_logs`: structured, server-generated action history.

Use one active release per asset, valid timestamps, foreign keys, and transaction-safe release/return functions. Enable RLS and least-privilege grants in the same migrations that introduce exposed tables. No temporary public-write policies.

The initial administrator will be provisioned through a controlled owner-run setup step after the first real sign-in. Nobody can assign themselves a role. Other users remain pending until approved. Existing browser demo records will not be treated as verified production records or silently uploaded.

### B. Real authentication and UI integration

Install the Supabase JavaScript SDK, replace mock Google login/session toggles, and load the authenticated user's approved profile. Provide signed-out, loading, access-pending, approved, and error states. Production must never fall back to the demo administrator when configuration or requests fail.

Make forms await server results, show errors, and prevent duplicate submissions. Retain the existing dark-green interface. Complete the agreed three-use-type release form before committing to a member-only database model.

### C. Audit logging from the start

Write audit entries inside the same database transaction as each business change. Generate identity and timestamps server-side; do not trust browser persona or time. Reject direct log insertion, editing, deletion, and truncation by application users, including application administrators. Corrections append reasoned records.

These logs are protected against application users, not absolutely immutable against database/project owners. Keep sensitive external contact data out of general audit snapshots. There must be no real operational write path that bypasses required logging.

## 6. Configure Google sign-in

Do this when the real auth integration is ready. Current Google buttons are simulations.

1. Open Google Cloud Console: https://console.cloud.google.com/ . Create/select a project for Timber.
2. Configure Google Auth Platform / OAuth consent information: application name, support email, and audience. Use External if your members use ordinary Gmail or multiple domains; Internal is appropriate only when your organization supports it and all intended users belong to that Workspace organization.
3. If the OAuth app is in testing, add the member accounts used for testing as test users.
4. Create an OAuth client with application type **Web application**.
5. In Supabase, open Authentication and the Google provider settings. Copy the exact Supabase callback URL supplied there, typically:
   `https://<project-ref>.supabase.co/auth/v1/callback`
6. Add that callback to Google's **Authorized redirect URIs**. Where an authorized JavaScript origin is required, use the frontend origin, initially `http://localhost:5173`.
7. Enter Google's client ID and client secret into the Supabase Google provider configuration and enable the provider. The client secret stays there, never in frontend code or chat.
8. In Supabase Authentication URL Configuration, initially set the Site URL to `http://localhost:5173` and allow `http://localhost:5173/auth/callback`. The implementation will add this frontend callback route and complete the session there.
9. Use the same hostname and port in the browser and configuration. If you use `127.0.0.1` instead, configure that exact origin/callback as well.

Two redirects serve different purposes:

- **Google → Supabase:** Google's authorized redirect URI is the Supabase `/auth/v1/callback` URL.
- **Supabase → Timber:** the app's `redirectTo` is the allowed frontend `/auth/callback` URL.

Do not interchange them. The current repository does not yet implement `/auth/callback`.

## 7. CLI deployment workflow (later, after migrations exist)

Codex will pin/configure the CLI and establish the root `supabase/` directory. Commands below assume the CLI is installed and callable as `supabase`; an npm-managed installation uses the equivalent package runner. They are a future deployment sequence, not commands to run against the current unconfigured repository.

```powershell
Set-Location D:\Projects\timber-management-system
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase migration list
supabase db push --dry-run
# After reviewing the target and pending migrations:
supabase db push
```

Complete login/token/database-password prompts locally. Do not paste credentials into source files or command arguments. `db push` changes the linked hosted database. Review the project reference and migration contents first. Avoid `db reset --linked`: that is a destructive remote reset, not routine deployment.

A local Supabase stack can be used for repeatable database tests and requires its supported local runtime, commonly Docker. Hosted project setup can happen first; you do not have to master Docker before creating the project. We will choose and verify the local test setup when implementing migrations.

## 8. Verification before real use

- New Google user can authenticate but receives no inventory access until approved.
- Approved staff see only permitted records; custodians/admins can perform their intended operations.
- Simultaneous releases of the same equipment cannot both succeed.
- Retried release/return requests cannot duplicate state changes or audit events.
- An audit-write failure rolls back the inventory mutation.
- Direct log modification and actor spoofing fail, including for application admins.
- External contact details remain restricted; former borrowers do not gain access to unrelated later activity.
- Server errors remain visible in forms and do not show false success.
- Build, lint, frontend tests, and direct database/API permission tests pass.

Keep fictional data during validation. The existing 16 frontend tests are not a substitute for database permission tests.

## 9. Vercel after local integration works

Set Root Directory to `frontend`, add the two public environment variables for the correct environment, and build. Add the actual Vercel HTTPS origin and `/auth/callback` to Supabase redirects; set the production Site URL accordingly. Adjust Google's origins if needed; its redirect remains the Supabase callback for the selected project. Use a deliberate development/production project strategy so testing does not modify real records.

Do not add broad production redirect wildcards simply to fix a callback error. We will verify the deployed URL and configuration together. Review backup/recovery and current hosting limitations before real organizational use.

## 10. Common first-time problems

| Symptom | Check |
| --- | --- |
| Google `redirect_uri_mismatch` | Google's redirect must exactly match the Supabase callback, including scheme/path. |
| Login returns to the wrong host | Supabase Site URL, allowed app callback, and the app's redirectTo must agree. |
| New user sees access pending | Expected until membership approval; do not bypass RLS. |
| Approved user sees no records | Check the profile/auth UUID mapping, status, grants, and RLS policy. |
| Environment change seems ignored | Restart Vite or rebuild the Vercel deployment. |
| Login button only pauses and opens the dashboard | The simulated login has not yet been replaced. |

## Official references

- [API keys and where to find them](https://supabase.com/docs/guides/getting-started/api-keys)
- [Google sign-in configuration](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [CLI setup](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Versioned database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
