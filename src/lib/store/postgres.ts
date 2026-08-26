import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  billRecordToRow,
  billRowToRecord,
  dashboardJsonToStats,
  findingRowToFinding,
  findingToRow,
} from "@/lib/store/mappers";
import type { BillRecord, DashboardStats, FindingFeedback } from "@/lib/types";

type BillRow = Database["public"]["Tables"]["bills"]["Row"];

async function loadFindings(billId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("findings")
    .select("*")
    .eq("bill_id", billId)
    .order("clause_number", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(findingRowToFinding);
}

async function hydrateBill(row: BillRow): Promise<BillRecord> {
  const findings = await loadFindings(row.id);
  return billRowToRecord(row, findings);
}

async function fetchBillRow(filter: { id?: string; slug?: string }): Promise<BillRow | null> {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("bills").select("*").limit(1);
  if (filter.id) query = query.eq("id", filter.id);
  if (filter.slug) query = query.eq("slug", filter.slug);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveBill(bill: BillRecord): Promise<BillRecord> {
  const supabase = getSupabaseAdmin();
  const row = billRecordToRow({ ...bill, updatedAt: new Date().toISOString() });

  const { error: billError } = await supabase.from("bills").upsert(row);
  if (billError) throw new Error(billError.message);

  const { error: deleteError } = await supabase.from("findings").delete().eq("bill_id", bill.id);
  if (deleteError) throw new Error(deleteError.message);

  if (bill.findings.length) {
    const findingRows = bill.findings.map((finding) => findingToRow(finding, bill.id));
    const { error: findingsError } = await supabase.from("findings").insert(findingRows);
    if (findingsError) throw new Error(findingsError.message);
  }

  return bill;
}

export async function getBill(id: string): Promise<BillRecord | null> {
  const row = await fetchBillRow({ id });
  if (!row) return null;
  return hydrateBill(row);
}

export async function getBillBySlug(slug: string): Promise<BillRecord | null> {
  const row = await fetchBillRow({ slug });
  if (!row) return null;
  return hydrateBill(row);
}

export async function listBills(): Promise<BillRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("bills").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const bills = await Promise.all((data ?? []).map((row) => hydrateBill(row)));
  return bills;
}

export async function recordFeedback(
  billId: string,
  findingId: string,
  feedback: FindingFeedback,
): Promise<BillRecord | null> {
  const bill = await getBill(billId);
  if (!bill) return null;

  bill.findings = bill.findings.map((f) => (f.id === findingId ? { ...f, feedback } : f));
  bill.updatedAt = new Date().toISOString();

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("findings")
    .update({ feedback: feedback as unknown as Json, updated_at: bill.updatedAt })
    .eq("bill_id", billId)
    .eq("id", findingId);

  if (error) throw new Error(error.message);

  const { error: billError } = await supabase
    .from("bills")
    .update({ updated_at: bill.updatedAt })
    .eq("id", billId);

  if (billError) throw new Error(billError.message);

  return bill;
}

export async function dashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("katibaism_dashboard_stats");
  if (error) throw new Error(error.message);
  return dashboardJsonToStats(data);
}
