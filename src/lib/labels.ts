import type { Severity } from "@/lib/types";

export const SEVERITY_META: Record<
  Severity,
  { mark: string; label: string; className: string }
> = {
  critical: { mark: "🔴", label: "Critical", className: "bg-[#f8e6e6] text-[#7f1016]" },
  high: { mark: "🟠", label: "High", className: "bg-[#f8eadf] text-[#9a3f12]" },
  medium: { mark: "🟡", label: "Medium", className: "bg-[#f7efd4] text-[#7a5a08]" },
  low: { mark: "🔵", label: "Low", className: "bg-[#e6eef6] text-[#1d4e89]" },
};

export const OVERALL_META = {
  none: { mark: "🟢", label: "No significant constitutional issue detected" },
  question: { mark: "🟡", label: "Constitutional question / requires review" },
  concern: { mark: "🟠", label: "Significant constitutional concern" },
  conflict: { mark: "🔴", label: "Serious potential constitutional conflict" },
};
