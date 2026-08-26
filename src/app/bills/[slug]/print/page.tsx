import { notFound } from "next/navigation";
import { getBillBySlug } from "@/lib/store";
import { toMarkdown } from "@/lib/export/formats";

export const dynamic = "force-dynamic";

export default async function PrintPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bill = await getBillBySlug(slug);
  if (!bill) notFound();
  const markdown = toMarkdown(bill);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 print:px-0">
      <p className="mb-6 text-sm text-ink-soft print:hidden">
        Use your browser’s Print dialog to save this report as PDF.
      </p>
      <article className="paper-card p-8">
        <pre className="serif whitespace-pre-wrap text-[15px] leading-7">{markdown}</pre>
      </article>
    </div>
  );
}
