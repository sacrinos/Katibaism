#!/usr/bin/env node
/**
 * Import existing JSON bill files from data/runtime/bills/ into Supabase Postgres.
 *
 * Prerequisites:
 *   1. Run supabase/migrations/*.sql in the Supabase SQL editor
 *   2. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KATIBAISM_STORE=postgres in .env.local
 *
 * Usage:
 *   node scripts/migrate-json-to-postgres.mjs
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const storeDir = path.join(process.cwd(), "data", "runtime", "bills");

function billToRow(bill) {
  return {
    id: bill.id,
    slug: bill.slug,
    title: bill.title,
    bill_number: bill.billNumber,
    year: bill.year,
    house: bill.house,
    sponsor: bill.sponsor,
    source_url: bill.sourceUrl,
    input_method: bill.inputMethod,
    original_filename: bill.originalFilename,
    raw_text: bill.rawText,
    explanatory_memorandum: bill.explanatoryMemorandum,
    clauses: bill.clauses,
    classification: bill.classification,
    summary: bill.summary,
    versions: bill.versions,
    status: bill.status,
    error: bill.error ?? null,
    created_at: bill.createdAt,
    updated_at: bill.updatedAt,
  };
}

function findingToRow(finding, billId) {
  return {
    id: finding.id,
    bill_id: billId,
    clause_id: finding.clauseId,
    clause_number: finding.clauseNumber,
    clause_text: finding.clauseText,
    issue_type: finding.issueType,
    title: finding.title,
    what_it_does: finding.whatItDoes,
    why_it_matters: finding.whyItMatters,
    citizen_explanation: finding.citizenExplanation,
    legal_explanation: finding.legalExplanation,
    counterargument: finding.counterargument,
    what_to_investigate: finding.whatToInvestigate,
    severity: finding.severity,
    confidence: finding.confidence,
    confidence_score: finding.confidenceScore,
    provision_ids: finding.provisionIds,
    citations: finding.citations,
    triggering_language: finding.triggeringLanguage,
    concepts: finding.concepts,
    rules_triggered: finding.rulesTriggered,
    why_flagged: finding.whyFlagged,
    human_review_recommended: finding.humanReviewRecommended,
    feedback: finding.feedback ?? null,
  };
}

const files = readdirSync(storeDir).filter((f) => f.endsWith(".json"));
console.log(`Found ${files.length} bill file(s) in ${storeDir}`);

for (const file of files) {
  const bill = JSON.parse(readFileSync(path.join(storeDir, file), "utf8"));
  console.log(`Migrating ${bill.id} (${bill.slug})…`);

  const { error: billError } = await supabase.from("bills").upsert(billToRow(bill));
  if (billError) {
    console.error(`  bill error: ${billError.message}`);
    continue;
  }

  await supabase.from("findings").delete().eq("bill_id", bill.id);

  if (bill.findings?.length) {
    const rows = bill.findings.map((finding) => findingToRow(finding, bill.id));
    const { error: findingsError } = await supabase.from("findings").insert(rows);
    if (findingsError) {
      console.error(`  findings error: ${findingsError.message}`);
      continue;
    }
  }

  console.log(`  ok (${bill.findings?.length ?? 0} findings)`);
}

console.log("Done.");
