# Timber publication workspace — showcase MVP

An interactive React + TypeScript prototype for equipment accountability, editorial assignments, and fair contribution recognition. Uses Vite, Tailwind CSS, React Router, Lucide icons, Zod validation, and Vitest.

## Run locally

Use Node.js 22.12+ and npm. From this repository:

```powershell
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite. No environment variables, accounts, API keys, or Supabase project are required.

```powershell
npm run build
npm run lint
npm test
npm run preview
```

## Five-minute showcase

1. Start as **Alex Rivera — Administrator**. Review the overview and open Equipment.
2. Check out **Sony a6400** to **Sam Reyes**, using a future return deadline and a recorded condition. Open its history, then return it in Good condition.
3. In Assignments, create an Editorial task for Sam. Include a description, deliverable, future deadline, effort, and agreed points.
4. Use the top-right demo persona selector to switch to **Sam Reyes — Staff**. Open the task details to start work, then submit `https://example.com/showcase` with notes.
5. Switch to **Maya Santos — Department Editor**. Open Contribution review and approve the submission. Contributions now includes the output and one merit award. The overview updates immediately.
6. Optionally demonstrate a revision request, an approved academic excuse, or a damaged equipment return followed by incident resolution.
7. Reload: records and their original dates remain. The demo starts as Administrator again. Reset demo data in the sidebar restores fictional samples after confirmation.

## Personas and intended access

- Alex Rivera: administrator; all workflow management.
- Maya Santos: editor for Editorial; departmental assignments and review.
- Leo Cruz: custodian; equipment and incident management, plus own staff records.
- Sam Reyes: staff; own Editorial assignments, submissions, points, and relevant borrowing.
- Isabel Flores, Noah Garcia, Bea Ramos, Eli Mendoza: additional fictional staff available in the switcher.

Editors and administrators cannot verify their own work. Staff with no assignments are identified as **No assignments recorded**, never automatically labeled inactive. Merit values are agreed at assignment creation. Defaults are Article 10, Photography 8, Layout 12, Editing 6, and Administration 4; they are centralized in the demo model. No automatic penalties or public rankings exist.

## Persistence and limitations

All data is fictional, stored under `timber-publication-demo-v1` in this browser's localStorage. Invalid or incompatible records reset with a notice. When storage is blocked or full, the app continues in memory and displays a warning. Reset replaces records with fresh sample dates. Multiple tabs and devices are not synchronized; use one tab for a showcase.

**This is not an operational or secure system.** Persona controls only demonstrate intended access. All data is accessible through developer tools. Local histories are editable and are not tamper-resistant audit logs. Never enter real student, personnel, or confidential publication information. Submitted output links are demonstrations, not file uploads or hosted documents.

Equipment is individually tracked; bulk supplies and partial returns are deferred. Automated review thresholds, disciplinary processes, exports, notifications, and membership administration are outside this milestone.

## Architecture

`src/demo/model.ts` defines validated data shapes, seed data, access selectors, pure workflow transitions, and persistence helpers. `src/demo/Provider.tsx` owns the session and persisted state. Pages use the provider instead of directly accessing storage. Shared UI uses native form validation and native modal dialogs. The app presents immediate local operations without fake loading delays; initial HTML has a loading fallback.

## Vercel preparation

Import the repository with **Root Directory: frontend**, Framework: Vite, Build Command: `npm run build`, and Output Directory: `dist`. The included `vercel.json` routes extensionless client paths to the SPA while retaining static assets. No external deployment was created in this milestone.

## Verification

Focused automated tests cover checkout and return conflicts, incident resolution, invalid deadlines, role boundaries, contribution review and resubmission, duplicate merit, self-verification, excuses, unsafe URLs, persistence, corruption recovery, and storage errors.

Browser visual, mobile, keyboard, and end-to-end walkthrough verification could not be completed in the implementation session because permission to open the local preview was declined. Before presenting, run the walkthrough above and check the layout at desktop and mobile widths, Escape/Tab behavior in dialogs, required-field feedback, and reload/reset behavior.

## Next milestone

Replace the demo adapter with Supabase migrations, Google OAuth, approved membership, scoped RLS, and transactional server-side workflows. Add authorization and concurrency tests before storing real records. Configure recovery and production hosting separately.
