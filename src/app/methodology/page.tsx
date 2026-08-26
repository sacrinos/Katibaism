export const metadata = { title: "Methodology" };

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 leading-8">
      <h1 className="serif text-5xl">How Katibaism works</h1>
      <p className="mt-6 text-lg text-ink-soft">
        Katibaism never asks a language model “Is this Bill constitutional?” That produces
        unreliable legal hallucinations. The Constitution is the authoritative source.
      </p>
      <ol className="mt-10 list-decimal space-y-4 pl-5">
        <li>Extract and structure the Bill, clause by clause. Text PDFs are read first; scanned pages go through OCR.</li>
        <li>Retrieve relevant articles from a versioned Constitution of Kenya, 2010 knowledge base published by Kenya Law.</li>
        <li>Run deterministic tests: conflict, rights limitation, delegation, procedure, money, institutions, equality, administrative justice, offences, hidden issues, and system-level escape hatches.</li>
        <li>Where a finding cites Article 24, walk Test B — eight questions from Article 24(1)–(2): by law, nature of the right, purpose, extent, rights of others, necessity, less restrictive means, and disproportionate impact / specificity. The walk surfaces evidence. It does not declare the clause unconstitutional.</li>
        <li>Optionally, an LLM refines wording of already-cited findings. It cannot invent articles.</li>
        <li>A citation verifier rejects any finding whose quotation is not in the knowledge base.</li>
        <li>Every finding includes a counterargument and a confidence score for the analysis, not a court-outcome prediction.</li>
      </ol>
      <h2 className="serif mt-12 text-3xl">What Katibaism will not say</h2>
      <p className="mt-4">
        It will not say “this Bill is unconstitutional” unless reporting a final judicial
        determination. It will say that a provision appears difficult to reconcile with a
        cited article, or that it raises a serious constitutional question.
      </p>
      <h2 className="serif mt-12 text-3xl">Bias rule</h2>
      <p className="mt-4">
        Analysis does not use political party, sponsor, ideology, popularity or media coverage.
        The same test applies to every text.
      </p>
    </div>
  );
}
