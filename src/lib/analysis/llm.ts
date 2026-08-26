import type { Clause, Finding } from "@/lib/types";

/**
 * Provider-agnostic LLM layer.
 * The Constitution remains the source of truth. The model may only refine
 * wording of already-cited findings. It must not invent articles.
 */
function provider(): { name: string; key: string; url: string; model: string } | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      name: "anthropic",
      key: process.env.ANTHROPIC_API_KEY,
      url: "https://api.anthropic.com/v1/messages",
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      name: "openai",
      key: process.env.OPENAI_API_KEY,
      url: "https://api.openai.com/v1/chat/completions",
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    };
  }
  if (process.env.XAI_API_KEY) {
    return {
      name: "xai",
      key: process.env.XAI_API_KEY,
      url: "https://api.x.ai/v1/chat/completions",
      model: process.env.XAI_MODEL || "grok-4",
    };
  }
  if (process.env.GOOGLE_API_KEY) {
    return {
      name: "google",
      key: process.env.GOOGLE_API_KEY,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GOOGLE_MODEL || "gemini-2.0-flash"}:generateContent`,
      model: process.env.GOOGLE_MODEL || "gemini-2.0-flash",
    };
  }
  return null;
}

export function llmAvailable(): boolean {
  return provider() !== null;
}

export async function enhanceWithLlm(clauses: Clause[], findings: Finding[]): Promise<Finding[]> {
  const cfg = provider();
  if (!cfg || !findings.length) return findings;
  try {
    const payload = findings.slice(0, 12).map((f) => ({
      id: f.id,
      clauseNumber: f.clauseNumber,
      clauseText: f.clauseText.slice(0, 700),
      title: f.title,
      legalExplanation: f.legalExplanation,
      counterargument: f.counterargument,
      citations: f.citations.map((c) => c.citation),
    }));
    const instruction = `You are the reasoning layer of Katibaism, not the source of constitutional truth.
You are not evaluating political desirability. You test whether provisions can be reconciled with the Constitution of Kenya, 2010.
Be adversarial. Do not manufacture conflicts. Do not invent articles, cases, or quotations.
For each finding, return tighter legalExplanation, citizenExplanation and counterargument.
Distinguish: direct contradiction, possible inconsistency, procedural issue, interpretive question, ordinary policy disagreement.
Never say a court has held something unless that is already in the input.
Return JSON: {"edits":[{"id":"...","legalExplanation":"...","citizenExplanation":"...","counterargument":"..."}]}`;

    const raw = await callProvider(cfg, instruction, JSON.stringify({ clauses: clauses.slice(0, 20), findings: payload }));
    const parsed = JSON.parse(raw) as {
      edits?: { id: string; legalExplanation?: string; citizenExplanation?: string; counterargument?: string }[];
    };
    if (!parsed.edits) return findings;
    const map = new Map(parsed.edits.map((e) => [e.id, e]));
    return findings.map((f) => {
      const edit = map.get(f.id);
      if (!edit) return f;
      return {
        ...f,
        legalExplanation: edit.legalExplanation || f.legalExplanation,
        citizenExplanation: edit.citizenExplanation || f.citizenExplanation,
        counterargument: edit.counterargument || f.counterargument,
      };
    });
  } catch {
    return findings;
  }
}

async function callProvider(
  cfg: { name: string; key: string; url: string; model: string },
  system: string,
  user: string,
): Promise<string> {
  if (cfg.name === "anthropic") {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 2500,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const json = (await res.json()) as { content?: { text?: string }[] };
    return json.content?.[0]?.text || "{}";
  }
  if (cfg.name === "google") {
    const res = await fetch(`${cfg.url}?key=${cfg.key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }],
      }),
    });
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return json.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  }
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    }),
  });
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content || "{}";
}
