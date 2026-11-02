# Shared computer controls

Apply `supabase/migrations/202611020001_workspace_computer_mode.sql` in the Supabase SQL editor before deploying this frontend. This migration depends on the existing operator MFA migration. It preserves trusted authenticators and fresh verification for sensitive actions.

Shared computer is the default for each new sign-in session: five minutes without interaction locks the workspace. Turning it off selects personal computer mode, with a thirty-minute inactivity window. The choice lives in the server-side MFA lease and survives reloads within that sign-in session. New sessions default to shared mode. An eight-hour verification ceiling applies to both modes, including continuous activity.

The computer security control appears in Account settings under Workspace security. A prominent dark-green, dismissible first-use reminder links directly to those settings and explains the choice; only its dismissal is stored locally. If local storage is unavailable, the reminder can reappear. Mode changes require an unlocked workspace and are recorded in MFA events. A toggle cannot reopen an expired or manually locked lease. Other tabs receive changes, and visible tabs reload the authoritative setting from the server.

Routine releases, returns, and incident reports retain their existing unlocked-workspace checks. Permanent purges and access/security changes retain fresh action-bound authenticator checks. The timer measures browser interaction, not physical presence: users must manually lock when leaving a shared PC. Backend leases enforce expiry but cannot independently prove human activity.

Validation: run the WorkspaceGuard tests, production build, and `supabase/tests/workspace-computer-mode.sql` against a local test database with the existing auth test fixture and migrations. Never run test fixtures on production.
