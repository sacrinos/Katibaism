import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { BillRecord, DashboardStats, FindingFeedback } from "@/lib/types";

function storeDir(): string {
  const dir = path.join(process.cwd(), "data", "runtime", "bills");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function fileFor(id: string): string {
  return path.join(storeDir(), `${id}.json`);
}

export function saveBill(bill: BillRecord): BillRecord {
  writeFileSync(fileFor(bill.id), JSON.stringify(bill, null, 2), "utf8");
  return bill;
}

export function getBill(id: string): BillRecord | null {
  try {
    return JSON.parse(readFileSync(fileFor(id), "utf8")) as BillRecord;
  } catch {
    return null;
  }
}

export function getBillBySlug(slug: string): BillRecord | null {
  for (const bill of listBills()) {
    if (bill.slug === slug) return bill;
  }
  return null;
}

export function listBills(): BillRecord[] {
  const files = readdirSync(storeDir()).filter((f) => f.endsWith(".json"));
  return files
    .map((f) => {
      try {
        return JSON.parse(readFileSync(path.join(storeDir(), f), "utf8")) as BillRecord;
      } catch {
        return null;
      }
    })
    .filter((b): b is BillRecord => Boolean(b))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function recordFeedback(billId: string, findingId: string, feedback: FindingFeedback): BillRecord | null {
  const bill = getBill(billId);
  if (!bill) return null;
  bill.findings = bill.findings.map((f) => (f.id === findingId ? { ...f, feedback } : f));
  bill.updatedAt = new Date().toISOString();
  return saveBill(bill);
}

export function dashboardStats(): DashboardStats {
  const bills = listBills().filter((b) => b.status === "analysed");
  const findings = bills.flatMap((b) => b.findings);
  const articleCounts = new Map<string, number>();
  for (const finding of findings) {
    for (const citation of finding.citations) {
      articleCounts.set(citation.citation, (articleCounts.get(citation.citation) || 0) + 1);
    }
  }
  const topArticles = [...articleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([citation, count]) => ({ citation, count }));

  const highRiskClauses = new Set(
    findings.filter((f) => f.severity === "critical" || f.severity === "high").map((f) => `${f.clauseId}`),
  );

  return {
    billsAnalysed: bills.length,
    criticalFindings: findings.filter((f) => f.severity === "critical").length,
    highRiskClauses: highRiskClauses.size,
    topArticles,
    recent: bills.slice(0, 12).map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      summary: b.summary,
      createdAt: b.createdAt,
      status: b.status,
    })),
  };
}
