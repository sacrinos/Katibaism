import { isPostgresStoreEnabled } from "@/lib/supabase/admin";
import type { BillRecord, DashboardStats, FindingFeedback } from "@/lib/types";
import * as fileStore from "@/lib/store/file";
import * as postgresStore from "@/lib/store/postgres";

function postgresStoreEnabled(): boolean {
  return isPostgresStoreEnabled();
}

export function saveBill(bill: BillRecord): BillRecord | Promise<BillRecord> {
  return postgresStoreEnabled() ? postgresStore.saveBill(bill) : fileStore.saveBill(bill);
}

export function getBill(id: string): BillRecord | null | Promise<BillRecord | null> {
  return postgresStoreEnabled() ? postgresStore.getBill(id) : fileStore.getBill(id);
}

export function getBillBySlug(slug: string): BillRecord | null | Promise<BillRecord | null> {
  return postgresStoreEnabled() ? postgresStore.getBillBySlug(slug) : fileStore.getBillBySlug(slug);
}

export function listBills(): BillRecord[] | Promise<BillRecord[]> {
  return postgresStoreEnabled() ? postgresStore.listBills() : fileStore.listBills();
}

export function recordFeedback(
  billId: string,
  findingId: string,
  feedback: FindingFeedback,
): BillRecord | null | Promise<BillRecord | null> {
  return postgresStoreEnabled()
    ? postgresStore.recordFeedback(billId, findingId, feedback)
    : fileStore.recordFeedback(billId, findingId, feedback);
}

export function dashboardStats(): DashboardStats | Promise<DashboardStats> {
  return postgresStoreEnabled() ? postgresStore.dashboardStats() : fileStore.dashboardStats();
}

export async function awaitStore<T>(value: T | Promise<T>): Promise<T> {
  return await value;
}
