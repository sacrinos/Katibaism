import { afterEach, describe, expect, it, vi } from "vitest";
import { billReportUrl, publicSiteUrl } from "@/lib/site";

describe("publicSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://katibaism.ke/");
    vi.stubEnv("VERCEL_URL", "example.vercel.app");
    expect(publicSiteUrl()).toBe("https://katibaism.ke");
  });

  it("uses the Vercel production host when no explicit site URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "katibaism.vercel.app");
    expect(publicSiteUrl()).toBe("https://katibaism.vercel.app");
  });

  it("builds a shareable bill report URL", () => {
    expect(billReportUrl("finance-bill-2026", "https://katibaism.ke/")).toBe(
      "https://katibaism.ke/bills/finance-bill-2026",
    );
  });
});
