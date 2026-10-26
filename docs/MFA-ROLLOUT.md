# Operator MFA rollout

## What this implements

Google authentication remains the first factor. Approved operators must link an external TOTP authenticator and verify it before accessing inventory or security RPCs. The QR code and manual setup secret exist only in React memory. Supabase verifies codes; Timber never stores OTP values.

Shared workspaces lock after three minutes without pointer, keyboard, or scrolling interaction. Active clients renew a three-minute server lease; an expired lease cannot be renewed without fresh verification. A hard thirty-minute limit requires another verification even during activity. Manual lock invalidates server access and outstanding approvals, and broadcasts the lock to other tabs. Sleep/wake and tab visibility changes recheck authorization. Browser activity is not proof of human identity. Locking cannot retract data already downloaded; use Windows automatic locking too.

Inventory/security RPC wrappers check active operator membership, a live Supabase session, AAL2, the registered factor, and the server lease. First verification binds the account to that factor. Changing the factor through Auth endpoints cannot silently replace Timber's trusted factor. Factor management is intentionally owner-assisted in this release.

Purges are administrator-only. Membership changes, account deletion, purges, and security mutations (except session registration) require a fresh TOTP verification. Authorization expires after sixty seconds and is bound to the exact JSON action and session. It is consumed within the mutation transaction. Bulk purge includes explicit target IDs and fails if a target is no longer archived. Verification timestamps cannot be reused across approvals. SQL rollback also rolls back consumption, allowing a retry of the same failed transaction without authorizing other actions.

## Deployment order

1. Use a staging Supabase project first, with all earlier schema migrations already applied. Do not replay the old archive cleanup migrations against production: they delete data.
2. Enable TOTP enrollment and verification in Supabase Auth MFA settings. Set appropriate Auth rate limits. Keep the Supabase project-owner account protected with its own MFA and recovery method.
3. Apply only `supabase/migrations/202610260002_operator_mfa.sql` after the prior migrations. It immediately blocks old clients from inventory/security access until verification; coordinate a maintenance window. This migration is applied once, not repeatedly.
4. Deploy the matching frontend. Verify the administrator setup, QR/manual-key workflow, phone code verification, and one second administrator before onboarding custodians.
5. Test Google login, invalid code, idle lock, sleep/wake, manual lock, multiple tabs, expiry, network errors, custodian purge rejection, modified target rejection, and successful administrator purge on staging fixtures.
6. Enable the same configuration on production only after the staging acceptance checks and recovery rehearsal.

The initial authenticator enrollment must be performed by the actual operator on a trusted device. Someone controlling the first-factor session before initial setup could otherwise enroll their own phone.

## Lost phone / controlled recovery

There is no public reset endpoint and no bypass code stored in the application. The project owner must verify the person's identity through an independent channel, record the reason, and revoke all of that user's Supabase Auth sessions using the trusted dashboard/admin API. Remove the lost factor using the Auth administrative interface/API; never expose service-role credentials to the frontend.

After confirming sessions are revoked, the owner runs an audited maintenance transaction in SQL Editor to remove this user's rows from `timber.operator_factors`, `timber.mfa_leases`, and `timber.mfa_intents`, and inserts an `owner-assisted recovery: <reason>` entry into `timber.mfa_events`. These tables are not accessible to ordinary authenticated clients. Do not delete inventory/audit history. The operator then signs in with Google and links a new authenticator under supervision. Rehearse this with a staging account before rollout; never remove the only administrator's recovery path.

## Validation and limitations

`supabase/tests/operator-mfa.sql` exercises the gate and transaction authorization with a local Auth-schema fixture. Frontend tests cover setup, code verification, request failures and lock behavior. These do not substitute for a real Google/TOTP flow against the hosted project. No live Auth configuration or migration has been applied by the coding agent.

The implementation reads Supabase's `auth.sessions.factor_id` to bind the verified factor; check hosted compatibility during staging. Built-in Supabase Auth rate limits apply to code attempts. Failed code attempts are in Supabase Auth logs; successful approvals and locks are recorded in `timber.mfa_events`. The public recent-activity feed remains intentionally public and must contain only its existing redacted fields. Reports already exported to disk cannot be locked by this system.
