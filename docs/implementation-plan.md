# Inventory implementation plan

Status: planned, not implemented. This replaces the earlier borrowing-only terminology proposal.

## Current baseline

The showcase is inventory-only: equipment catalog, release and return records, usage history, incident review, and a dashboard. Preserve the dark-green interface and existing equipment records. Assignment tracking, contribution approval, and merit scoring remain out of scope.

## Phase 1 — Equipment use types and simpler terminology

### One workflow, three types

Use **Equipment use** as the umbrella term. One **Record equipment release** form contains a required **Use type** selector:

| Type | Meaning | Responsible person |
| --- | --- | --- |
| Publication use | Official event coverage or other publication work, including layout and office work | Selected publication member |
| Member borrowing | A member borrows equipment outside official publication work | Selected borrowing member |
| External borrowing | A non-member borrows equipment | Named external borrower, recorded by a custodian or administrator |

Classify by purpose and affiliation, not simply whether an event exists. Equipment lent to an outsider for their event is external borrowing. Recording responsibility does not automatically establish fault for loss or damage.

Do not introduce three separate pages, event management, reservations, or a new approval process. Administrators and custodians record releases and returns; staff retain read-only access to permitted records and existing incident-reporting capabilities. External borrowers do not receive accounts or access to the app in this increment.

### Labels and navigation

| Existing label | Replacement |
| --- | --- |
| Active loans / Borrowed items | Equipment in use |
| My active loans | Equipment in my care |
| Loan history / Borrowing history | Usage history |
| Check out / Borrow item | Record equipment release |
| Return (action) | Record return |
| Overdue loans | Overdue returns |
| On loan | In use |
| Loan records / loan context | Usage records / usage details |

Apply labels to dashboard cards, filters, tables, dialogs, empty states, accessible names, activity messages, and documentation. Add a use-type filter alongside status/search. Retain one equipment catalog and one history view. Count active releases across all three types; completed returns are excluded.

### Conditional form fields

- All releases: equipment, use type, purpose (required, trimmed, 1–200 characters), expected return date/time, and release condition. Keep current date/availability validation and one-active-release-per-asset rule.
- Publication use: responsible member and a purpose label of **Event / publication purpose**, e.g. “University sports festival — photo coverage.”
- Member borrowing: borrowing member and **Purpose**.
- External borrowing: borrower name (required, 1–120 characters), organization/affiliation (optional, up to 160 characters), contact method (email or phone), contact value (required, up to 160 characters), and purpose. Validate email syntax or a phone with 7–15 digits allowing common separators. Never collect identification-document images for this increment.
- Show only the fields for the selected type. Switching types must not submit stale hidden member/external details.
- Record the issuing staff member separately from the responsible member or external borrower. In production derive the issuing actor from the authenticated session; do not accept a caller-supplied actor identity.
- Returns retain purpose, use type, responsible person, and original release condition, then add returned-at time, receiving staff member, and return condition. Adverse conditions continue to open an incident review.

### Data and compatibility

- Model new releases as a discriminated union: `publication_use` and `member_borrowing` require `borrowerId`; `external_borrowing` requires an external borrower snapshot and has no fabricated member ID. Add `purpose`, `issuedBy`, and `receivedBy` where applicable.
- Store the external name/affiliation/contact snapshot on the release initially; a separate external-person directory is unnecessary. In the production schema, isolate contact fields behind staff-only access rather than granting them to member-facing queries or logs.
- Retain internal collection/action names and existing loan query values where possible to avoid gratuitous renaming. Add use-type query filtering without breaking existing URLs.
- Introduce version 3 local state under `timber-inventory-demo-v3`, importing v2 or legacy v1 inventory through an explicit migration. Keep the old snapshots untouched. Preserve IDs, equipment, borrower references, timestamps, incidents, and inventory events.
- Do not infer historical use type, purpose, issuer, or receiver when unavailable. Show “Not recorded” and offer an **Unspecified legacy use** filter. Do not silently classify past coverage as member borrowing.
- Add realistic use types and fictional external details to fresh seed data only. Production must not import demo records as verified history.
- Display type and purpose next to responsible person and expected return in equipment rows, dashboard follow-ups, and history. External contact details appear only to administrators/custodians in release details, never in public availability, activity summaries, or member views.

## Phase 2 — Protected audit history

### Meaning of “untouchable”

Implement append-only audit logs that cannot be edited, deleted, or fabricated by application users, including application administrators. This protection requires authenticated server/database enforcement. Browser-local records cannot provide it and must remain explicitly labeled as demo activity.

Do not promise absolute immutability: database/project owners can change database controls, and privileged service credentials bypass RLS. If protection against infrastructure owners is later required, add an independently controlled, write-once external archive with a defined retention policy. A hash chain in the same editable database alone is insufficient. This stronger archive is not part of the initial audit milestone.

### Events and contents

