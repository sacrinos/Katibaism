import { getProvision } from "@/lib/constitution/load";
import { quoteFromProvision } from "@/lib/constitution/retrieve";
import { shouldWalkArticle24, walkArticle24 } from "@/lib/rules/article24";
import type {
  BillClassification,
  Citation,
  Clause,
  Finding,
  IssueType,
  MoneyClassification,
  Severity,
} from "@/lib/types";
import { nanoid } from "nanoid";

export const RULES_VERSION = "rules.v2";

interface RuleHit {
  ruleId: string;
  issueType: IssueType;
  title: string;
  concept: string;
  provisionIds: string[];
  triggeringLanguage: string[];
  severity: Severity;
  confidenceScore: number;
  whatItDoes: string;
  whyItMatters: string;
  citizenExplanation: string;
  legalExplanation: string;
  counterargument: string;
  whatToInvestigate: string;
  humanReviewRecommended: boolean;
}

const DELEGATION_PHRASES = [
  "the authority may prescribe",
  "the board may make regulations",
  "may make regulations",
  "may make rules",
  "as may be prescribed",
  "as may be determined",
  "as the minister may direct",
  "in such manner as may be prescribed",
  "may issue guidelines",
  "by notice in the gazette, vary",
];

const DELEGATION_ELEMENTS = [
  { key: "purpose", re: /\bpurpose/i },
  { key: "objectives", re: /\bobjectives?\b/i },
  { key: "limits", re: /\b(limits?|not exceed|shall not)\b/i },
  { key: "nature", re: /\bnature\b/i },
  { key: "scope", re: /\bscope\b/i },
  { key: "principles", re: /\bprinciples?\b/i },
  { key: "standards", re: /\bstandards?\b/i },
];

const COUNTY_SIGNALS = [
  "county government",
  "county assembly",
  "county executive",
  "county functions",
  "devolved function",
  "county health",
  "county roads",
  "refuse removal",
  "trade licence",
  "trade license",
  "liquor licensing",
  "pre-primary",
  "village polytechnic",
  "county abattoir",
  "storm water",
];

const INSTITUTIONS: { name: string; ids: string[] }[] = [
  { name: "Independent Electoral and Boundaries Commission", ids: ["art-88", "art-248", "art-249"] },
  { name: "IEBC", ids: ["art-88", "art-248", "art-249"] },
  { name: "Auditor-General", ids: ["art-229", "art-248", "art-249"] },
  { name: "Controller of Budget", ids: ["art-228", "art-248", "art-249"] },
  { name: "Commission on Administrative Justice", ids: ["art-59", "art-248", "art-249"] },
  { name: "Ethics and Anti-Corruption", ids: ["art-79", "art-248", "art-249"] },
  { name: "Judicial Service Commission", ids: ["art-171", "art-172", "art-248", "art-249"] },
  { name: "National Land Commission", ids: ["art-67", "art-248", "art-249"] },
  { name: "Public Service Commission", ids: ["art-233", "art-234", "art-248", "art-249"] },
];

function includesAny(text: string, phrases: string[]): string[] {
  const lower = text.toLowerCase();
  return phrases.filter((p) => lower.includes(p.toLowerCase()));
}

function snippet(text: string, phrase: string): string {
  const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx < 0) return phrase;
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + phrase.length + 60);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function citationsFor(ids: string[]): Citation[] {
  return ids
    .map((id) => getProvision(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      provisionId: p.id,
      citation: p.citation,
      title: p.title,
      quotedText: quoteFromProvision(p, 360),
      verified: false,
    }));
}

function emptyMoney(): MoneyClassification {
  return {
    taxes: [],
    levies: [],
    fees: [],
    charges: [],
    appropriations: [],
    loans: [],
    guarantees: [],
    funds: [],
  };
}

