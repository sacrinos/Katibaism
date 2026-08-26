"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "upload" | "paste" | "url";

export function UploadForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("paste");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(sample = false) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      if (sample) form.set("sample", "true");
      else if (mode === "paste") form.set("text", text);
      else if (mode === "url") form.set("url", url);
      else if (file) form.set("file", file);
      else throw new Error("Add a Bill first.");

      const res = await fetch("/api/bills", { method: "POST", body: form });
      const json = (await res.json()) as { bill?: { slug: string }; error?: string };
      if (!res.ok || !json.bill) throw new Error(json.error || "Analysis failed.");
      router.push(`/bills/${json.bill.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="paper-card rise p-6 sm:p-8">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">What do you want to examine?</p>
      <h2 className="serif mt-2 text-3xl">Put this Bill against the Constitution</h2>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["upload", "Upload Bill"],
            ["paste", "Paste Bill"],
            ["url", "Parliament Bill URL"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              mode === key
                ? "border-ink bg-ink text-paper"
                : "border-rule bg-white text-ink-soft hover:border-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {mode === "paste" && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the full text of a Kenyan Bill, including numbered clauses…"
            className="min-h-56 w-full rounded-md border border-rule bg-white p-4 text-sm leading-6 outline-none focus:border-ink"
          />
        )}
        {mode === "url" && (
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.parliament.go.ke/… or https://kenyalaw.org/…"
            className="w-full rounded-md border border-rule bg-white px-4 py-3 text-sm outline-none focus:border-ink"
          />
        )}
        {mode === "upload" && (
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-rule bg-white px-4 text-center text-sm text-ink-soft hover:border-ink">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className="serif text-lg text-ink">{file ? file.name : "Drop a PDF, Word or text file"}</span>
            <span className="mt-2">Text PDFs are read first. Scanned pages are sent through OCR.</span>
          </label>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-kenya-red">{error}</p>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(false)}
          className="rounded-md bg-kenya-red px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white hover:bg-[#8e141a] disabled:opacity-60"
        >
          {busy ? "Testing against the Constitution…" : "Analyse against the Constitution"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(true)}
          className="rounded-md border border-ink px-5 py-3 text-sm text-ink hover:bg-ink hover:text-paper disabled:opacity-60"
        >
          Try the sample 2026 Bill
        </button>
      </div>
    </div>
  );
}
