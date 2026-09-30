/**
 * What the learning section needs to know about a course she is taking.
 *
 * One shape, built from the two records the API actually returns — the
 * programme and her enrollment — so every screen reads progress the same way.
 * The percentage is the server's: it is computed once, in `services.learning`,
 * and recomputing it in the browser is how two screens start disagreeing about
 * the same course.
 *
 * Cover art is the exception, and deliberately so: a tone and a mark are
 * presentation, not data, and the catalogue has no business storing a colour.
 * They are derived from the category, so a course looks the same everywhere it
 * appears without anyone authoring it.
 */

import type {
  Enrollment,
  EnrollmentDetail,
  Program,
  ProgramDetail,
  ProgramLesson,
} from "@/services/portal";

export type CourseStatus = "not_started" | "in_progress" | "completed";

export type CoverTone = "plum" | "rose" | "sage" | "sand" | "sky" | "ink";

interface Art {
  tone: CoverTone;
  emblem: string;
}

/** One look per programme category, so the twelve read as a set. */
const CATEGORY_ART: Record<string, Art> = {
  vocational_skills: { tone: "plum", emblem: "◆" },
  entrepreneurship: { tone: "sand", emblem: "▲" },
  financial_literacy: { tone: "sage", emblem: "◉" },
  health: { tone: "rose", emblem: "✿" },
  parenting: { tone: "rose", emblem: "❀" },
  ethics_culture: { tone: "sand", emblem: "◈" },
  leadership: { tone: "ink", emblem: "★" },
  legal_literacy: { tone: "sky", emblem: "§" },
  digital_safety: { tone: "sky", emblem: "⛉" },
  international: { tone: "sky", emblem: "✈" },
  mentorship_networking: { tone: "sage", emblem: "◎" },
  volunteering: { tone: "sage", emblem: "✦" },
};

export function art(category: string): Art {
  return CATEGORY_ART[category] ?? { tone: "sand", emblem: "✦" };
}

/** Every lesson of a course, in the order the contents list shows them. */
export function lessonsOf(program: ProgramDetail): ProgramLesson[] {
  return program.modules.flatMap((module) => module.lessons);
}

export function isComplete(enrollment: Enrollment | null, lessonId: string): boolean {
  return Boolean(enrollment?.completed_lessons.includes(lessonId));
}

export function statusOf(enrollment: Enrollment | null): CourseStatus {
  if (!enrollment) return "not_started";
  return enrollment.status === "completed" ? "completed" : "in_progress";
}

export interface CourseView {
  program: Program;
  enrollment: Enrollment | null;
  status: CourseStatus;
  /** The server's number. Null before she enrols — there is no progress yet. */
  percent: number;
  art: Art;
  href: string;
}

export function viewOf(program: Program, enrollment: Enrollment | null = null): CourseView {
  return {
    program,
    enrollment,
    status: statusOf(enrollment),
    percent: enrollment?.progress_percent ?? 0,
    art: art(program.category),
    href: `/talim/kurslar/${program.slug}`,
  };
}

/** Her courses, most recently touched first — the dashboard's reading order. */
export function viewsOf(enrollments: EnrollmentDetail[]): CourseView[] {
  return enrollments
    .filter((enrollment) => enrollment.program !== null)
    .map((enrollment) => viewOf(enrollment.program as Program, enrollment));
}

/** Where "Continue" goes: the first lesson she has not finished, or the card
 *  itself for a course with no lessons written yet. */
export function nextLessonOf(
  program: ProgramDetail,
  enrollment: Enrollment | null,
): ProgramLesson | null {
  return lessonsOf(program).find((lesson) => !isComplete(enrollment, lesson.id)) ?? null;
}

/** How much of the course is left to read, in minutes. Only meaningful once
 *  the contents are loaded, which is why it lives with the detail. */
export function minutesLeft(program: ProgramDetail, enrollment: Enrollment | null): number {
  return lessonsOf(program)
    .filter((lesson) => !isComplete(enrollment, lesson.id))
    .reduce((sum, lesson) => sum + (lesson.duration_minutes ?? 0), 0);
}

export function lessonCounts(
  program: ProgramDetail,
  enrollment: Enrollment | null,
): { done: number; total: number } {
  const lessons = lessonsOf(program);
  return {
    done: lessons.filter((lesson) => isComplete(enrollment, lesson.id)).length,
    total: lessons.length,
  };
}