export function classifyBill(clauses: Clause[], fullText: string): BillClassification {
  const money = emptyMoney();
  const reasoning: string[] = [];
  const haystack = `${fullText}\n${clauses.map((c) => c.text).join("\n")}`;

  const buckets: [keyof MoneyClassification, RegExp][] = [
    ["taxes", /\b(income tax|value added tax|excise|customs duty|capital gains tax|impose a tax|taxation)\b/gi],
    ["levies", /\blev(?:y|ies)\b/gi],
    ["fees", /\bfees?\b/gi],
    ["charges", /\bcharges?\b/gi],
    ["appropriations", /\bappropriat(?:e|ion|ing)\b/gi],
    ["loans", /\bloans?\b|\bborrow(?:ing|ed)?\b/gi],
    ["guarantees", /\bguarantees?\b/gi],
    ["funds", /\b(?:consolidated fund|equalisation fund|contingencies fund|public fund)\b/gi],
  ];
  for (const [key, re] of buckets) {
    const found = haystack.match(re) || [];
    money[key] = [...new Set(found.map((m) => m.toLowerCase()))];
  }

  const possibleMoneyBill =
    money.taxes.length + money.appropriations.length + money.loans.length + money.guarantees.length > 0;
  if (possibleMoneyBill) {
    reasoning.push(
      "The Bill contains language associated with taxes, appropriation, loans or guarantees. Article 114 defines a Money Bill and restricts its contents and Senate role.",
    );
  }

  const countyHits = includesAny(haystack, COUNTY_SIGNALS);
  const possibleCountyBill = countyHits.length > 0;
  if (possibleCountyBill) {
    reasoning.push(
      `Language concerning county government or Fourth Schedule functions was detected (${countyHits.slice(0, 4).join(", ")}). Article 110 determines when a Bill concerns county government.`,
    );
  }

  const possibleConstitutionalAmendment = /amend(?:ment of)? this constitution|notwithstanding (?:this )?constitution/i.test(
    haystack,
  );
  if (possibleConstitutionalAmendment) {
    reasoning.push(
      "The Bill appears to amend, or operate notwithstanding, the Constitution. Articles 255–257 prescribe the amendment procedure.",
    );
  }

  const publicParticipationImplicated =
    possibleMoneyBill ||
    possibleCountyBill ||
    /right|privacy|licence|authority|regulat|tax|levy/i.test(haystack);

  return {
    possibleMoneyBill,
    possibleCountyBill,
    possibleConstitutionalAmendment,
    senateParticipationPossible: possibleCountyBill,
    publicParticipationImplicated,
    money,
    reasoning,
  };
}

function ruleDirectConflict(clause: Clause): RuleHit[] {
  const hits: RuleHit[] = [];
  const lower = clause.text.toLowerCase();
  if (/notwithstanding (?:this )?constitution|this constitution is hereby amended|shall prevail over the constitution/.test(lower)) {
    hits.push({
      ruleId: "DIRECT_SUPREMACY",
      issueType: "direct_conflict",
      title: "Possible attempt to displace constitutional supremacy",
      concept: "constitutional supremacy",
      provisionIds: ["art-2"],
      triggeringLanguage: [snippet(clause.text, "constitution")],
      severity: "critical",
      confidenceScore: 92,
      whatItDoes: "The clause appears to place the Bill above, or outside, the Constitution.",
      whyItMatters:
        "Article 2 makes the Constitution the supreme law. Any law inconsistent with it is void to the extent of the inconsistency. A statute cannot immunise itself from the Constitution.",
      citizenExplanation:
        "No Act of Parliament can place itself above the Constitution. If a clause tries to do that, it raises a serious constitutional problem.",
      legalExplanation:
        "The provision appears difficult to reconcile with Article 2(1) and 2(4). Katibaism does not declare it unconstitutional; it identifies a potential direct inconsistency.",
      counterargument:
        "The clause may be poorly drafted and intended only to resolve conflict between statutes, not to oust the Constitution.",
      whatToInvestigate: "Whether the drafter intended an ordinary notwithstanding clause between statutes.",
      humanReviewRecommended: true,
    });
  }

  if (/torture|cruel, inhuman|slavery|servitude|not.{0,60}habeas corpus|habeas corpus.{0,40}shall not|deny.{0,40}fair trial/.test(lower)) {
    hits.push({
      ruleId: "ART_25_NON_DEROGABLE",
      issueType: "direct_conflict",
      title: "Possible limitation of a right that Article 25 says cannot be limited",
      concept: "non-derogable rights",
      provisionIds: ["art-25", "art-24"],
      triggeringLanguage: includesAny(clause.text, ["torture", "slavery", "servitude", "fair trial", "habeas corpus"]),
      severity: "critical",
      confidenceScore: 90,
      whatItDoes: "The clause engages a right that Article 25 lists as non-limitable.",
      whyItMatters:
        "Article 25 provides that freedom from torture, slavery or servitude, the right to a fair trial, and habeas corpus shall not be limited.",
      citizenExplanation:
        "Some rights in the Constitution cannot be taken away at all. If a Bill touches those rights, that is a red-flag constitutional question.",
      legalExplanation:
        "If the clause limits an Article 25 right, Article 24 cannot save it. The question is whether the clause truly limits that right, or only uses related language.",
      counterargument:
        "The clause may criminalise torture or slavery rather than authorise it, or may regulate trial procedure without denying a fair trial.",
      whatToInvestigate: "Whether the operative effect is to limit, rather than protect, an Article 25 right.",
      humanReviewRecommended: true,
    });
  }
  return hits;
}

