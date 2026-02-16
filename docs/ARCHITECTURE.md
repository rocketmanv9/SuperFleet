# Super Fleet Architecture

## Frontend

- Entrypoint: `src/main.jsx`
- App orchestrator: `src/App.jsx`
- Routing model: tab/state-driven UI (no react-router yet)

### Main UI Areas

- Auth: `src/pages/AuthPage.jsx`
- Dashboard tabs: status, maintenance, insights
- Organization management: selector + org page
- Account page
- Templates page

## Data Layer

- Supabase client: `src/lib/supabaseClient.js`
- RPC + table query mix in `App.jsx`
- Vehicle data mapper: `src/lib/vehicles.js`

## Backend (Supabase/Postgres)

Key tables:

- `organizations`
- `organization_members`
- `organization_invitations`
- `vehicles`
- `maintenance_items`
- `maintenance_logs`
- `fuel_logs`
- `vehicle_templates`
- `template_tasks`

Key behavior:

- RLS policies enforce org membership access
- Triggers/functions support template cloning and due-date maintenance logic
- Invitation acceptance via RPC

## Known structural constraints

- `src/App.jsx` is monolithic and owns most app state and mutations.
- Some SQL is in `Schema.sql` while migration coverage appears partial; this should be reconciled.
