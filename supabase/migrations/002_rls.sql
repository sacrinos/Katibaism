-- Katibaism — Row Level Security
-- Run after 001_schema.sql
--
-- The Next.js API uses the service role key server-side only.
-- RLS blocks direct anon/authenticated access via the Data API.
-- Service role bypasses RLS by default.

alter table public.bills enable row level security;
alter table public.findings enable row level security;

-- No policies for anon or authenticated roles.
-- All reads/writes go through Next.js API routes using SUPABASE_SERVICE_ROLE_KEY.

revoke all on table public.bills from anon, authenticated;
revoke all on table public.findings from anon, authenticated;

grant all on table public.bills to service_role;
grant all on table public.findings to service_role;
