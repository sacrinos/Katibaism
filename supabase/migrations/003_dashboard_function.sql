-- Katibaism — dashboard aggregation helper
-- Run after 001_schema.sql

create or replace function public.katibaism_dashboard_stats()
returns jsonb
language sql
stable
as $$
  with analysed_bills as (
    select id, slug, title, summary, created_at, status
    from public.bills
    where status = 'analysed'
    order by created_at desc
  ),
  finding_rows as (
    select f.*
    from public.findings f
    join analysed_bills b on b.id = f.bill_id
  ),
  citation_counts as (
    select
      citation ->> 'citation' as citation,
      count(*)::int as count
    from finding_rows f
    cross join lateral jsonb_array_elements(f.citations) as citation
    where citation ? 'citation'
    group by citation ->> 'citation'
    order by count desc
    limit 6
  ),
  high_risk as (
    select count(distinct clause_id)::int as high_risk_clauses
    from finding_rows
    where severity in ('critical', 'high')
  )
  select jsonb_build_object(
    'billsAnalysed', (select count(*)::int from analysed_bills),
    'criticalFindings', (select count(*)::int from finding_rows where severity = 'critical'),
    'highRiskClauses', (select high_risk_clauses from high_risk),
    'topArticles', coalesce(
      (select jsonb_agg(jsonb_build_object('citation', citation, 'count', count)) from citation_counts),
      '[]'::jsonb
    ),
    'recent', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'slug', slug,
            'title', title,
            'summary', summary,
            'createdAt', to_char(created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
            'status', status
          )
          order by created_at desc
        )
        from (select * from analysed_bills limit 12) recent_bills
      ),
      '[]'::jsonb
    )
  );
$$;

grant execute on function public.katibaism_dashboard_stats() to service_role;