Capture equipment creation/edits/archiving, releases, returns, condition changes, incident reports/resolutions, corrections, and role/access changes once those features exist. Do not add unrelated administrative features solely for logging.

Each event records:

- Database-generated ID, database timestamp (UTC), authenticated actor ID, and actor role at the time.
- Action, entity type/ID, and transaction/request correlation ID.
- Whitelisted before/after fields or changed values, plus a human-readable summary.
- A required reason for corrections and sensitive adjustments; corrections link to the original event/record.

Keep actor IDs distinct from borrowers. Do not accept browser time, role, or persona selection as audit evidence. Do not record tokens, secrets, full external contact details, or unrestricted database row snapshots. Historical actor references must survive account deactivation without cascade deletion.

### Server enforcement

- Implement after the Supabase Auth, approved membership, and inventory schema foundation. Use PostgreSQL transactions for each business operation and its audit event; if audit insertion fails, roll back the business change.
- Prefer controlled RPCs for release/return/correction operations and database row triggers to ensure ordinary allowed mutations also produce audit events. Define one writer per event to avoid double logging. These are row-level data-change triggers, not DDL event triggers.
- Revoke direct INSERT, UPDATE, DELETE, and TRUNCATE on the audit table from application roles. Provide scoped SELECT access through explicit grants and RLS; no application administrator gets a delete/edit policy or generic audit-insert RPC.
- Harden privileged trigger/functions with a fixed search path, qualified objects, narrowly granted execution, explicit actor authorization, and no client service-role key. Reject unauthenticated business writes; identify exceptional trusted maintenance actions separately.
- Prevent application roles from replacing triggers/functions or bypassing controlled writes. Treat migrations and database-owner operations as infrastructure administration outside the application's immutability boundary.
- Use idempotency keys for release/return retries so the same request cannot create duplicate business changes or misleading duplicate success events.
- Do not hard-delete inventory/usage records through the application. Archive equipment and append reasoned corrections while retaining the original audit entry. No routine log purge or retention deletion is included in this milestone.
- Store denied requests/errors separately if operational security logging is added; a transaction that rolls back must not appear as a successful inventory event.

### Visibility without extra member work

- Keep a read-only per-item timeline in Usage history. Add an administrator/custodian **Activity log** view with search, pagination, and filters for date, action, equipment, actor, and use type. Newest first with stable timestamp/ID ordering.
- Staff may see permitted events concerning their own usage, not organization-wide administrative activity or other borrowers' details. Enforce this on the server; hiding interface controls is insufficient.
- Each entry answers: who performed the action, what changed, which equipment/usage record it concerns, when it happened, and why a correction was made.
- Logs are automatic; members never have to fill in a separate logging form. Existing local demo activity remains available but is not represented as protected historical evidence.

## Delivery order

1. Implement the shared release form, three use types, vocabulary, scoped detail displays, filters, seed data, and non-destructive v3 migration in the prototype.
2. Establish Supabase authentication, approved roles, inventory/usage schema, RLS, and transactional operations; replace simulated identities and local persistence for production.
3. Implement protected audit writers and access controls together with the production mutations. Add the read-only activity view and correction workflow. Do not release real operational writes before audit enforcement is verified.
4. Verify recovery/backups and the documented database-owner limitation before accepting real organizational data. Keep Vercel/Supabase architecture; no permanent Express server is needed.

## Verification and acceptance

- Complete release → return for each use type; verify correct conditional fields, purpose retention, dashboard counts, history, and filtering after reload.
- Reject missing purpose, invalid contact data, invalid member references, duplicate active releases, unauthorized changes, and invalid return dates. Ensure stale hidden form fields are discarded.
- Preserve v1/v2 data through migration with unspecified historical context, and verify existing URLs. Test corruption/storage failure handling without claiming local tamper protection.
- Verify external contact privacy, member history scope, and admin/custodian access. Include direct API tests, not only screen tests.
- Verify every audited mutation produces exactly the intended event, timestamps/actors are server-generated, and retries are idempotent. Force an audit write failure and assert the associated mutation rolls back.
- Attempt direct audit insert/update/delete/truncate and actor spoofing as anonymous, staff, custodian, and application administrator. All prohibited operations must fail.
- Verify corrections append evidence without modifying the original event and account deactivation/archiving does not erase history.
- Test activity filters, pagination, ties in timestamps, and empty views. Run build, lint, and relevant automated tests; verify mobile and keyboard behavior when browser access is available.

Acceptance: publication use, member borrowing, and external borrowing are clearly distinguished within one simple workflow. Equipment history remains intact, members do no extra logging work, and production changes have protected, attributable audit evidence with honest limits on infrastructure-owner access.

## Technical references

- Supabase RLS and privileged-role boundaries: https://supabase.com/docs/guides/database/postgres/row-level-security
- Server-secret handling: https://supabase.com/docs/guides/database/secure-data
- Supabase Auth audit logs cover authentication events and do not replace the application's inventory audit trail: https://supabase.com/docs/guides/auth/audit-logs
