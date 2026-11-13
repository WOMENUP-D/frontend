/**
 * Where she is in the diagnostic, told per part. (QA D-11)
 *
 * The profile part branches — a student gets study questions, an interest
 * adds a skills one — so its length is not known until it is answered, and a
 * single "n / total" grew under her (1/14 → 1/16 → 5/18). The scored part
 * never branches. So the profile part counts without a total, the scored part
 * gives its fixed "n of m", and the bar spends half its width on each part,
 * which keeps the scored half from ever moving backwards.
 */

export interface PartProgress {
  /** 1 for the profile part, 2 for the scored part. */
  part: 1 | 2;
  /** How many parts there are (1 when the bank has no scored questions). */
  parts: 1 | 2;
  /** Her position inside the part, from 1. */
  n: number;
  /** The part's length, or null when it is not known in advance. */
  total: number | null;
  /** Bar width, 0-100. */
  percent: number;
}

export function partProgress(
  shown: ReadonlyArray<{ section: string | null }>,
  index: number,
): PartProgress {
  const profile = shown.filter((q) => q.section !== "score").length;
  const scored = shown.length - profile;
  const parts = scored > 0 && profile > 0 ? 2 : 1;
  const inScore = shown[index]?.section === "score";

  if (inScore) {
    const n = index - profile + 1;
    const share = n / Math.max(1, scored);
    return {
      part: parts === 2 ? 2 : 1,
      parts,
      n,
      total: scored,
      percent: parts === 2 ? 50 + share * 50 : share * 100,
    };
  }
  const n = index + 1;
  const share = n / Math.max(1, profile);
  return { part: 1, parts, n, total: null, percent: parts === 2 ? share * 50 : share * 100 };
}
