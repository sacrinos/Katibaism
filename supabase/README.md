# Katibaism Supabase

Run these in order in the [Supabase SQL Editor](https://supabase.com/dashboard/project/qjbajqdmehqmrgqmowkf/sql):

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_rls.sql`
3. `supabase/migrations/003_dashboard_function.sql`
4. `supabase/migrations/004_fix_confidence_score.sql`

## Enable Postgres storage in the app

Add to `.env.local`:

```bash
KATIBAISM_STORE=postgres
SUPABASE_URL=https://qjbajqdmehqmrgqmowkf.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://qjbajqdmehqmrgqmowkf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Find the service role key under **Project Settings → API**. Use it only on the server — never expose it to the browser.

Restart the dev server after changing env vars.

## Migrate existing JSON bills (optional)

If you already have analyses in `data/runtime/bills/`:

```bash
node scripts/migrate-json-to-postgres.mjs
```

## Schema overview

| Table | Purpose |
|---|---|
| `bills` | Bill metadata, clauses, classification, summary, versions, raw text |
| `findings` | Clause-level constitutional findings, citations, feedback |

The Next.js API uses the **service role** key. RLS is enabled with no public policies, so the Data API cannot read bills directly — all access goes through your API routes.
