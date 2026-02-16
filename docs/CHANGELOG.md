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

### Feature: Maintenance completion reliability (in progress cycle)
- Updated maintenance log submit flow to prefer backend RPC `mark_task_complete` for atomic completion + due recalculation.
- Added dual fallback insert paths for schema compatibility across deployments:
  - standard columns (`mileage`, `cost`, `time_spent_hours`, `completed_at`)
  - legacy/custom columns (`completion_mileage`, `total_cost`, `labor_hours`, `performed_at`)
- After completion, app now closes modal and refreshes maintenance, reminders, and vehicles for more reliable UI state.

### Feature: Invitation management controls
- Added sent-invitations view for organization owner/admin users.
- Added copy-token action for sharing invite tokens directly.
- Added revoke invitation action with RPC-first (`revoke_invitation`) and table-update fallback.

### Feature: Vehicle library usability upgrade
- Added vehicle search (name/make/model/VIN/year).
- Added sort controls (name, highest mileage, lowest mileage).
- Empty-state messaging now distinguishes "no vehicles" vs "no search matches".
