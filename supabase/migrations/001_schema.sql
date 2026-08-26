-- Katibaism — initial Postgres schema
-- Run in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- Project: https://qjbajqdmehqmrgqmowkf.supabase.co

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Bills
-- ---------------------------------------------------------------------------
create table if not exists public.bills (
  id text primary key,
  slug text not null unique,
  title text not null,
  bill_number text,
  year text,
  house text,
  sponsor text,
  source_url text,
  input_method text not null check (input_method in ('upload', 'paste', 'url', 'sample')),
  original_filename text,
  raw_text text not null,
  explanatory_memorandum text,
  clauses jsonb not null default '[]'::jsonb,
  classification jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  versions jsonb not null default '{}'::jsonb,
  status text not null default 'parsed' check (status in ('uploaded', 'parsed', 'analysed', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bills_status_idx on public.bills (status);
create index if not exists bills_created_at_idx on public.bills (created_at desc);
create index if not exists bills_slug_idx on public.bills (slug);

-- ---------------------------------------------------------------------------
-- Findings (normalized for dashboard queries and feedback updates)
-- ---------------------------------------------------------------------------
create table if not exists public.findings (
  id text primary key,
  bill_id text not null references public.bills (id) on delete cascade,
  clause_id text not null,
  clause_number text not null,
  clause_text text not null,
  issue_type text not null,
  title text not null,
  what_it_does text not null,
  why_it_matters text not null,
  citizen_explanation text not null,
  legal_explanation text not null,
  counterargument text not null,
  what_to_investigate text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  confidence_score numeric(5, 2) not null default 0,
  provision_ids jsonb not null default '[]'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  triggering_language jsonb not null default '[]'::jsonb,
  concepts jsonb not null default '[]'::jsonb,
  rules_triggered jsonb not null default '[]'::jsonb,
  why_flagged jsonb not null default '{}'::jsonb,
  human_review_recommended boolean not null default false,
  feedback jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists findings_bill_id_idx on public.findings (bill_id);
create index if not exists findings_severity_idx on public.findings (severity);
create index if not exists findings_bill_clause_idx on public.findings (bill_id, clause_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bills_set_updated_at on public.bills;
create trigger bills_set_updated_at
before update on public.bills
for each row execute function public.set_updated_at();

drop trigger if exists findings_set_updated_at on public.findings;
create trigger findings_set_updated_at
before update on public.findings
for each row execute function public.set_updated_at();