function ruleDelegation(clause: Clause): RuleHit[] {
  const hits = includesAny(clause.text, DELEGATION_PHRASES);
  if (!hits.length) return [];
  const lower = clause.text.toLowerCase();
  const commencementOnly =
    /shall come into force|this act may be cited/.test(lower) &&
    !/regulat|prescribe|rules|guidelines/.test(lower);
  if (commencementOnly) return [];
  const present = DELEGATION_ELEMENTS.filter((e) => e.re.test(clause.text)).map((e) => e.key);
  const missing = DELEGATION_ELEMENTS.map((e) => e.key).filter((k) => !present.includes(k));
  const incomplete = missing.length >= 4;
  if (!incomplete && present.length >= 5) return [];

  return [
    {
      ruleId: "ARTICLE_94_6",
      issueType: "delegated_legislation",
      title: "Delegated law-making may not satisfy Article 94(6)",
      concept: "delegated legislation",
      provisionIds: ["art-94"],
      triggeringLanguage: hits.map((h) => snippet(clause.text, h)),
      severity: incomplete ? "high" : "medium",
      confidenceScore: incomplete ? 86 : 68,
      whatItDoes:
        "The clause appears to confer authority to make regulations, rules or other provisions having the force of law.",
      whyItMatters:
        "Article 94(6) requires an Act that confers authority to make provision having the force of law to expressly specify the purpose and objectives, limits, nature and scope of that authority, and the applicable principles and standards.",
      citizenExplanation:
        "This clause lets someone other than Parliament make rules. The Constitution requires Parliament to set clear boundaries for that power.",
      legalExplanation:
        `Detected delegation language. Express specification currently looks incomplete. Elements that appear present: ${present.join(", ") || "none clearly"}. Elements not clearly specified: ${missing.join(", ")}.`,
      counterargument:
        "The missing Article 94(6) elements may appear in another clause, a schedule, or an interpretation clause read with this provision.",
      whatToInvestigate:
        "Read the Bill as a whole for purpose, objectives, limits, nature, scope, principles and standards of the delegated power.",
      humanReviewRecommended: true,
    },
  ];
}

function ruleRights(clause: Clause): RuleHit[] {
  const hits: RuleHit[] = [];
  const privacy = includesAny(clause.text, [
    "personal information",
    "personal data",
    "obtain any information",
    "without notice",
    "surveillance",
    "intercept",
    "correspondence",
  ]);
  if (privacy.length) {
    hits.push({
      ruleId: "ARTICLE_31_PRIVACY",
      issueType: "hidden_issue",
      title: "Clause may limit privacy rights under Article 31",
      concept: "privacy",
      provisionIds: ["art-31", "art-24"],
      triggeringLanguage: privacy.map((p) => snippet(clause.text, p)),
      severity: /without notice|any information from any person/.test(clause.text.toLowerCase())
        ? "high"
        : "medium",
      confidenceScore: 80,
      whatItDoes: "The clause appears to authorise collection, access or interference with information or communications.",
      whyItMatters:
        "Article 31 protects privacy, including the right not to have information relating to one's family or private affairs unnecessarily required or revealed. A limitation must be tested under Article 24.",
      citizenExplanation:
        "This clause lets the government look at people's information. The constitutional question is whether that invasion of privacy is allowed under Article 24.",
      legalExplanation:
        "This provision appears to limit Article 31 rights. The relevant constitutional question is whether the limitation satisfies Article 24 — not a bare conclusion that privacy is 'violated'.",
      counterargument:
        "The collection may be necessary for a legitimate regulatory purpose and may be justifiable if safeguards exist elsewhere in the Bill.",
      whatToInvestigate:
        "Notice, purpose limitation, necessity, less restrictive means, and whether Article 24(2) specificity is present.",
      humanReviewRecommended: true,
    });
  }

  const expression = includesAny(clause.text, [
    "prohibit publication",
    "shall not publish",
    "censor",
    "false information",
    "prior approval",
  ]);
  if (expression.length) {
    hits.push({
      ruleId: "ARTICLE_33_EXPRESSION",
      issueType: "rights_limitation",
      title: "Clause may limit freedom of expression under Article 33",
      concept: "freedom of expression",
      provisionIds: ["art-33", "art-24"],
      triggeringLanguage: expression.map((p) => snippet(clause.text, p)),
      severity: "high",
      confidenceScore: 78,
      whatItDoes: "The clause appears to restrict publication, speech or other expression.",
      whyItMatters:
        "Article 33 protects freedom of expression, including the freedom to seek, receive or impart information. Any limitation must satisfy Article 24.",
      citizenExplanation:
        "This clause restricts what people can say or publish. The Constitution allows some limits, but only if they are reasonable, justified and written clearly in law.",
      legalExplanation:
        "The provision appears to limit Article 33 rights. The constitutional question is whether the limitation satisfies Article 24, including less restrictive means.",
      counterargument:
        "Article 33(2) and 33(3) themselves recognise certain exclusions, including propaganda for war, incitement to violence, hate speech and incitement to ethnic violence.",
      whatToInvestigate: "Whether the restriction falls within Article 33(2)–(3) or must be justified under Article 24.",
      humanReviewRecommended: true,
    });
  }

  const info = includesAny(clause.text, ["deny access to records", "shall not disclose", "not available to the public"]);
  if (info.length) {
    hits.push({
      ruleId: "ARTICLE_35_INFORMATION",
      issueType: "rights_limitation",
      title: "Clause may restrict access to information under Article 35",
      concept: "access to information",
      provisionIds: ["art-35", "art-24"],
      triggeringLanguage: info.map((p) => snippet(clause.text, p)),
      severity: "medium",
      confidenceScore: 70,
      whatItDoes: "The clause appears to withhold or restrict access to information held by the State or another person.",
      whyItMatters: "Article 35 guarantees access to information held by the State and, in some cases, by another person.",
      citizenExplanation:
        "This clause makes it harder to see official information. The Constitution gives people a right to information, with limited exceptions.",
      legalExplanation:
        "The provision appears to limit Article 35. The question is whether the restriction is a constitutionally defensible limitation under Article 24 and any Article 35 legislation.",
      counterargument:
        "Article 35 is subject to limitation and to legislation providing for access; confidentiality of certain records can be justified.",
      whatToInvestigate: "The class of records withheld and whether a public-interest override exists.",
      humanReviewRecommended: true,
    });
  }

  return hits;
}

