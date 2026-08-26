#!/usr/bin/env node
/**
 * Quick Supabase connectivity check.
 * Usage: node --env-file=.env.local scripts/test-supabase-connection.mjs
 */

import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const store = process.env.KATIBAISM_STORE ?? "file";

console.log(`Store mode: ${store}`);

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});

const { data: bills, error: billsError } = await supabase.from("bills").select("id").limit(1);
if (billsError) {
  console.error("bills table:", billsError.message);
  process.exit(1);
}
console.log("bills table: ok");

const { data: findings, error: findingsError } = await supabase.from("findings").select("id").limit(1);
if (findingsError) {
  console.error("findings table:", findingsError.message);
  process.exit(1);
}
console.log("findings table: ok");

const { data: stats, error: statsError } = await supabase.rpc("katibaism_dashboard_stats");
if (statsError) {
  console.error("katibaism_dashboard_stats():", statsError.message);
  process.exit(1);
}
console.log("dashboard function: ok");
console.log("Dashboard preview:", JSON.stringify(stats, null, 2));
console.log("\nSupabase is ready. Restart `npm run dev` to use Postgres storage.");
