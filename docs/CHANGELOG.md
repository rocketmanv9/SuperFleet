# Changelog

## 2026-02-15

### Infrastructure / Stability
- Ran fresh `npm install` to resolve missing Rollup optional dependency (`@rollup/rollup-linux-x64-gnu`) in WSL.
- Verified `npm run build` now succeeds.

### Feature: Template creation
- Implemented functional template creation in `src/pages/TemplatesPage.jsx`.
- Added input validation and submission error handling.
- Added slug generation for new templates.
- Wired `onCreateTemplate` callback from `src/App.jsx` to insert into `vehicle_templates` and refresh template list.
- Added success toast and duplicate-slug handling.

### Documentation
- Replaced default Vite README with project-specific docs.
- Added `docs/ARCHITECTURE.md`.
