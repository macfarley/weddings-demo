# Supabase CLI Migrations

This project is configured for migration-first Supabase workflows using the CLI.

## One-time setup

1. Copy env template and fill in your values locally:

```bash
cp .env.example .env.local
```

2. Authenticate CLI (recommended via token env var):

```bash
export SUPABASE_ACCESS_TOKEN="<YOUR_SUPABASE_ACCESS_TOKEN>"
```

Or use browser login:

```bash
npm run supabase -- login
```

3. Link this repo to your hosted Supabase project:

```bash
npm run supabase -- link --project-ref <YOUR_PROJECT_REF>
```

3. (Optional but recommended) Pull current remote schema as baseline before new changes:

```bash
npm run db:pull
```

## Migration workflow

### Create a new migration file

```bash
npm run db:migration:new -- add_guestbook_indexes
```

This creates a timestamped SQL file in `supabase/migrations/`.

### Apply migrations to remote project

```bash
npm run db:push
```

### Reset local database and re-run migrations

```bash
npm run db:reset
```

## Local Supabase stack (optional)

```bash
npm run db:start
npm run db:stop
```

## Current migration files

- `supabase/migrations/20260226223000_initial_setup.sql`

## Notes

- `service_role` keys should remain server-side only.
- Browser/client code should use only the anon/public key.
