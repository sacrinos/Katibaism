/**
 * Run the sample 2026 Bill against a live Katibaism origin.
 *
 *   node scripts/analyse-sample.mjs
 *   node scripts/analyse-sample.mjs https://your-deployment.vercel.app
 *   node scripts/analyse-sample.mjs http://localhost:3000 https://new.kenyalaw.org/...
 */
const origin = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const sourceUrl = process.argv[3];

const form = new FormData();
if (sourceUrl) form.set("url", sourceUrl);
else form.set("sample", "true");

const res = await fetch(`${origin}/api/bills`, { method: "POST", body: form });
const json = await res.json();
if (!res.ok || !json.bill) {
  console.error(json.error || `HTTP ${res.status}`);
  process.exit(1);
}

const bill = json.bill;
console.log(`Bill: ${bill.slug}`);
console.log(`Title: ${bill.title}`);
console.log(`Findings: ${bill.findings.length}`);
console.log(`Status: ${bill.status}`);
console.log(`Report: ${origin}/bills/${bill.slug}`);
console.log(
  `Severity: ${bill.summary.critical} critical / ${bill.summary.high} high / ${bill.summary.medium} medium / ${bill.summary.low} low`,
);
