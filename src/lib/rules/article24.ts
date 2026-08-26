import type { Article24Answer, Article24Question, Article24Test, Clause } from "@/lib/types";

export const ARTICLE24_TEST_VERSION = "article24.test-b.v1";

interface WalkInput {
  title: string;
  concept: string;
  provisionIds: string[];
  triggeringLanguage: string[];
  whatItDoes: string;
}

const PURPOSE_RE =
  /\b(for the purpose of|in the interest of|in the interests of|necessary to|in order to|to prevent|national security|public safety|public order|public health|public morality)\b/i;
const NOTICE_RE = /\b(notice|inform the person|opportunity to be heard|reasons in writing)\b/i;
const WARRANT_RE = /\b(warrant|court order|judicial authorisation|judicial authorization)\b/i;
const WITHOUT_RE = /\b(without notice|without hearing|without giving reasons|any person|all information|absolute discretion)\b/i;
const SPECIFIC_LIMIT_RE =
  /\b(limit(?:s|ation|ed)? (?:the )?(?:right|freedom)|notwithstanding article|subject to article 24)\b/i;
const OTHERS_RIGHTS_RE =
  /\b(rights of others|rights and fundamental freedoms of others|protect(?:ion)? of (?:the )?(?:public|children|victims))\b/i;
const NARROW_RE = /\b(only where|to the extent|reasonably necessary|proportionate|least restrictive)\b/i;

export function shouldWalkArticle24(provisionIds: string[]): boolean {
  return provisionIds.includes("art-24");
}

function answer(
  id: string,
  question: string,
  articleAnchor: string,
  finding: Article24Answer,
  evidence: string,
  note: string,
): Article24Question {
  return { id, question, articleAnchor, finding, evidence, note };
}

function firstMatch(text: string, re: RegExp): string {
  return text.match(re)?.[0] ?? "";
}