function ruleAdminJustice(clause: Clause): RuleHit[] {
  const admin = includesAny(clause.text, [
    "licence",
    "license",
    "permit",
    "registration",
    "cancel",
    "revoke",
    "suspend",
    "inspect",
    "in its absolute discretion",
  ]);
  if (!admin.length) return [];
  const lower = clause.text.toLowerCase();
  const hasSafeguard = /notice|reasons|hearing|opportunity to be heard|right of appeal|review/.test(lower);
  const harsh = /without hearing|without giving reasons|without notice|absolute discretion|final and not subject|shall not be questioned/.test(
    lower,
  );
  if (hasSafeguard && !harsh) return [];

  return [
    {
      ruleId: "ARTICLE_47",
      issueType: "administrative_justice",
      title: "Administrative power may not secure fair administrative action",
      concept: "fair administrative action",
      provisionIds: ["art-47", "art-48"],
      triggeringLanguage: admin.map((p) => snippet(clause.text, p)),
      severity: harsh ? "high" : "medium",
      confidenceScore: harsh ? 88 : 72,
      whatItDoes:
        "The clause creates or exercises an administrative power — licensing, cancellation, inspection, or similar discretion.",
      whyItMatters:
        "Article 47 entitles every person to administrative action that is expeditious, efficient, lawful, reasonable and procedurally fair, and to written reasons where a right or fundamental freedom is likely to be adversely affected.",
      citizenExplanation:
        "If a public body can take away a licence or make a decision against you, the Constitution says you should be treated fairly and usually told why.",
      legalExplanation:
        hasSafeguard
          ? "Some procedural language is present, but the safeguards may still be incomplete when read against Article 47."
          : "The clause does not clearly provide notice, reasons, a chance to respond, or review. That potentially engages Article 47.",
      counterargument:
        "Fair Administrative Action Act safeguards may apply automatically, so omission from the Bill does not necessarily create a constitutional vacuum.",
      whatToInvestigate: "Whether notice, reasons, hearing and appeal/review are provided here or by generally applicable law.",
      humanReviewRecommended: true,
    },
  ];
}

function ruleTax(clause: Clause): RuleHit[] {
  const lower = clause.text.toLowerCase();
  const definitionOnly =
    /unless the context otherwise requires/.test(lower) &&
    !/there is imposed|shall be paid|shall pay|charge a|levy of/.test(lower);
  if (definitionOnly) return [];
  const kinds = [
    { label: "tax", re: /\b(tax|taxation|excise|value added tax)\b/i, ids: ["art-209", "art-210", "art-114"] },
    { label: "levy", re: /\blev(?:y|ies)\b/i, ids: ["art-209", "art-210", "art-114"] },
    { label: "fee", re: /\bfees?\b/i, ids: ["art-209", "art-210"] },
    { label: "charge", re: /\bcharges?\b/i, ids: ["art-209", "art-210", "art-114"] },
    { label: "appropriation", re: /\bappropriat/i, ids: ["art-114", "art-206", "art-221"] },
    { label: "loan", re: /\bloan|borrow/i, ids: ["art-211", "art-212", "art-114"] },
    { label: "guarantee", re: /\bguarantee/i, ids: ["art-213", "art-114"] },
  ];
  const found = kinds.filter((k) => k.re.test(clause.text));
  if (!found.length) return [];
  const labels = found.map((k) => k.label);
  const ids = [...new Set(found.flatMap((k) => k.ids))];
  return [
    {
      ruleId: "PUBLIC_FINANCE_REVIEW",
      issueType: "taxation_public_money",
      title: `Public-finance language detected (${labels.join(", ")})`,
      concept: "taxation and public money",
      provisionIds: ids,
      triggeringLanguage: labels.map((l) => snippet(clause.text, l)),
      severity: labels.some((l) => ["tax", "levy", "appropriation", "loan", "guarantee"].includes(l))
        ? "high"
        : "medium",
      confidenceScore: 77,
      whatItDoes: `The clause appears to deal with a ${labels.join(" / ")}, not merely generic government payment.`,
      whyItMatters:
        "Articles 114, 201, 209 and 210 distinguish taxes, charges, appropriations, loans and guarantees, and impose special legislative and public-finance rules.",
      citizenExplanation:
        "When a Bill takes money from people or spends public money, the Constitution has special rules about who may do that and how.",
      legalExplanation:
        "Katibaism distinguishes tax, fee, charge, appropriation, loan and guarantee. Classification here is textual, not a judicial characterisation of a Money Bill.",
      counterargument:
        "A fee for a service may be a regulatory charge rather than a tax, and may not make the Bill a Money Bill under Article 114.",
      whatToInvestigate:
        "Whether the instrument is a tax or a fee, whether Article 210 authorisation exists, and whether Article 114 procedure applies.",
      humanReviewRecommended: true,
    },
  ];
}

