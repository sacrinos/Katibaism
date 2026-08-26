export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`text-ink-soft ${compact ? "text-xs" : "text-sm"}`}>
      Katibaism identifies potential constitutional questions. It does not decide that a Bill
      is unconstitutional. Confidence scores measure the analysis, not a prediction of what a
      Kenyan court would hold.
    </p>
  );
}
