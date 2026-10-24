# Staff directory and system access

Apply `supabase/migrations/202610240003_people_directory.sql` once in the hosted project's SQL Editor, after migrations 001 and 002. Do not rerun earlier migrations if already installed. Then deploy the updated frontend to Vercel.

- `/staff`: administrators and custodians add and edit directory members without Google sign-in. Publication use and member borrowing counts are derived from recorded releases. Archiving preserves history and requires all outstanding equipment to be returned.
- `/access`: administrators approve, assign operator roles, and suspend Google accounts. Custodians cannot grant system access. Only active Administrator or Inventory Custodian accounts can load inventory or mutate records.
- `/settings`: personal account information and sign-out only.

The migration creates `timber.people`, copies existing profiles into directory entries using their existing IDs, and changes borrower/incident subject foreign keys to reference the directory. Existing release IDs, borrower IDs, and operator attribution remain intact. New Google accounts do not automatically become directory members. Add executives and custodians to the directory separately when they need equipment-use records.

Ordinary Staff accounts retain their identity records but lose workspace access; directory membership never grants access. External borrowing continues using the existing external borrower fields.

The upgrade and four local SQL suites were tested on isolated PostgreSQL. The `people-directory.sql` suite checks custodian-created directory members without auth accounts, idempotent saves, release/return history, archive restrictions, administrator-only access changes, and denied Staff access. Frontend build, lint, and tests also pass. Hosted migration execution and signed-in browser acceptance remain to be done.