function ruleProcedure(clause: Clause): RuleHit[] {
  const county = includesAny(clause.text, COUNTY_SIGNALS);
  if (!county.length) return [];
  return [
    {
      ruleId: "ARTICLE_110",
      issueType: "legislative_procedure",
      title: "Possible Article 110 issue — Bill may concern county government",
      concept: "Bills concerning county government",
      provisionIds: ["art-110", "art-96", "sch-4-part-2"],
      triggeringLanguage: county.map((p) => snippet(clause.text, p)),
      severity: "medium",
      confidenceScore: 74,
      whatItDoes:
        "The clause appears to affect county governments or a function assigned to counties under the Fourth Schedule.",
      whyItMatters:
        "Article 110 defines Bills concerning county government. Those Bills generally require consideration by both Houses. The Senate's role exists to protect county interests (Article 96).",
      citizenExplanation:
        "If a national Bill changes how counties do their work, the Senate — which represents counties — may have to consider it.",
      legalExplanation:
        "This may make the Bill a Bill concerning county government and therefore potentially require consideration by both Houses. Classification must not be inferred casually; Speakers of both Houses also have a constitutional role under Article 110(3).",
      counterargument:
        "The clause may only state national policy (a national function) without affecting county legislative or executive competence.",
      whatToInvestigate:
        "Compare the operative effect with Fourth Schedule Parts 1 and 2, and consider Article 186 concurrent functions.",
      humanReviewRecommended: true,
    },
  ];
}

function ruleEquality(clause: Clause): RuleHit[] {
  const classes = includesAny(clause.text, [
    "non-citizen",
    "citizens only",
    "kenyan citizens only",
    "only to kenyan citizens",
    "issued only to",
    "on the basis of sex",
    "on the basis of age",
    "ethnicity",
    "disability",
    "religion",
    "political opinion",
    "social origin",
  ]);
  if (!classes.length) return [];
  return [
    {
      ruleId: "ARTICLE_27",
      issueType: "equality",
      title: "Classification may engage equality and non-discrimination",
      concept: "equality",
      provisionIds: ["art-27", "art-24"],
      triggeringLanguage: classes.map((p) => snippet(clause.text, p)),
      severity: "medium",
      confidenceScore: 69,
      whatItDoes: "The clause treats people differently on the basis of a listed or analogous characteristic.",
      whyItMatters:
        "Article 27 guarantees equality before the law and prohibits discrimination on listed grounds. The question is whether similarly situated people are treated differently without a constitutionally defensible basis.",
      citizenExplanation:
        "The Constitution says people should be treated equally. If a law picks out a group, there must be a good constitutional reason.",
      legalExplanation:
        "Differential treatment is not automatically unconstitutional. Citizenship-based distinctions, for example, can be defensible. The finding is a question, not a conclusion of invalidity.",
      counterargument:
        "Article 27 permits affirmative action and some citizenship distinctions are expressly contemplated elsewhere in the Constitution.",
      whatToInvestigate: "The comparator group, the purpose of the distinction, and Article 24 justification if a right is limited.",
      humanReviewRecommended: true,
    },
  ];
}

