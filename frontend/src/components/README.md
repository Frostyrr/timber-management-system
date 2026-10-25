# Shared components

- `ui/`: reusable controls and display components. Each component has a named file; its public types live alongside it. Loading placeholders compose `Skeleton`.
- `layout/`: page structure, currently `Heading`.
- `ErrorBoundary.tsx`: application error recovery.
- `format.ts`: formatting helpers, not React components.

Import components directly from their files (for example `components/ui/Modal`). Keep component tests beside their implementation. Keep page-specific workflows in pages and backend state outside the shared UI layer.

## Dropdowns

Use `ui/Select` for fixed-choice dropdowns and filters. Use `ui/SearchableCombobox` when users need to type directly to find a choice; `PositionCombobox` wraps it for staff positions. Both use `ui/dropdownStyles.ts` for menu and option styling. Update those shared styles rather than adding page-specific dropdown designs. Native `<select>` elements are disallowed by lint to prevent visual drift. Provide an accessible label for every dropdown.
