# Backend-only inventory

The running application uses Supabase exclusively. Missing configuration disables sign-in; it never opens a sample-data workspace. Inventory records are loaded through `inventory_snapshot` and saved through `inventory_mutate`. Browser storage is used by Supabase for the authentication session, not as the inventory database. Historical sample fixtures under `src/demo/model.ts` exist only for automated tests; no runtime component imports them.

## Required hosted upgrade

The initial migration is already installed. Run **only** `supabase/migrations/202610240002_member_details.sql` once in your project's Supabase SQL Editor. It adds staff titles and supports administrator profile edits and access suspension. Do not rerun the original migration. The upgrade has been tested locally but has not been applied to the hosted project by this agent.

Staff sign in with Google to create a pending profile. Administrators approve membership and assign roles from the application. Custodians can view the directory but cannot edit membership. Suspension retains records and blocks subsequent database operations. Account deletion is not simulated: the UI offers suspension or sign-out instead.

Tables are under the private `timber` schema. Do not expose it through the Data API. To inspect saved equipment as the project owner:

```sql
select id, name, tag, condition, archived from timber.items order by name;
```

## Verification

Run `npm run build`, `npm run lint`, and `npm test` inside `frontend`.
In an isolated PostgreSQL database with the local auth stub and both migrations installed, run `supabase/tests/workflows.sql`, `external-privacy.sql`, and `membership.sql` using `psql -v ON_ERROR_STOP=1`. These tests roll back their fixtures. Do not run the local auth stub or fixture suites against the hosted project.

After applying the hosted upgrade, verify Google sign-in, pending approval, staff editing/suspension, register/release/return equipment, and reload persistence using dedicated fictional test records. Local SQL tests do not replace signed-in browser acceptance testing.
