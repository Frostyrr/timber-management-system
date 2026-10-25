# Shared components

- `ui/`: reusable controls and display components. Each component has a named file; its public types live alongside it. Loading placeholders compose `Skeleton`.
- `layout/`: page structure, currently `Heading`.
- `ErrorBoundary.tsx`: application error recovery.
- `format.ts`: formatting helpers, not React components.

Import components directly from their files (for example `components/ui/Modal`). Keep component tests beside their implementation. Keep page-specific workflows in pages and backend state outside the shared UI layer.
