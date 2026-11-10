/**
 * Which diagnostic questions she is shown, read from the rules the server
 * sends with each question — the same rules it applies to the submission, so
 * the browser and the server never disagree about what was asked.
 */

import type { DiagnosticQuestion, DiagnosticShowIf } from "@/services/portal";

type Rule = { question: string; in: string[] };

function holds(rule: Rule, byCode: Map<string, string[]>): boolean {
  const chosen = byCode.get(rule.question) ?? [];
  return chosen.some((value) => rule.in.includes(value));
}

export function isShown(rule: DiagnosticShowIf | null, byCode: Map<string, string[]>): boolean {
  if (!rule) return true;
  if ("any" in rule) return rule.any.some((part) => holds(part, byCode));
  return holds(rule, byCode);
}

/** Her answers keyed by question code, which is what the rules name. */
export function answersByCode(
  questions: DiagnosticQuestion[],
  answers: Record<string, string[]>,
): Map<string, string[]> {
  const byCode = new Map<string, string[]>();
  for (const q of questions) {
    const chosen = answers[q.id];
    if (chosen && chosen.length) byCode.set(q.code, chosen);
  }
  return byCode;
}

/** The questions she is shown, in order, given what she has answered. */
export function shownQuestions(
  questions: DiagnosticQuestion[],
  answers: Record<string, string[]>,
): DiagnosticQuestion[] {
  const byCode = answersByCode(questions, answers);
  return questions.filter((q) => isShown(q.show_if, byCode));
}