function ruleOffences(clause: Clause): RuleHit[] {
  if (!/commits an offence|liable on conviction|imprisonment|fine not exceeding/.test(clause.text)) {
    return [];
  }
  const ouster = /not subject to (?:appeal|review)|no court shall|final and conclusive/.test(clause.text);
  return [
    {
      ruleId: "OFFENCES_PENALTIES",
      issueType: "offences_penalties",
      title: "Offence or penalty requires fair-hearing and proportionality scrutiny",
      concept: "offences and penalties",
      provisionIds: ouster ? ["art-50", "art-25", "art-29"] : ["art-50", "art-29"],
      triggeringLanguage: includesAny(clause.text, [
        "commits an offence",
        "liable on conviction",
        "imprisonment",
        "fine not exceeding",
      ]).map((p) => snippet(clause.text, p)),
      severity: ouster ? "critical" : "medium",
      confidenceScore: ouster ? 91 : 66,
      whatItDoes: "The clause creates an offence or attaches a penalty, fine, imprisonment or similar consequence.",
      whyItMatters:
        "Articles 50 and 25 protect the right to a fair trial. Criminal or penal consequences also engage freedom and security of the person under Article 29.",
      citizenExplanation:
        "If a Bill can fine you or send you to prison, the Constitution requires a fair process before an independent decision-maker.",
      legalExplanation:
        ouster
          ? "Language that appears to block court review of guilt or penalty is especially difficult to reconcile with Articles 50 and 25."
          : "The clause should identify who prosecutes, who decides guilt, and what appeal or review exists. Absence of those details is a drafting and constitutional-process concern.",
      counterargument:
        "Ordinary criminal procedure under the Criminal Procedure Code and Article 50 may fill gaps the Bill does not repeat.",
      whatToInvestigate: "Decision-maker independence, mens rea, penalty proportionality, and appeal routes.",
      humanReviewRecommended: true,
    },
  ];
}

function ruleSeparation(clause: Clause): RuleHit[] {
  const ouster = includesAny(clause.text, [
    "shall not be questioned in any court",
    "not subject to the direction",
    "no court shall",
    "final and not subject to appeal",
  ]);
  if (!ouster.length) return [];
  return [
    {
      ruleId: "SEPARATION_OUSTER",
      issueType: "separation_of_powers",
      title: "Possible ouster of judicial review or interference with courts",
      concept: "separation of powers",
      provisionIds: ["art-160", "art-165", "art-47", "art-50"],
      triggeringLanguage: ouster.map((p) => snippet(clause.text, p)),
      severity: "critical",
      confidenceScore: 89,
      whatItDoes: "The clause appears to prevent courts from reviewing an action, or to make an administrative decision unreviewable.",
      whyItMatters:
        "Article 165 gives the High Court jurisdiction over constitutional questions and judicial review. Article 160 protects judicial independence. Ouster clauses are treated with deep scepticism.",
      citizenExplanation:
        "A law that says 'the courts cannot look at this' is a serious constitutional warning sign. Courts exist to check public power.",
      legalExplanation:
        "An ouster does not automatically succeed, but its presence is a high-severity constitutional question involving Articles 165, 160, 47 and 50.",
      counterargument:
        "Some constitutionally independent offices are protected from direction or control; 'not subject to direction' can be a lawful independence clause rather than an ouster.",
      whatToInvestigate: "Whether the language protects independence of a Chapter 15 body or actually ousts judicial review.",
      humanReviewRecommended: true,
    },
  ];
}

function ruleInstitutions(clause: Clause): RuleHit[] {
  const hits: RuleHit[] = [];
  const lower = clause.text.toLowerCase();
  for (const inst of INSTITUTIONS) {
    if (lower.includes(inst.name.toLowerCase())) {
      hits.push({
        ruleId: "CONSTITUTIONAL_INSTITUTION",
        issueType: "constitutional_institution",
        title: `Bill affects ${inst.name}`,
        concept: "constitutional institutions",
        provisionIds: inst.ids,
        triggeringLanguage: [snippet(clause.text, inst.name)],
        severity: "high",
        confidenceScore: 82,
        whatItDoes: `The clause operates on ${inst.name}, a body with a constitutional architecture.`,
        whyItMatters:
          "Chapter 15 and the specific establishing Article protect the independence, functions and removal process of commissions and independent offices.",
        citizenExplanation:
          "Some institutions are written into the Constitution so that politicians cannot easily control them. Changing their powers is a constitutional matter.",
        legalExplanation:
          "Compare the Bill against the constitutional provisions governing that institution. Parliament may legislate, but not so as to undermine constitutional independence or functions.",
        counterargument:
          "Article 249 and the specific Article often contemplate legislation to give effect to the institution's functions.",
        whatToInvestigate: "Whether the Bill alters composition, independence, reporting lines, or core functions.",
        humanReviewRecommended: true,
      });
      break;
    }
  }
  return hits;
}

