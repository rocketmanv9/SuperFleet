# Super Fleet

Super Fleet is a React + Supabase application for managing vehicles, maintenance, fuel logs, and organization/team access.

## What it does

- Auth (Supabase)
- Personal or fleet organization context
- Vehicle CRUD
- Maintenance task tracking + completion logs
- Fuel log tracking + summary stats
- Team invitations by role
- Vehicle templates for reusable maintenance schedules

## Stack

- React 19 + Vite
- Supabase JS client
- Postgres (Supabase) + SQL functions/triggers/policies

## Local development

1. Install dependencies

```bash
npm install
```

2. Add env vars in `.env.local`

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

3. Start dev server

```bash
npm run dev
```

4. Build

```bash
npm run build
```

## Database

- Canonical schema snapshot: `Schema.sql`
- Supabase migration folder: `supabase/migrations/`

## Current branch notes

- Added template creation flow from UI (`TemplatesPage` + `App` handler).
- Dependency issue blocking Rollup build was resolved with a fresh `npm install`.

## Scripts

- `npm run dev` - local dev
- `npm run build` - production build
- `npm run lint` - eslint checks
- `npm run preview` - preview built app
