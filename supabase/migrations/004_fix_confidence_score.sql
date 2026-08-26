-- Fix confidence_score: app stores 0–100 (percent), not 0–1
-- Run in Supabase SQL Editor after 001_schema.sql

alter table public.findings
  alter column confidence_score type numeric(5, 2)
  using confidence_score::numeric(5, 2);