function ruleProperty(clause: Clause): RuleHit[] {
  const hits = includesAny(clause.text, [
    "compulsory acquisition",
    "seize property",
    "forfeit",
    "without compensation",
    "acquire land",
  ]);
  if (!hits.length) return [];
  return [
    {
      ruleId: "ARTICLE_40",
      issueType: "property_economic",
      title: "Property or economic-activity provision may engage Article 40",
      concept: "property rights",
      provisionIds: ["art-40"],
      triggeringLanguage: hits.map((p) => snippet(clause.text, p)),
      severity: /without compensation/.test(clause.text.toLowerCase()) ? "high" : "medium",
      confidenceScore: 76,
      whatItDoes: "The clause appears to take, restrict or forfeit property or economic interests.",
      whyItMatters:
        "Article 40 protects property and requires just compensation for compulsory acquisition by the State.",
      citizenExplanation:
        "If the government takes land or property, the Constitution usually requires prompt and just compensation.",
      legalExplanation:
        "Article 40(2) allows regulation of property by law. Compulsory acquisition without compensation is the sharper constitutional question.",
      counterargument:
        "Forfeiture following a fair process, or regulation of use, may be constitutionally defensible.",
      whatToInvestigate: "Whether acquisition is compulsory, whether compensation is provided, and the process used.",
      humanReviewRecommended: true,
    },
  ];
}

function rulePower(clause: Clause): RuleHit[] {
  const who = includesAny(clause.text, [
    "cabinet secretary",
    "the president may",
    "the authority shall have power",
    "the board may",
    "the commission may",
  ]);
  if (!who.length) return [];
  if (/may make regulations|may prescribe|licence|license|inspect|offence/.test(clause.text.toLowerCase())) {
    return [
      {
        ruleId: "INSTITUTIONAL_POWER",
        issueType: "institutional_power",
        title: "New or expanded public power requires a constitutional source",
        concept: "institutional power",
        provisionIds: ["art-1", "art-2", "art-94"],
        triggeringLanguage: who.map((p) => snippet(clause.text, p)),
        severity: "low",
        confidenceScore: 60,
        whatItDoes: "The clause confers power on a State officer, public body or related actor.",
        whyItMatters:
          "Article 1 delegates sovereign power only to specified State organs, and Article 2 forbids the exercise of State authority except as authorised under the Constitution.",
        citizenExplanation:
          "Every public power must come from the Constitution or a law that the Constitution allows Parliament to make.",
        legalExplanation:
          "Most statutory powers are constitutionally permitted. The finding records the power so it can be checked for conflict with a constitutional allocation of authority.",
        counterargument:
          "Parliament routinely establishes statutory authorities under its legislative power in Article 94.",
        whatToInvestigate: "Whether the power conflicts with a function reserved to another organ or level of government.",
        humanReviewRecommended: false,
      },
    ];
  }
  return [];
}

function ruleAmendment(clause: Clause): RuleHit[] {
  if (!/amend(?:s|ment of)? (?:this )?constitution|article \d+ of the constitution is/.test(clause.text.toLowerCase())) {
    return [];
  }
  return [
    {
      ruleId: "ARTICLES_255_257",
      issueType: "legislative_procedure",
      title: "Provision may require constitutional amendment procedure",
      concept: "constitutional amendment",
      provisionIds: ["art-255", "art-256", "art-257"],
      triggeringLanguage: [snippet(clause.text, "constitution")],
      severity: "critical",
      confidenceScore: 88,
      whatItDoes: "The clause appears to change, or functionally alter, a constitutional provision.",
      whyItMatters:
        "Articles 255–257 prescribe how the Constitution may be amended, including referendum requirements for certain matters.",
      citizenExplanation:
        "You cannot change the Constitution with an ordinary Bill. Some changes even need a referendum.",
      legalExplanation:
        "If the Bill's effect is to amend the Constitution, ordinary legislative procedure is not enough. That is a classification and process question of the highest importance.",
      counterargument:
        "The Bill may only refer to the Constitution without altering it, or may be an ordinary statute operating in a space the Constitution leaves to Parliament.",
      whatToInvestigate: "Whether the operative legal effect amends a constitutional text or merely implements it.",
      humanReviewRecommended: true,
    },
  ];
}

const CLAUSE_RULES = [
  ruleDirectConflict,
  ruleDelegation,
  ruleRights,
  ruleAdminJustice,
  ruleTax,
  ruleProcedure,
  ruleEquality,
  ruleOffences,
  ruleSeparation,
  ruleInstitutions,
  ruleProperty,
  rulePower,
  ruleAmendment,
];

export function runClauseRules(clause: Clause): RuleHit[] {
  return CLAUSE_RULES.flatMap((rule) => rule(clause));
}

