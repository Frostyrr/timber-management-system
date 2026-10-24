# Reliability fixes and release checklist

## Implemented

- Same-user auth notifications reload server state without unmounting the workspace. Account changes and sign-out clear protected state. Older requests cannot replace newer results.
- Pending, suspended, non-operator, database-upgrade and loading-error states are distinguished. Refresh failures preserve the mounted workspace, display an error, and allow retry. A committed write followed by failed reload reports that it was saved, without repeating the mutation.
- Borrower names resolve against the directory. Audit snapshots return an operator display name, without giving custodians the account list. Historical audit rows are unchanged. Directory changes have their own display descriptions/category. Missing operator identity displays “Unknown operator”; database maintenance displays “System”.
- Default inventory and dashboard totals exclude archived equipment. The Archived equipment filter retains history, uses an Archived badge, and hides edit/release/archive actions. Under review is reserved for unresolved incidents.

## Hosted steps still required

1. Confirm migrations 001, 002 and 003 were applied successfully to the project used by Vercel.
2. Run `supabase/migrations/202610240004_audit_display.sql` in the project's SQL Editor. It updates the snapshot read function, not stored audit records.
3. Deploy the frontend changes.
4. With dedicated fictional records, test administrator and custodian sign-in; register, release, return and archive equipment; verify directory-member/operator attribution; refresh and inspect retained history. Verify an unfinished form survives switching tabs/session refresh. Verify pending and suspended accounts cannot enter the workspace.

Local verification: production build, lint, 35 frontend tests (including live-provider DOM tests), and all five PostgreSQL suites. The Google OAuth round trip and hosted browser walkthrough were not performed. The existing bundle-size warning remains; route splitting is a separate performance task.
