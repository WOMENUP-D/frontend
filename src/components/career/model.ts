/**
 * How a career journey is shown — pure functions, no React.
 *
 * The server decides every status: which stage she is on, what is done, what
 * the catalogue cannot serve yet. What is decided here is only how each of
 * those reads on screen — which word, which marker, which sentence — so that a
 * stage is never told apart by colour alone and the same state always gets the
 * same words. Kept free of React so it can be tested on its own.
 */

import type { MessageKey } from "@/i18n/messages";
import type {
  CareerDetail,
  CareerStage,
  JourneyStage,
  SkillStatus,
} from "@/services/portal";

/** How a stage is drawn. `now` is the stage she is on, whatever its status. */
export type JourneyState = "done" | "now" | "later" | "unavailable" | "neutral";

export const STAGES: readonly JourneyStage[] = ["learn", "practice", "build", "explore"];

export function stageState(stage: CareerStage, current: JourneyStage | null): JourneyState {
  if (stage.status === "unavailable") return "unavailable";
  if (stage.status === null) return "neutral";
  if (stage.stage === current) return "now";
  if (stage.status === "done") return "done";
  return "later";
}

/** The word shown beside a stage. Every state has one: a marker is never the
 *  only sign of where she is. */
export function stateLabelKey(state: JourneyState, stage: CareerStage): MessageKey | null {
  switch (state) {
    case "now":
      return "car.status.now";
    case "done":
      return "car.status.done";
    case "unavailable":
      return "car.status.unavailable";
    case "later":
      return stage.status === "in_progress" ? "car.status.in_progress" : "car.status.todo";
    default:
      return null;
  }
}

export const stageTitleKey = (stage: JourneyStage) => `car.stage.${stage}` as MessageKey;
export const stageWhatKey = (stage: JourneyStage) => `car.what.${stage}` as MessageKey;

/** The one-line measure under a stage's title, as a key and its numbers.
 *
 *  A visitor has no record, so she is told what exists ("2 practical tasks")
 *  rather than a count of what she has done, which would read as a verdict on
 *  somebody who has not signed in. */
export function stageProgress(
  stage: CareerStage,
): { key: MessageKey; values: Record<string, number> } | null {
  if (stage.status === "unavailable") return null;
  if (stage.status === null) {
    if (stage.stage === "practice" && stage.total) {
      return { key: "car.count.tasks", values: { n: stage.total } };
    }
    if (stage.stage === "explore" && stage.total) {
      return { key: "car.progress.explore", values: { done: 0, total: stage.total } };
    }
    return null;
  }
  const values = { done: stage.done, total: stage.total };
  switch (stage.stage) {
    case "learn":
      return stage.total ? { key: "car.progress.learn", values } : null;
    case "practice":
      return stage.total ? { key: "car.progress.practice", values } : null;
    case "build":
      return { key: "car.progress.build", values };
    case "explore":
      if (stage.done) return { key: "car.progress.applied", values };
      return stage.total ? { key: "car.progress.explore", values } : null;
    default:
      return null;
  }
}

/** Stages that are done, of those WomanUP can offer. */
export function stagesDone(detail: CareerDetail): { done: number; total: number } {
  const offered = detail.stages.filter((stage) => stage.status !== "unavailable");
  return {
    done: offered.filter((stage) => stage.status === "done").length,
    total: offered.length,
  };
}

/** Skills split the way she reads them: what she has, and what to learn. */
export function splitSkills(detail: CareerDetail) {
  const have = detail.skill_details.filter((item) => item.status !== null);
  const need = detail.skill_details.filter((item) => item.status === null);
  return { have, need };
}

export const HELD_RANK: Record<SkillStatus, number> = {
  verified: 0,
  assessed: 1,
  learned: 2,
  self_reported: 3,
};

/** `{name}` placeholders, the convention the whole message catalogue uses. */
export function fill(text: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (out, [name, value]) => out.split(`{${name}}`).join(String(value)),
    text,
  );
}

/** Which drawing a direction gets. Named by slug where one fits, then by the
 *  kind of work, so a direction added later still has a sensible picture. */
export type CareerGlyph =
  | "ledger"
  | "megaphone"
  | "needle"
  | "people"
  | "shop"
  | "craft"
  | "briefcase";

const GLYPHS: Record<string, CareerGlyph> = {
  buxgalter: "ledger",
  "smm-mutaxassis": "megaphone",
  tikuvchi: "needle",
  "loyiha-koordinatori": "people",
  "kichik-biznes": "shop",
  "hunarmand-tadbirkor": "craft",
};

export function glyphFor(slug: string, category: string): CareerGlyph {
  return GLYPHS[slug] ?? (category === "own_business" ? "shop" : "briefcase");
}