export function detectEscapeHatches(clauses: Clause[]): RuleHit[] {
  const text = clauses.map((c) => c.text).join("\n");
  const lower = text.toLowerCase();
  const createsBody = /there is established|there is hereby established/.test(lower);
  const broadPowers = /shall have power|all powers necessary|as it considers necessary/.test(lower);
  const regs = /may make regulations|may make rules/.test(lower);
  const noOversight = /not subject to|exempt from|shall not be questioned|no court shall/.test(lower);
  if (!(createsBody && broadPowers && regs && noOversight)) return [];

  const clause = clauses.find((c) => /not subject to|shall not be questioned|no court shall|exempt from/.test(c.text))
    || clauses[0];

  return [
    {
      ruleId: "ESCAPE_HATCH_SYSTEM",
      issueType: "escape_hatch",
      title: "Combined clauses may create an institution with unchecked power",
      concept: "constitutional escape hatch",
      provisionIds: ["art-1", "art-10", "art-47", "art-94", "art-165"],
      triggeringLanguage: ["establishment + broad powers + regulations + reduced oversight"],
      severity: "high",
      confidenceScore: 84,
      whatItDoes:
        "Read together, the Bill establishes a body, gives it wide powers, lets it make regulations, and reduces ordinary oversight or review.",
      whyItMatters:
        "Each clause may look ordinary in isolation. Combined, they can create a centre of public power that is difficult to reconcile with Articles 1, 10, 47, 94(6) and 165.",
      citizenExplanation:
        "One clause creates an Authority. Another gives it huge powers. Another lets it write its own rules. Another says nobody can check it. Together, that is the danger.",
      legalExplanation:
        "This is a system-level finding. Katibaism looks for constitutional workarounds that are invisible clause-by-clause.",
      counterargument:
        "Independence language may be intended to protect a regulator from political interference, which can itself be a constitutional value.",
      whatToInvestigate:
        "The cumulative effect on review, parliamentary control, public participation and rights.",
      humanReviewRecommended: true,
    },
  ].map((hit) => ({ ...hit, clauseNumber: clause.clauseNumber, clauseId: clause.id } as RuleHit));
}

export function detectParticipationGap(clauses: Clause[], classification: BillClassification): RuleHit[] {
  if (!classification.publicParticipationImplicated) return [];
  const text = clauses.map((c) => c.text).join("\n");
  if (/public participation|public consult/.test(text.toLowerCase())) return [];
  return [
    {
      ruleId: "ARTICLE_118_PROCESS",
      issueType: "public_participation",
      title: "Bill text does not record meaningful public participation",
      concept: "public participation",
      provisionIds: ["art-10", "art-118"],
      triggeringLanguage: ["[process evidence absent from the Bill text]"],
      severity: "low",
      confidenceScore: 55,
      whatItDoes:
        "The Bill appears to affect rights, counties, taxation, public resources or regulatory power, but the text itself does not evidence public participation.",
      whyItMatters:
        "Article 10 binds those who enact law to the participation of the people. Article 118 requires Parliament to facilitate public participation. The Bill text and the legislative process are different things.",
      citizenExplanation:
        "For important laws, Kenyans are supposed to be heard. The Bill document itself does not show that this happened.",
      legalExplanation:
        "Absence of process evidence in the Bill is not proof that participation did not occur. It is a question for the surrounding legislative process.",
      counterargument:
        "Public participation is typically recorded in Hansard, committee reports and calls for memoranda, not in the Bill's operative clauses.",
      whatToInvestigate: "National Assembly or Senate committee evidence of meaningful public participation.",
      humanReviewRecommended: false,
    },
  ];
}

export function hitsToFindings(clause: Clause, hits: RuleHit[]): Finding[] {
  return hits.map((hit) => {
    const citations = citationsFor(hit.provisionIds);
    const confidence: Finding["confidence"] =
      hit.confidenceScore >= 80 ? "high" : hit.confidenceScore >= 65 ? "medium" : "low";
    return {
      id: `fnd-${nanoid(8)}`,
      clauseId: clause.id,
      clauseNumber: clause.clauseNumber,
      clauseText: clause.text,
      issueType: hit.issueType,
      title: hit.title,
      whatItDoes: hit.whatItDoes,
      whyItMatters: hit.whyItMatters,
      citizenExplanation: hit.citizenExplanation,
      legalExplanation: hit.legalExplanation,
      counterargument: hit.counterargument,
      whatToInvestigate: hit.whatToInvestigate,
      severity: hit.severity,
      confidence,
      confidenceScore: hit.confidenceScore,
      provisionIds: hit.provisionIds,
      citations,
      triggeringLanguage: hit.triggeringLanguage,
      concepts: [hit.concept],
      rulesTriggered: [hit.ruleId],
      humanReviewRecommended: hit.humanReviewRecommended,
      article24Test: shouldWalkArticle24(hit.provisionIds)
        ? walkArticle24(clause, {
            title: hit.title,
            concept: hit.concept,
            provisionIds: hit.provisionIds,
            triggeringLanguage: hit.triggeringLanguage,
            whatItDoes: hit.whatItDoes,
          })
        : undefined,
      whyFlagged: {
        triggeringLanguage: hit.triggeringLanguage,
        concept: hit.concept,
        retrievedProvisions: citations.map((c) => c.citation),
        rulesTriggered: [hit.ruleId],
        reasoning: hit.legalExplanation,
        counterargument: hit.counterargument,
        confidence: hit.confidenceScore,
      },
    };
  });
}
