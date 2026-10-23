# Timber inventory workspace — showcase MVP

An inventory-only prototype for a student publication, built with React, TypeScript, Vite, Tailwind CSS, React Router, Lucide icons, Zod, and Vitest. The dark-green design is retained.

## Run locally

Use Node.js 22.12+ and npm:

```powershell
cd frontend
npm ci
npm run dev
```

Open the address printed by Vite. No API keys or environment variables are needed.

```powershell
npm run build
npm run lint
npm test
npm run preview
```

## Three screens

- **Overview:** equipment availability, active loans, overdue returns, incident counts, and inventory activity. Jump directly to a return or equipment registration from the dashboard.
- **Equipment:** search/filter, register/edit equipment, check out to a borrower, record returns and condition, and inspect transaction history. Borrower and return dates appear directly in the table where permitted.
- **Incident reviews:** report missing/damaged equipment, document an outcome, and update availability. Reports do not presume blame.

Assignments, contribution reviews, merit points, workload analytics, and the staff directory are no longer part of the application. Old module URLs redirect to the overview.

## Short showcase

1. Start as Alex Rivera (Administrator), or select Leo Cruz (Inventory Custodian).
2. Open Equipment and check out Sony a6400 to Sam Reyes with a future return date and condition notes.
3. Open its history, or return to Overview and select Return beside the loan.
4. Record Good condition to make the equipment available, or Damaged to open an incident review.
5. In Incident reviews, resolve the issue with a documented outcome and updated condition.
6. Switch to Sam Reyes (Staff) to inspect only their relevant loan and incident details. Reload to verify persistence.

Admins and custodians manage equipment. Staff browse availability and their own loan histories, and can report incidents for equipment currently borrowed by them. Borrower names/departments remain for checkout identification; there is no separate staff-management workflow.

## Local persistence and upgrade

Data is fictional and browser-local under `timber-inventory-demo-v2`. On first use, the app imports inventory, borrower profiles, loans, incidents, and equipment activity from an existing `timber-publication-demo-v1` snapshot if present. Former editors become ordinary Staff for inventory access. Saved equipment and return dates are retained. The old snapshot remains untouched; new state omits assignment, contribution, and merit data. Existing v2 state takes precedence.

Malformed/incompatible saved data resets with a notice. If storage is blocked/full, changes remain in memory and a warning appears. Use one browser tab for a demonstration; devices and tabs do not synchronize.

This is a demo, not real authentication or production authorization. The persona selector only simulates role views. Browser storage and local histories can be edited by anyone with access to the browser. Do not store confidential records.

## Implementation and checks

`src/demo/model.ts` contains inventory models, migration, pure workflow transitions, visibility selectors, and persistence helpers. The provider manages the local session. UI actions use these shared transitions.

Tests cover double checkout, repeated returns, invalid dates, asset-tag uniqueness, role restrictions, incident outcomes, migration preservation, storage recovery, scoped views, and direct inventory shortcuts. Build and lint are included in the verification workflow.

Browser layout and keyboard verification remain unverified in this session because local-preview browser access was previously declined.

## Hosting and next steps

Vercel: Root Directory `frontend`, Framework Vite, Build Command `npm run build`, Output Directory `dist`. The included rewrite configuration supports client routes. No external deployment is created here.

Future production work: Supabase Google OAuth, approved membership, database migrations, RLS, transactional checkout/return operations, and recovery procedures. Bulk supplies and partial returns remain outside this individually tracked equipment prototype.