export function walkArticle24(clause: Clause, hit: WalkInput): Article24Test {
  const text = clause.text;
  const nonDerogable = hit.provisionIds.includes("art-25");
  const purposeHit = firstMatch(text, PURPOSE_RE);
  const noticeHit = firstMatch(text, NOTICE_RE);
  const warrantHit = firstMatch(text, WARRANT_RE);
  const withoutHit = firstMatch(text, WITHOUT_RE);
  const specificHit = firstMatch(text, SPECIFIC_LIMIT_RE);
  const othersHit = firstMatch(text, OTHERS_RIGHTS_RE);
  const narrowHit = firstMatch(text, NARROW_RE);
  const trigger = hit.triggeringLanguage[0] || "";

  const q1 = nonDerogable
    ? answer(
        "by_law",
        "Is the limitation by law — and can Article 24 apply at all?",
        "Article 24(1); Article 25",
        "no",
        trigger || text.slice(0, 180),
        "Article 25 rights cannot be limited. Article 24 cannot save a clause that limits torture, slavery or servitude, fair trial, or habeas corpus.",
      )
    : answer(
        "by_law",
        "Is the limitation by law?",
        "Article 24(1)",
        "yes",
        `Clause ${clause.clauseNumber} is proposed statutory text.`,
        "A Bill can be 'law' once enacted. The remaining Article 24 questions still have to be walked. Vague or open-ended wording can fail the 'by law' quality requirement even if the vehicle is a statute.",
      );

  const q2 = answer(
    "nature_of_right",
    "What is the nature of the right or fundamental freedom?",
    "Article 24(1)(a)",
    nonDerogable ? "no" : "partial",
    hit.concept,
    nonDerogable
      ? `${hit.title} engages a right that the Constitution itself says shall not be limited.`
      : `The clause appears to engage ${hit.concept}. The more central the right, the heavier the justification required.`,
  );

  const q3 = answer(
    "purpose",
    "How important is the purpose of the limitation?",
    "Article 24(1)(b)",
    purposeHit ? "partial" : "unclear",
    purposeHit || "No express purpose language in this clause.",
    purposeHit
      ? "A purpose is stated or hinted. Importance still has to be weighed in an open and democratic society — the engine does not accept the drafter's label as conclusive."
      : "The clause does not clearly state why the limitation is needed. Without a purpose, later tests (connection, necessity, less restrictive means) cannot be satisfied on the face of the text.",
  );

  const extentWide = Boolean(withoutHit) || /any information|any person|all persons/.test(text.toLowerCase());
  const q4 = answer(
    "extent",
    "What is the nature and extent of the limitation?",
    "Article 24(1)(c)",
    extentWide ? "no" : noticeHit || warrantHit ? "partial" : "unclear",
    withoutHit || noticeHit || warrantHit || trigger || text.slice(0, 180),
    extentWide
      ? "The operative language is broad (for example without notice, any person, or absolute discretion). That is a wide limitation."
      : noticeHit || warrantHit
        ? "Some process language is present. Check how far the power still reaches: who is covered, for how long, and what is taken."
        : "The clause does not clearly bound who is affected, for how long, or how much of the right is taken.",
  );

  const q5 = answer(
    "rights_of_others",
    "Does the limitation protect the rights and fundamental freedoms of others?",
    "Article 24(1)(d)",
    othersHit ? "partial" : "unclear",
    othersHit || "No express reference to the rights of others.",
    othersHit
      ? "Protecting others' rights can support a limitation. It does not excuse an overbroad clause."
      : "The text reads more like an expansion of State power than a measure to protect others' rights. That is not fatal, but it weakens this factor.",
  );

  const q6 = answer(
    "necessity",
    "Is the limitation necessary — is it connected to its purpose?",
    "Article 24(1)(e)",
    nonDerogable ? "no" : purposeHit && !extentWide ? "partial" : "unclear",
    purposeHit || withoutHit || "Purpose and necessity are not specified in this clause.",
    nonDerogable
      ? "Necessity under Article 24 does not arise where Article 25 forbids limitation."
      : purposeHit && !extentWide
        ? "There is some purpose language and the clause is not obviously unlimited. Necessity is still a question, not an answer."
        : "Necessity cannot be shown from the clause: either no purpose is stated, or the power is so wide that a tighter connection is not visible.",
  );

  const q7 = answer(
    "less_restrictive_means",
    "Are there less restrictive means to achieve the purpose?",
    "Article 24(1)(e)",
    nonDerogable ? "no" : narrowHit ? "partial" : "unclear",
    narrowHit || withoutHit || "The clause does not consider narrower alternatives.",
    nonDerogable
      ? "Less restrictive means are irrelevant if the right cannot be limited."
      : narrowHit
        ? "The clause uses narrowing words. Check whether they actually constrain the operative power."
        : "Typical less restrictive means — notice, warrants, time limits, targeting, independent authorisation — are not built into this clause. That is a live Article 24 question.",
  );

  const q8 = answer(
    "disproportionate_impact",
    "Is the impact disproportionate, and does the Bill specifically express the intention to limit?",
    "Article 24(1); Article 24(2)",
    specificHit ? "partial" : extentWide ? "no" : "unclear",
    specificHit || withoutHit || "No Article 24(2) specificity language found.",
    specificHit
      ? "The Bill appears to mention limitation. Article 24(2) still requires a specific expression of the intention to limit the right, plus the other clause (1) factors."
      : extentWide
        ? "A wide power, without Article 24(2) specificity, is difficult to reconcile with a proportionate, expressed limitation."
        : "Disproportionate impact is assessed by who is hit and how hard. The clause does not identify affected groups or express an intention to limit a named right.",
  );

  const questions = [q1, q2, q3, q4, q5, q6, q7, q8];
  const closed = questions.filter((q) => q.finding === "no").length;
  const open = questions.filter((q) => q.finding === "unclear" || q.finding === "partial").length;

  return {
    version: ARTICLE24_TEST_VERSION,
    applicable: true,
    rightLimited: hit.concept,
    questions,
    summary: nonDerogable
      ? "Article 24 is walked and closed: Article 25 rights cannot be limited."
      : `Article 24 Test B walked on this clause: ${closed} factor(s) lean against the limitation, ${open} remain open. This is not a court conclusion.`,
  };
}
