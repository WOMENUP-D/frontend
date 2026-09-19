/** Typed calls for the personal cabinet screens. */

import { api } from "./api";

export interface DevelopmentScore {
  composite: number;
  dimensions: Array<{
    dimension: string;
    baseline: number;
    current: number;
    target: number | null;
    progress: number;
  }>;
  weakest_dimensions: string[];
  measured_at?: string | null;
}

export interface NextStepCard {
  title: string;
  description: string;
  action_url: string | null;
  dimension: string | null;
}

// ---- Recommendations and the score read dimension by dimension -------------
//
// Reasons arrive as keys with the numbers they quote, never as sentences: the
// browser writes them in her language (see components/Recommendations.tsx).

export type DimensionBand = "strong" | "developing" | "focus";

export type NextStepKind =
  | "take_assessment"
  | "plan_item"
  | "review_plan"
  | "create_plan"
  | "continue_program"
  | "start_program"
  | "continue_path"
  | "start_path"
  | "practise_task"
  | "improve_task"
  | "add_project"
  | "explore_opportunities";

export type RecommendationReason =
  | "no_assessment"
  | "in_your_plan"
  | "plan_awaiting"
  | "no_plan"
  | "enrolled"
  | "in_progress"
  | "focus_dimension"
  | "skills_match"
  | "needs_improvement"
  | "evidence_to_show"
  | "career_skill";

export type StepParams = Record<string, number | string>;

// ---- Skills ---------------------------------------------------------------
//
// A skill crosses the API as a reference: a stable slug plus its names. `label`
// is the word the author or the partner platform wrote, and is what the browser
// falls back to for a skill nobody has curated yet.

export type SkillStatus = "self_reported" | "learned" | "assessed" | "verified";

export type ProficiencyLevel =
  | "beginner"
  | "elementary"
  | "intermediate"
  | "advanced"
  | "expert";

export type EvidenceKind =
  | "self_reported"
  | "course_completion"
  | "learning_path"
  | "certificate"
  | "practical_project"
  | "ai_assessment"
  | "formal_assessment"
  | "mentor_assessment"
  | "employer_assessment"
  | "internship"
  | "job_outcome";

export interface SkillRef {
  slug: string | null;
  name_i18n: Record<string, string>;
  label: string;
  category: string | null;
  dimensions: string[];
}

export interface SkillEvidence {
  kind: EvidenceKind;
  /** What this one piece of evidence can support on its own. */
  supports: SkillStatus;
  level: ProficiencyLevel | null;
  score: number | null;
  /** The course or certificate behind it, when there is one. */
  title_i18n: Record<string, string>;
  reference: string | null;
  occurred_at: string | null;
}

export interface UserSkill {
  skill: SkillRef;
  status: SkillStatus | null;
  level: ProficiencyLevel | null;
  evidence_count: number;
  evidence: SkillEvidence[];
  /** Progress of a course she is taking that teaches it. */
  progress_percent: number | null;
}

export interface SkillGap {
  skill: SkillRef;
  dimension: string | null;
  programs: number;
  opportunities: number;
  program_id: string | null;
  program_title_i18n: Record<string, string>;
}

export interface SkillProfile {
  skills: UserSkill[];
  improve: SkillGap[];
}

/** A goal she set for herself, on a 3/6/12/36-month horizon. */
export interface Goal {
  id: string;
  title: string;
  description: string | null;
  horizon: string;
  dimension: string | null;
  priority: string;
  target_date: string | null;
  achieved: boolean;
}

export interface Notification {
  id: string;
  channel: string;
  trigger: string | null;
  title: string;
  body: string;
  action_url: string | null;
  sent_at: string | null;
  /** When she opened it. Null is unread — the server keeps the timestamp
   *  rather than a flag, so "when" is answerable later. */
  read_at: string | null;
  created_at: string;
}

export interface ProgramSuggestion {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  category: string;
  duration_weeks: number | null;
  has_certificate: boolean;
  skills_taught: SkillRef[];
  new_skills: SkillRef[];
  enrollment_status: string | null;
  progress_percent: number | null;
  dimension: string | null;
  reason: RecommendationReason;
  params: StepParams;
}

export interface OpportunitySuggestion {
  id: string;
  type: string;
  title_i18n: Record<string, string>;
  organisation: string | null;
  region: string | null;
  deadline: string | null;
  /** Null when the listing names no skills — there is nothing to match. */
  match: number | null;
  matched_skills: SkillRef[];
  missing_skills: SkillRef[];
  dimension: string | null;
  reason: RecommendationReason;
  params: StepParams;
}

/** A learning path as a recommendation names it: the route, and how far along
 *  it she is. Lighter than what the path screens read — the route itself is one
 *  tap away. */
export interface PathSuggestion {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  dimension: string | null;
  level: ProficiencyLevel | null;
  program_count: number;
  completed_count: number;
  percent: number;
  started: boolean;
  new_skills: SkillRef[];
  reason: RecommendationReason;
  params: StepParams;
}

/** A practical task, and why it is offered. */
export interface TaskSuggestion {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  level: ProficiencyLevel | null;
  estimated_minutes: number | null;
  skills: SkillRef[];
  status: TaskStatus | null;
  reason: RecommendationReason;
  params: StepParams;
}

export interface NextStep {
  kind: NextStepKind;
  reason: RecommendationReason;
  dimension: string | null;
  params: StepParams;
  program: ProgramSuggestion | null;
  path: PathSuggestion | null;
  task: TaskSuggestion | null;
  plan_item_id: string | null;
  /** A plan step's own words, in the language the plan was written in. */
  text: string | null;
  due_date: string | null;
  opportunity_types: string[];
}

export interface Recommendations {
  assessed: boolean;
  next_steps: NextStep[];
  programs: ProgramSuggestion[];
  paths: PathSuggestion[];
  tasks: TaskSuggestion[];
  opportunities: OpportunitySuggestion[];
}

export interface AnswerInsight {
  question_id: string;
  text_i18n: Record<string, string>;
  answer_i18n: Record<string, string>;
  value: number;
}

export interface DimensionInsight {
  dimension: string;
  baseline: number;
  current: number;
  target: number | null;
  progress: number;
  weight: number;
  band: DimensionBand;
  strengths: AnswerInsight[];
  weaknesses: AnswerInsight[];
  skill_gaps: SkillRef[];
  actions: NextStep[];
}

/** A superset of `DevelopmentScore`, so anything that draws the score reads it too. */
export interface ScoreInsights extends DevelopmentScore {
  dimensions: DimensionInsight[];
  focus_dimensions: string[];
}

export interface Question {
  id: string;
  dimension: string;
  order_index: number;
  text_i18n: Record<string, string>;
  options: Array<{ value: number; label_i18n: Record<string, string> }>;
}

export type LessonKind = "video" | "reading" | "practice" | "quiz" | "project";

/** A lesson as the contents list shows it — without its body. */
export interface ProgramLesson {
  id: string;
  order_index: number;
  slug: string;
  title_i18n: Record<string, string>;
  kind: LessonKind;
  duration_minutes: number | null;
}

/** One lesson, opened: the blocks are the text she reads. */
export interface ProgramLessonDetail extends ProgramLesson {
  module_id: string;
  blocks: LessonBlock[];
  resources: LessonResource[];
  media_url: string | null;
}

export type LessonBlock =
  | { type: "paragraph"; text: Record<string, string> }
  | { type: "heading"; text: Record<string, string> }
  | { type: "list"; items: Array<Record<string, string>> }
  | { type: "code"; language: string; code: string }
  | { type: "callout"; text: Record<string, string> }
  | { type: "figure"; caption: Record<string, string>; tone?: string; emblem?: string };

export interface LessonResource {
  title: Record<string, string>;
  kind: "pdf" | "link" | "code";
  href: string;
}

export interface ProgramModule {
  id: string;
  order_index: number;
  title_i18n: Record<string, string>;
  content_i18n: Record<string, string>;
  media_url: string | null;
  duration_minutes: number | null;
  lessons: ProgramLesson[];
}

export interface ProgramDetail extends Program {
  modules: ProgramModule[];
  /** `skills_taught`, resolved to the taxonomy so it reads in her language. */
  skills: SkillRef[];
  description_i18n: Record<string, string>;
  next_step: string | null;
  assessment_type: string | null;
}

export interface Program {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  goal_i18n: Record<string, string>;
  category: string;
  format: string;
  /** How demanding the course is. Null when nobody has classified it. */
  level: ProficiencyLevel | null;
  duration_hours: number | null;
  duration_weeks: number | null;
  skills_taught: string[];
  learning_outcomes: Array<Record<string, string>>;
  has_certificate: boolean;
  provider: string | null;
}

/* ---- practical tasks --------------------------------------------------
 *
 * Work she does and is assessed on. Everything here is a server answer: the
 * status, the verdict, the feedback and what a pass proved. The browser never
 * decides whether she passed — `submitted` means it is waiting, and only an
 * `evaluation` says otherwise. */

export type TaskSubmissionKind = "text" | "link" | "fields";
export type TaskStatus = "started" | "submitted" | "passed" | "needs_improvement";
export type EvaluatorKind = "ai" | "trainer" | "mentor" | "partner";

export interface TaskCriterion {
  key: string;
  text_i18n: Record<string, string>;
}

export interface TaskField {
  key: string;
  label_i18n: Record<string, string>;
  min_chars: number;
}

export interface CriterionVerdict {
  key: string;
  met: boolean;
  note: string;
}

/** What came back. Absent entirely until somebody actually assessed it —
 *  absence is how "not assessed yet" is said, and it is never a failure. */
export interface TaskEvaluation {
  passed: boolean;
  score: number | null;
  feedback: string;
  criteria_met: CriterionVerdict[];
  evaluator_kind: EvaluatorKind | null;
  evaluated_at: string | null;
  /** What the pass wrote into her skill record. Empty when it did not pass. */
  skills_evidenced: SkillRef[];
}

export interface TaskAttempt {
  id: string;
  attempt_no: number;
  status: TaskStatus;
  submission: { text?: string; link?: string; fields?: Record<string, string> };
  started_at: string | null;
  submitted_at: string | null;
  evaluation: TaskEvaluation | null;
}

export interface PracticalTask {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  summary_i18n: Record<string, string>;
  kind: TaskSubmissionKind;
  level: ProficiencyLevel | null;
  estimated_minutes: number | null;
  skills: SkillRef[];
  new_skills: SkillRef[];
  program_id: string | null;
  program_slug: string | null;
  program_title_i18n: Record<string, string>;
  ai_reviewed: boolean;
  /** Null for a visitor, and for a woman who has never opened it — which is a
   *  different thing from "started". */
  status: TaskStatus | null;
  attempts: number;
}

export interface PracticalTaskDetail extends PracticalTask {
  instructions_i18n: Record<string, string>;
  outcome_i18n: Record<string, string>;
  criteria: TaskCriterion[];
  fields: TaskField[];
  min_chars: number | null;
  /** Newest first. A retry is a new attempt, so this is the story of the work. */
  my_attempts: TaskAttempt[];
  /** The server's answer, not a reason to grey a button — it refuses either way. */
  can_start: boolean;
  can_submit: boolean;
}

/* ---- portfolio --------------------------------------------------------
 *
 * A presentation layer over records other parts of the platform own. Every
 * count, certificate, achievement and skill status here is the server's
 * reading of a real row; the browser shows it and never adds anything up. */

export type AchievementType =
  | "course_completed"
  | "certificate_earned"
  | "learning_path_completed"
  | "practical_task_passed"
  | "skill_verified"
  | "project_completed"
  | "work_experience"
  | "business_milestone";

export interface Achievement {
  /** `{type}:{source_id}` — unique by construction. */
  key: string;
  type: AchievementType;
  title_i18n: Record<string, string>;
  /** A machine value worded in the browser: an evidence kind, an outcome
   *  type, an evaluator kind, a certificate serial. */
  detail: string | null;
  earned_at: string | null;
  /** Her own record, not checked by anyone on the platform. */
  self_declared: boolean;
  href: string | null;
}

export interface PortfolioSkill {
  skill: SkillRef;
  status: SkillStatus;
  level: ProficiencyLevel | null;
  evidence: SkillEvidence[];
}

export interface PortfolioSkills {
  verified: PortfolioSkill[];
  assessed: PortfolioSkill[];
  learned: PortfolioSkill[];
}

export interface PortfolioCertificate {
  id: string;
  serial_number: string;
  issued_at: string;
  verification_code: string;
  program_slug: string | null;
  program_title_i18n: Record<string, string>;
  skills: SkillRef[];
}

export interface PortfolioPractice {
  task_slug: string;
  title_i18n: Record<string, string>;
  status: TaskStatus;
  evaluated_at: string | null;
  evaluator_kind: EvaluatorKind | null;
  skills: SkillRef[];
}

export interface PortfolioProject {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  skills: SkillRef[];
  project_url: string | null;
  repo_url: string | null;
  demo_url: string | null;
  completed_on: string | null;
  is_public: boolean;
  created_at: string | null;
}

export type PortfolioSectionKey = "skills" | "certificates" | "achievements" | "practice";

export interface PortfolioSettings {
  is_public: boolean;
  slug: string | null;
  published_at: string | null;
  sections: Record<PortfolioSectionKey, boolean>;
  can_publish: boolean;
  /** `minor` — under 18, or an age the platform does not know. */
  publish_blocked: string | null;
}

export interface Portfolio {
  person: { first_name: string | null; profession: string | null; bio: string | null };
  settings: PortfolioSettings;
  overview: {
    achievements: number;
    certificates: number;
    learned: number;
    assessed: number;
    verified: number;
    practice_passed: number;
    practice_submitted: number;
    projects: number;
  };
  skills: PortfolioSkills;
  certificates: PortfolioCertificate[];
  achievements: Achievement[];
  practice: PortfolioPractice[];
  projects: PortfolioProject[];
}

/** What a stranger with the link may read. A hidden section is `null`, not
 *  empty — absent, so the page never says "no certificates" about something
 *  she simply chose not to show. */
export interface PublicPortfolio {
  first_name: string | null;
  profession: string | null;
  bio: string | null;
  skills: PortfolioSkills | null;
  certificates: PortfolioCertificate[] | null;
  achievements: Achievement[] | null;
  practice: PortfolioPractice[] | null;
  projects: PortfolioProject[];
}

export interface ProjectInput {
  title: string;
  summary?: string | null;
  description?: string | null;
  /** Skill slugs or spellings; each must resolve to an existing skill. */
  skills?: string[];
  project_url?: string | null;
  repo_url?: string | null;
  demo_url?: string | null;
  completed_on?: string | null;
  is_public?: boolean;
  client_ref?: string;
}

/* ---- AI Coach --------------------------------------------------------
 *
 * Two shapes, and the split is the architecture. The context is computed
 * without a model call — her score, her canonical skills, her real enrollments
 * and the deterministic engine's own ranking — so "where you are" and "what to
 * do next" are always true and render instantly. The reply is the
 * conversation, and its `references` were resolved against those same real
 * records on the server, so a reference that arrives here is one the database
 * holds. */

export interface CoachSkill {
  skill: SkillRef;
  status: SkillStatus | null;
  level: ProficiencyLevel | null;
  evidence_count: number;
}

/** Grouped, because the groups are the point: a course makes a skill
 *  *learned*, and only a person or a placement makes it *verified*. */
export interface CoachSkills {
  verified: CoachSkill[];
  assessed: CoachSkill[];
  learned: CoachSkill[];
  self_reported: CoachSkill[];
  gaps: SkillGap[];
}

export interface CoachDimension {
  dimension: string;
  current: number;
  band: DimensionBand;
}

export interface CoachScore {
  assessed: boolean;
  composite: number | null;
  dimensions: CoachDimension[];
  strengths: string[];
  focus: string[];
}

export interface CoachCourse {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  /** The server's figure. Never recomputed in the browser. */
  progress_percent: number;
  status: EnrollmentStatus;
  next_lesson_slug: string | null;
  next_lesson_title_i18n: Record<string, string>;
}

export interface CoachLearning {
  in_progress: CoachCourse[];
  completed: CoachCourse[];
  certificates: number;
}

export interface CoachPathState {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  status: PathStatus;
  percent: number;
  completed_items: number;
  required_items: number;
  next_program_slug: string | null;
  next_program_title_i18n: Record<string, string>;
}

/** A question worth asking, chosen from her actual state. `key` names the
 *  phrasing in the catalogue; `params` carries the facts it quotes. */
/** Her practice, as the Coach reads it. Counts and the few tasks worth naming. */
export interface CoachPractice {
  open_tasks: number;
  awaiting_review: number;
  needs_improvement: number;
  passed: number;
  next_task_slug: string | null;
  next_task_title_i18n: Record<string, string>;
  /** The evaluator's own words, quoted. Empty when nobody wrote any. */
  last_feedback: string;
  available_slugs: string[];
}

export interface CoachPortfolioState {
  certificates: Array<{ title_i18n: Record<string, string>; serial: string }>;
  projects: string[];
  achievements: number;
  is_public: boolean;
}

export interface CoachSuggestion {
  key: string;
  params: Record<string, string>;
}

// ---- Career paths --------------------------------------------------------
//
// A direction toward a kind of work. Everything it names — courses, tasks,
// listings — is a live record the server looked up, and where she stands is
// read from her records on every request. The browser only words it.

export type CareerCategory = "employment" | "own_business";
export type JourneyStage = "learn" | "practice" | "build" | "explore";
export type StageStatus = "done" | "in_progress" | "todo" | "unavailable";
export type StageReason = "no_courses" | "no_tasks" | "no_listings" | "adults_only";

export interface CareerFit {
  have: number;
  total: number;
  chosen: boolean;
}

export interface CareerCard {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  summary_i18n: Record<string, string>;
  category: CareerCategory;
  level: ProficiencyLevel | null;
  skills: SkillRef[];
  dimensions: string[];
  counts: { programs: number; tasks: number; opportunities: number };
  /** Null for a visitor: there is nobody to have a fit. */
  fit: CareerFit | null;
  suggested: boolean;
}

export interface CareerSkill {
  skill: SkillRef;
  /** Null when she does not hold it — or for a visitor. */
  status: SkillStatus | null;
  programs: number;
  tasks: number;
  opportunities: number;
}

export interface CareerStage {
  stage: JourneyStage;
  /** Null for a visitor, except a stage the catalogue cannot serve at all. */
  status: StageStatus | null;
  reason: StageReason | null;
  done: number;
  total: number;
}

export interface CareerJourney {
  chosen: boolean;
  chosen_at: string | null;
  have: number;
  total: number;
  current: JourneyStage | null;
  next_step: NextStep | null;
  dimension_notes: { dimension: string; score: number; band: DimensionBand }[];
  evidence: {
    certificates: { title_i18n: Record<string, string>; serial_number: string }[];
    passed_tasks: { slug: string; title_i18n: Record<string, string> }[];
    projects: { id: string; title: string }[];
  };
  applications: number;
}

export interface CareerDetail extends CareerCard {
  description_i18n: Record<string, string>;
  learning_path: PathSuggestion | null;
  skill_details: CareerSkill[];
  programs: ProgramSuggestion[];
  tasks: TaskSuggestion[];
  opportunities: OpportunitySuggestion[];
  stages: CareerStage[];
  /** Only ever hers, and absent for a visitor. */
  journey: CareerJourney | null;
}

export interface CoachCareerOption {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  have: number;
  total: number;
}

export interface CoachCareer extends CoachCareerOption {
  missing: SkillRef[];
  current: JourneyStage | null;
  next_kind: NextStepKind | null;
  opportunities: number;
  listings_withheld: boolean;
  weak_dimensions: string[];
}

export interface CoachContext {
  personalised: boolean;
  name: string | null;
  language: string;
  score: CoachScore;
  skills: CoachSkills;
  learning: CoachLearning;
  practice: CoachPractice;
  portfolio: CoachPortfolioState;
  paths: CoachPathState[];
  careers: CoachCareerOption[];
  career: CoachCareer | null;
  next_steps: NextStep[];
  opportunities: OpportunitySuggestion[];
  suggestions: CoachSuggestion[];
}

/** A real WomanUP record the answer points at. Only ever built on the server
 *  from a record it looked up, so this cannot name a course that does not
 *  exist. */
export interface CoachReference {
  kind: "program" | "learning_path" | "practical_task" | "opportunity" | "career_path" | "event";
  id: string;
  slug: string | null;
  title_i18n: Record<string, string>;
}

export interface CoachReply {
  message: string;
  trace_id: string;
  personalised: boolean;
  /** True when her records genuinely could not answer — said out loud rather
   *  than filled in with something plausible. */
  unsupported: boolean;
  escalated: boolean;
  escalation_reason: string | null;
  /** False when the deterministic fallback wrote this because the provider was
   *  unreachable. The answer is still real; it just was not generated. */
  generated: boolean;
  next_step: CoachReference | null;
  references: CoachReference[];
}

/* ---- learning paths --------------------------------------------------
 *
 * A path is an order to take existing courses in, and nothing more: it owns no
 * lessons and keeps no progress. Everything numeric below is derived by the
 * server from her enrollments, which is why the browser never adds a step up
 * itself. */

export type PathItemStatus = "locked" | "available" | "in_progress" | "completed";
export type PathStatus = "not_started" | "in_progress" | "completed";

export interface LearningPathItem {
  program: Program;
  order_index: number;
  is_required: boolean;
  skills: SkillRef[];
  status: PathItemStatus;
  /** The enrollment's own figure, or null before she enrols. */
  progress_percent: number | null;
  enrollment_id: string | null;
}

export interface LearningPathProgress {
  status: PathStatus;
  /** Share of the *required* steps finished. Optional steps widen a route
   *  rather than lengthening it, so they are not in the denominator. */
  percent: number;
  completed_items: number;
  required_items: number;
  total_items: number;
  started_at: string | null;
  completed_at: string | null;
  current_program_id: string | null;
  next_program_id: string | null;
}

export interface LearningPath {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  dimension: string | null;
  level: ProficiencyLevel | null;
  program_count: number;
  required_count: number;
  /** Summed off the courses in the route; null when none of them says. */
  total_hours: number | null;
  total_weeks: number | null;
  skills: SkillRef[];
  new_skills: SkillRef[];
  progress: LearningPathProgress;
}

export interface LearningPathDetail extends LearningPath {
  items: LearningPathItem[];
}

export type EnrollmentStatus = "enrolled" | "in_progress" | "completed" | "dropped";

/** Progress is the backend's answer, never recomputed in the browser. */
export interface Enrollment {
  id: string;
  program_id: string;
  status: EnrollmentStatus;
  progress_percent: number;
  completed_modules: string[];
  completed_lessons: string[];
  final_score: number | null;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
}

/** An enrollment with the course it belongs to, so a list can name it. */
export interface EnrollmentDetail extends Enrollment {
  program: Program | null;
}

export interface Certificate {
  id: string;
  serial_number: string;
  issued_at: string;
  file_url: string | null;
  verification_code: string;
  program_id: string | null;
  program_title_i18n: Record<string, string>;
}

/** One card in the news feed. The body is deliberately absent: the feed is
 *  scrolled, and shipping every article to draw a list of cards is what makes
 *  a feed slow on a regional connection. */
export interface NewsPost {
  id: string;
  slug: string;
  category: string;
  title_i18n: Record<string, string>;
  summary_i18n: Record<string, string>;
  /** A photograph when the editor attached one; the drawn cover otherwise. */
  cover_url: string | null;
  cover_tone: string;
  cover_emblem: string;
  source_name: string | null;
  source_url: string | null;
  tags: string[];
  region: string | null;
  reading_minutes: number | null;
  is_pinned: boolean;
  published_at: string | null;
}

export interface NewsDetail extends NewsPost {
  /** Paragraphs, separated by blank lines. */
  body_i18n: Record<string, string>;
  is_adult_only: boolean;
  /** Present for editors; the reader is never shown the personalisation
   *  maths, so nothing in this app renders either of these. */
  topics: string[];
  age_relevance: Record<string, number>;
}

/** A card in the "For you" section. */
export interface PersonalisedNewsPost extends NewsPost {
  /** Why this post is here, as i18n keys — `interest:science`, `age`,
   *  `important`. Keys rather than sentences because the feed is read in three
   *  languages, and a score would not be an explanation. */
  reasons: string[];
}

export interface ForYouFeed {
  items: PersonalisedNewsPost[];
  /** False when we know neither her age nor a single chosen subject. The
   *  section is not drawn at all in that case: naming it after a reader who
   *  supplied nothing would be a lie with a headline on it. */
  personalised: boolean;
  age_group: string | null;
  interests: string[];
}

export interface NewsPreferences {
  age: number | null;
  age_group: string | null;
  /** `birth_date` when it came from a real date of birth — in which case the
   *  screen shows it as a fact rather than offering to overwrite it with a
   *  worse number. */
  age_source: string | null;
  interests: string[];
  available_interests: string[];
  /** The six brackets, youngest first. The screen offers these rather than a
   *  free number field: only the bracket is stored, so a typed 15 would read
   *  back as 13 and look like the form had lost her answer. */
  available_age_groups: string[];
}

export interface Opportunity {
  id: string;
  source: string;
  type: string;
  title_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  organisation: string | null;
  region: string | null;
  required_skills: string[];
  reward: Record<string, unknown>;
  deadline: string | null;
  /** Set only for an event: when and where it happens. */
  starts_at?: string | null;
  ends_at?: string | null;
  format?: EventFormat | null;
  venue?: string | null;
}

export type EventFormat = "online" | "offline";

/** Aggregate shape of the live catalogue — what the landing page can promise
 *  a visitor before it asks her to register. */
export interface OpportunityStats {
  total: number;
  by_type: Record<string, number>;
  by_source: Record<string, number>;
  regions: number;
}

export interface OpportunityMatch extends Opportunity {
  match_score: number;
  matched_skills: SkillRef[];
  missing_skills: SkillRef[];
  explanation: string;
}

// ---- Discovery: jobs, internships and every other listing -------------------
//
// Everything personal here is computed on the server: her fit, whether she may
// apply, her application, whether she saved it. The browser words it.

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "accepted"
  | "rejected"
  | "withdrawn";

export type EligibilityReason =
  | "closed"
  | "too_young"
  | "too_old"
  | "adults_only"
  | "age_unknown"
  | "other_requirements";

export interface Eligibility {
  status: "eligible" | "unknown" | "not_eligible";
  reason: EligibilityReason | null;
  age_min: number | null;
  age_max: number | null;
  may_apply: boolean;
}

export interface MatchReason {
  /** `own_business`, `interest` and `score` appear only on "For your business". */
  kind: "skill" | "career" | "region" | "own_business" | "interest" | "score";
  skill: SkillRef | null;
  status: SkillStatus | null;
  /** The course, certificate or task that backs the skill, when there is one. */
  source_i18n: Record<string, string>;
  career_slug: string | null;
  career_title_i18n: Record<string, string>;
  /** For `score`: the diagnostic dimension and her real score in it. */
  dimension: string | null;
  score: number | null;
}

export interface MissingSkill {
  skill: SkillRef;
  /** Real courses on WomanUP that teach it. Often none. */
  programs: { id: string; slug: string; title_i18n: Record<string, string>; in_progress: boolean }[];
}

export interface OpportunityFit {
  have: number;
  total: number;
  reasons: MatchReason[];
  missing: MissingSkill[];
  on_career: boolean;
}

export interface OpportunityCard extends Opportunity {
  external_url: string | null;
  is_open: boolean;
  skills: SkillRef[];
  /** Null for a visitor. */
  fit: OpportunityFit | null;
  eligibility: Eligibility | null;
  application_status: ApplicationStatus | null;
  saved: boolean;
  /** Set when an organisation published the listing on WomanUP itself. */
  organization: OrganizationBrief | null;
}

/** The organisation behind a WomanUP-published listing — public fields only;
 *  `slug` only when its page is published. */
export interface OrganizationBrief {
  id: string;
  name: string;
  kind: OrganizationKind;
  is_verified: boolean;
  slug: string | null;
  logo_url: string | null;
}

export type OrganizationKind =
  | "employer"
  | "education_provider"
  | "investor"
  | "ngo"
  | "government";

/** "For your business": a few real listings, each with the reasons it is here. */
export interface BusinessRead {
  items: OpportunityCard[];
  total_open: number;
  /** What the server could read about her — the empty state says what would help. */
  signals: { own_business?: boolean; career?: boolean; interests?: boolean; score?: boolean };
}

export interface OpportunityFacets {
  types: Record<string, number>;
  regions: Record<string, number>;
  skills: { skill: SkillRef; count: number }[];
}

export interface OpportunityDiscover {
  items: OpportunityCard[];
  total: number;
  page: number;
  size: number;
  facets: OpportunityFacets;
  signed_in: boolean;
  applications: number;
  saved: number;
}

export interface OpportunitySummary {
  id: string;
  type: string;
  source: string;
  title_i18n: Record<string, string>;
  organisation: string | null;
  region: string | null;
  deadline: string | null;
  is_open: boolean;
  /** For an event, when it starts — its page is under /tadbirlar. */
  starts_at?: string | null;
}

export interface ApplicationRecord {
  id: string;
  opportunity_id: string;
  status: ApplicationStatus;
  submitted_at: string | null;
  resolved_at: string | null;
  created_at: string;
  status_history: { status: ApplicationStatus; at: string }[];
  opportunity: OpportunitySummary | null;
  can_withdraw: boolean;
}

export interface OpportunityDetail extends OpportunityCard {
  sharing: {
    partner: string | null;
    consent_scope: string | null;
    consent_given: boolean;
    /** Exactly the fields the partner receives. */
    fields: string[];
    /** For a listing an organisation published here: who reads her profile. */
    organization: OrganizationBrief | null;
  };
  application: ApplicationRecord | null;
  other_requirements: string[];
}

export interface DiscoverParams {
  type?: string | null;
  /** Business listings only: grants, investment, mentoring, markets, contests, advice. */
  business?: boolean;
  region?: string | null;
  skill?: string | null;
  search?: string | null;
  include_closed?: boolean;
  sort?: "match" | "deadline" | null;
  page?: number;
  size?: number;
}

// ---- Organisations -----------------------------------------------------------
//
// An organisation's people are PARTNER or TRAINER accounts that are members of
// it. What it may read about a woman is decided on the server: the fields she
// agreed to share with it, or — before she accepts an invitation — an
// anonymous card with a pseudonym that is different for every organisation.

export type OrgMemberRole = "owner" | "member";
export type InvitationStatus = "pending" | "accepted" | "declined" | "withdrawn";

export interface OrgListingSummary {
  id: string;
  type: string;
  title_i18n: Record<string, string>;
  region: string | null;
  deadline: string | null;
}

export interface OrganizationPublic {
  slug: string;
  name: string;
  kind: OrganizationKind;
  is_verified: boolean;
  description_i18n: Record<string, string>;
  industry: string | null;
  region: string | null;
  city: string | null;
  website: string | null;
  logo_url: string | null;
  listings: OrgListingSummary[];
  programmes: { id: string; slug: string; title_i18n: Record<string, string> }[];
}

export interface OrganizationRead {
  id: string;
  slug: string;
  name: string;
  kind: OrganizationKind;
  description_i18n: Record<string, string>;
  industry: string | null;
  region: string | null;
  city: string | null;
  website: string | null;
  logo_url: string | null;
  is_public: boolean;
  is_verified: boolean;
  verified_at: string | null;
  is_active: boolean;
  my_role: OrgMemberRole | null;
}

export interface OrganizationProfileIn {
  description_i18n?: Record<string, string>;
  industry?: string | null;
  region?: string | null;
  city?: string | null;
  website?: string | null;
  logo_url?: string | null;
  is_public?: boolean;
}

export interface OrgMember {
  user_id: string;
  role: OrgMemberRole;
  first_name: string | null;
  email: string | null;
}

export interface ListingReward {
  salary_from?: number;
  salary_to?: number;
  amount?: number;
  stipend?: number;
  text?: string;
}

export interface ListingIn {
  type: string;
  title_i18n: Record<string, string>;
  description_i18n?: Record<string, string>;
  region?: string | null;
  skills?: string[];
  reward?: ListingReward;
  eligibility?: { age_min?: number; age_max?: number };
  deadline?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  format?: EventFormat | null;
  venue?: string | null;
}

export interface OrgListing {
  id: string;
  type: string;
  title_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  region: string | null;
  skills: SkillRef[];
  reward: ListingReward;
  eligibility: { age_min?: number; age_max?: number };
  deadline: string | null;
  starts_at: string | null;
  ends_at: string | null;
  format: EventFormat | null;
  venue: string | null;
  is_open: boolean;
  applications: number;
  created_at: string | null;
}

export interface CandidateSkill {
  skill: SkillRef;
  /** learned / assessed / verified — or self_reported, her own word. */
  status: string;
}

/** Exactly the fields she agreed to share. Nothing else is ever sent. */
export interface CandidateProfile {
  first_name: string | null;
  region: string | null;
  language: string | null;
  education_level: string | null;
  employment_status: string | null;
  profession: string | null;
  years_of_experience: number | null;
  skills: CandidateSkill[];
  public_portfolio: string | null;
}

export interface OrgApplication {
  id: string;
  status: ApplicationStatus;
  submitted_at: string | null;
  resolved_at: string | null;
  status_history: { status: ApplicationStatus; at: string; note?: string | null }[];
  listing: OrgListingSummary;
  profile: CandidateProfile | null;
  hidden: "withdrawn" | "consent_withdrawn" | null;
  next: ApplicationStatus[];
}

/** A findable candidate before she accepts: a pseudonym, never an id. */
export interface CandidateCard {
  ref: string;
  region: string | null;
  education_level: string | null;
  years_of_experience: number | null;
  skills: CandidateSkill[];
  certificates: number;
  passed_tasks: number;
  invitation: InvitationStatus | null;
}

export interface OrgInvitation {
  id: string;
  ref: string;
  status: InvitationStatus;
  opportunity_id: string | null;
  message: string | null;
  created_at: string;
  responded_at: string | null;
  profile: CandidateProfile | null;
}

export interface MyInvitation {
  id: string;
  status: InvitationStatus;
  message: string | null;
  created_at: string;
  organization: OrganizationBrief;
  opportunity: OrgListingSummary | null;
  /** What accepting would share — shown before she decides. */
  fields: string[];
}

export interface OrganizationAdmin extends OrganizationRead {
  members: OrgMember[];
  listings: number;
}

// ---- Events -----------------------------------------------------------------
//
// An event is a listing with a time. Why it suits her, whether she may
// register, her reminder — all decided on the server; the page words it.

export interface EventReason {
  kind: "career" | "learning" | "skill" | "interest" | "score" | "own_business" | "region";
  skill: SkillRef | null;
  career_slug: string | null;
  career_title_i18n: Record<string, string>;
  program_title_i18n: Record<string, string>;
  dimension: string | null;
  score: number | null;
}

export interface EventCard extends Omit<OpportunityCard, "fit"> {
  fit: null;
  starts_at: string;
  ends_at: string | null;
  format: EventFormat | null;
  venue: string | null;
  /** The age range the organiser states. Neither set means adults. */
  age_min: number | null;
  age_max: number | null;
  happening: boolean;
  reminder_at: string | null;
  reasons: EventReason[];
}

export interface EventFacets {
  types: Record<string, number>;
  formats: Record<string, number>;
  regions: Record<string, number>;
  topics: { skill: SkillRef; count: number }[];
}

export interface EventCatalogue {
  items: EventCard[];
  total: number;
  facets: EventFacets;
  signed_in: boolean;
}

export interface EventDetail extends EventCard {
  sharing: OpportunityDetail["sharing"];
  application: ApplicationRecord | null;
  other_requirements: string[];
  registration: "platform" | "external";
}

export interface EventParams {
  type?: string | null;
  format?: EventFormat | null;
  region?: string | null;
  topic?: string | null;
  mine?: boolean;
  from?: string | null;
  to?: string | null;
  size?: number;
}

/** Her week: one of each kind of next thing, each real or absent. */
export interface WeekRead {
  lesson: {
    program_id: string;
    program_slug: string;
    program_title_i18n: Record<string, string>;
    lesson_title_i18n: Record<string, string>;
    progress: number;
  } | null;
  event: EventCard | null;
  event_why: "yours" | "suggested" | null;
  task: {
    id: string;
    slug: string;
    title_i18n: Record<string, string>;
    estimated_minutes: number | null;
    status: string | null;
    reason: string;
  } | null;
  opportunity: {
    id: string;
    type: string;
    title_i18n: Record<string, string>;
    organisation: string | null;
    deadline: string | null;
    why: "saved" | "suggested";
  } | null;
}

export interface PlanItem {
  id: string;
  order_index: number;
  action: string;
  description: string | null;
  dimension: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  program_id: string | null;
}

export interface Plan {
  id: string;
  title: string;
  summary: string | null;
  horizon: string;
  is_active: boolean;
  /** Null while it is still a proposal — the roadmap page reuses the newest
   *  unaccepted one rather than generating another. */
  accepted_at: string | null;
  generated_by_ai: boolean;
  model_version: string | null;
  progress_percent: number;
  items: PlanItem[];
  rationale: Record<string, unknown>;
}

export interface NavigatorAnswer {
  answer: string;
  sources: Array<{ document_title: string; excerpt: string; score: number; chunk_id: string }>;
  confidence: number;
  is_uncertain: boolean;
  escalated_to_human: boolean;
  escalation_reason: string | null;
  suggested_actions: string[];
  trace_id: string;
}

export interface Page<T> { items: T[]; total: number; page: number; size: number }


// ---- AI Assistant ---------------------------------------------------------

export interface ProfessionCard {
  title: string;
  summary: string;
  skills: string[];
  learn: string[];
  path: string[];
  demand: string;
  why_you: string;
  program_ids: string[];
}

export interface RoadmapStep {
  title: string;
  detail: string;
  program_ids: string[];
}

export interface ProgramRef {
  id: string;
  slug: string;
  title: string;
  category: string;
}

export interface LqOption { value: string; label_i18n: Record<string, string> }
export interface LqQuestion {
  id: string;
  section: string;
  type: "single" | "multi" | "scale" | "text";
  text_i18n: Record<string, string>;
  required: boolean;
  options?: LqOption[];
  placeholder_i18n?: Record<string, string>;
  /** Ready answers offered under an open field. */
  suggestions_i18n?: Array<Record<string, string>>;
  /** "set" replaces the field; "add" appends to a comma-separated list. */
  suggest_mode?: "set" | "add";
}
export interface Questionnaire {
  version: number;
  sections: Array<{ id: string; title_i18n: Record<string, string> }>;
  questions: LqQuestion[];
}
export interface LearningProfileRead {
  version: number;
  answers: Record<string, unknown>;
  derived: Record<string, unknown>;
  missing: string[];
  completed: boolean;
}

export interface ActivityDay {
  date: string;
  count: number;
  level: number;
}

export interface ActivitySummary {
  days: ActivityDay[];
  total_actions: number;
  active_days: number;
  points: number;
  current_streak: number;
  best_streak: number;
  from_date: string;
  to_date: string;
}

// ---- Results & impact (admin) --------------------------------------------
// Every count is a number; a figure the platform does not record is null —
// never 0. A rate carries its numerator and denominator and is null over 0.
// A group of 1-4 people arrives with `value: null, suppressed: true`.

export interface ResultsFilters {
  date_from?: string;
  date_to?: string;
  region?: string;
}

export type ResultsBucket = "day" | "week" | "month";

export interface ResultsScope {
  period: { date_from: string | null; date_to: string | null; bucket: ResultsBucket };
  /** Set by the filter, or because a coordinator only ever sees her region. */
  region: string | null;
  generated_at: string;
}

export interface ResultsMetric {
  key: string;
  value: number | null;
}

export interface ResultsRate {
  key: string;
  numerator: number;
  denominator: number;
  value: number | null;
}

export interface ResultsGroup {
  key: string;
  value: number | null;
  suppressed: boolean;
}

export interface ResultsSeries {
  key: string;
  points: { bucket: string; value: number }[];
}

export interface ResultsOverview {
  scope: ResultsScope;
  participants: number;
  metrics: ResultsMetric[];
  activity_since: string | null;
  registrations: ResultsSeries;
  regions: ResultsGroup[];
  ages: ResultsGroup[];
}

export interface ResultsLearning {
  scope: ResultsScope;
  metrics: ResultsMetric[];
  rates: ResultsRate[];
  series: ResultsSeries[];
  evaluations: ResultsGroup[];
}

export interface ProgrammeRow {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  is_published: boolean;
  enrolled: number;
  in_progress: number;
  completed: number;
  completion: ResultsRate;
  certificates: number;
  tasks_submitted: number;
}

export type ProgrammeSort = "enrolled" | "completed" | "completion" | "certificates" | "title";

export interface ProgrammeTable {
  scope: ResultsScope;
  items: ProgrammeRow[];
  total: number;
  page: number;
  size: number;
}

export interface ResultsSkills {
  scope: ResultsScope;
  evidence: ResultsGroup[];
  evidence_kinds: ResultsGroup[];
  top: Record<string, { skill: SkillRef; value: number }[]>;
  statuses: ResultsGroup[];
  levels: ResultsGroup[];
}

export interface DimensionReading {
  dimension: string;
  people: number;
  average: number | null;
  focus: number | null;
  developing: number | null;
  strong: number | null;
}

export interface ResultsScore {
  scope: ResultsScope;
  people: number;
  small_sample: boolean;
  average: number | null;
  distribution: ResultsGroup[];
  dimensions: DimensionReading[];
}

export interface ResultsOpportunities {
  scope: ResultsScope;
  metrics: ResultsMetric[];
  applications_by_type: ResultsGroup[];
  applications_by_status: ResultsGroup[];
  applications_by_source: ResultsGroup[];
  saved_by_type: ResultsGroup[];
  open_by_type: ResultsGroup[];
  outcomes: ResultsGroup[];
  rates: ResultsRate[];
}

export interface ResultsEvents {
  scope: ResultsScope;
  metrics: ResultsMetric[];
  by_type: ResultsGroup[];
  by_format: ResultsGroup[];
  top: { id: string | null; title_i18n: Record<string, string>; value: number }[];
  series: ResultsSeries[];
}

export interface AdminFilters {
  date_from?: string;
  date_to?: string;
  region?: string;
  age_group?: string;
  program_category?: string;
}

/** Section 09 lists these filters; the API already accepts them. */
function queryOf(filters: { [key: string]: string | undefined } | AdminFilters | ResultsFilters): string {
  const q = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) q.set(key, value);
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export interface AdminUser {
  id: string;
  status: string;
  region: string | null;
  language: string;
  onboarded: boolean;
  last_active_at: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  classification: string;
  created_at: string;
}

export interface TrafficReport {
  visitors_today: number;
  visitors_7d: number;
  visitors_30d: number;
  views_today: number;
  views_30d: number;
  signed_in_share: number;
  returning_share: number;
  by_day: Array<{ day: string; visitors: number; views: number }>;
  top_paths: Array<{ path: string; views: number; visitors: number }>;
}

export interface AssistantSource {
  document_title: string;
  excerpt: string;
  chunk_id: string;
}

export interface AssistantReply {
  answer: string;
  route: string;
  sources: AssistantSource[];
  confidence: number | null;
  is_uncertain: boolean;
  section: "education" | "health" | "daily";
  kind: string;
  trace_id: string;
  personalised: boolean;
  escalated: boolean;
  escalation_reason: string | null;
  see_a_doctor: boolean;
  professions: ProfessionCard[];
  roadmap: RoadmapStep[];
  next_actions: string[];
  programs: ProgramRef[];
  guest_questions_left: number | null;
}

export interface AssistantProfile {
  personalised: boolean;
  age_band: "child" | "teen" | "adult" | "unknown";
  age: number | null;
  name: string | null;
  interests: string[];
  goals: string[];
  directions: string[];
  in_progress: string[];
  plan_progress: number | null;
  missing: string[];
}

export interface GuestAllowance {
  unlimited: boolean;
  left: number | null;
  allowance: number | null;
}

/** A stable id for an anonymous visitor, so her trial questions are counted
 *  per browser rather than per IP — several girls behind one school NAT would
 *  otherwise share three questions between them. */
function guestId(): string {
  if (typeof window === "undefined") return "";
  const key = "womanup.guest_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

export const portal = {
  me: () => api.get("/users/me"),
  /** Defaults to the calendar year: a rolling 365-day window starts mid-month
   *  and gives nothing to compare against. */
  activity: (year: number = new Date().getFullYear()) =>
    api.get<ActivitySummary>(`/users/me/activity?year=${year}`),
  profile: () => api.get("/users/me/profile"),

  score: () => api.get<DevelopmentScore>("/assessments/score"),
  /** The score with each dimension explained: its band, her own answers, the
   *  gaps she can close here and what would move it. 404 before any assessment. */
  scoreInsights: () => api.get<ScoreInsights>("/assessments/score/insights"),
  /** What to do next, and the courses and listings behind it. Supersedes
   *  `nextStep` on the cabinet. */
  recommendations: () => api.get<Recommendations>("/ai/recommendations"),
  /** Her skills, how well each is backed, and the ones worth building next. */
  mySkills: () => api.get<SkillProfile>("/skills/me"),
  questions: () => api.get<Question[]>("/assessments/questions"),
  questionnaire: () => api.get<Questionnaire>("/assessments/questionnaire"),
  learningProfile: () => api.get<LearningProfileRead>("/assessments/learning-profile"),
  saveLearning: (answers: Record<string, unknown>) =>
    api.put<LearningProfileRead>("/assessments/learning-profile", { answers }),
  submitAssessment: (answers: Array<{ question_id: string; value: number }>) =>
    api.post<DevelopmentScore>("/assessments/submit", { answers }),

  activePlan: () => api.get<Plan>("/plans/active"),
  myPlans: () => api.get<Plan[]>("/plans"),
  /** `language` is the locale she is reading in. Without it the server falls
   *  back to a stored column that used to be `uz` for every account, which is
   *  why plans came back in Uzbek on the Russian pages. */
  generatePlan: (horizon = "6m", language?: string) =>
    api.post<Plan>("/plans/generate", { horizon, language }),
  acceptPlan: (planId: string) =>
    api.post<Plan>(`/plans/${planId}/accept`, { accepted: true, removed_item_ids: [] }),
  updatePlanItem: (itemId: string, status: string) =>
    api.patch<PlanItem>(`/plans/items/${itemId}`, { status }),

  nextStep: () => api.get<NextStepCard>("/ai/next-step"),
  askNavigator: (message: string) =>
    api.post<NavigatorAnswer>("/ai/navigator", { message }),

  programs: (query = "") => api.get<Page<Program>>(`/programs${query}`),
  program: (id: string) => api.get<ProgramDetail>(`/programs/${id}`),
  /** The same card by its readable name — what the learning section links to. */
  programBySlug: (slug: string) =>
    api.get<ProgramDetail>(`/programs/slug/${encodeURIComponent(slug)}`),
  /** One lesson with its body. The contents come with the course card, so this
   *  is only fetched for the lesson actually being read. */
  lesson: (programId: string, lessonSlug: string) =>
    api.get<ProgramLessonDetail>(
      `/programs/${programId}/lessons/${encodeURIComponent(lessonSlug)}`,
    ),
  enroll: (programId: string) => api.post<Enrollment>(`/programs/${programId}/enroll`),
  myEnrollments: () => api.get<EnrollmentDetail[]>("/programs/me/enrollments"),
  /** Mark a lesson done — or undone. Returns the enrollment, so progress on
   *  screen is the number the server just computed. */
  completeLesson: (enrollmentId: string, lessonId: string, completed = true) =>
    api.post<Enrollment>(`/programs/enrollments/${enrollmentId}/lessons`, {
      lesson_id: lessonId,
      completed,
    }),
  completeModule: (enrollmentId: string, moduleId: string, completed = true) =>
    api.post<Enrollment>(`/programs/enrollments/${enrollmentId}/progress`, {
      module_id: moduleId,
      completed,
    }),
  myCertificates: () => api.get<Certificate[]>("/programs/me/certificates"),

  /** Routes through the catalogue. Public, like the catalogue itself; signed
   *  in, every row carries her own progress. */
  learningPaths: (params: { dimension?: string; level?: string; skill?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    for (const [name, value] of Object.entries(params)) {
      if (value) q.set(name, value);
    }
    const query = q.toString();
    return api.get<LearningPath[]>(`/learning-paths${query ? `?${query}` : ""}`);
  },
  learningPath: (slug: string) =>
    api.get<LearningPathDetail>(`/learning-paths/${encodeURIComponent(slug)}`),
  myLearningPaths: () => api.get<LearningPathDetail[]>("/learning-paths/me"),
  /** Take a route on. Idempotent, and enrols her in nothing. */
  startLearningPath: (slug: string) =>
    api.post<LearningPathDetail>(`/learning-paths/${encodeURIComponent(slug)}/start`, {}),
  /** Enrol in a step of a route. The order is enforced on the server: a locked
   *  step is a 409, whatever the browser sent. */
  enrollInPath: (slug: string, programId: string) =>
    api.post<Enrollment>(
      `/learning-paths/${encodeURIComponent(slug)}/programs/${programId}/enroll`,
      {},
    ),
  /** The goals she set for herself, as the cabinet stores them. */
  goals: () => api.get<Goal[]>("/users/me/goals"),
  notifications: () => api.get<Notification[]>("/notifications"),
  markNotificationsRead: () => api.post<{ detail: string }>("/notifications/read-all"),

  /** The feed, and the one screen the portal opens on. Public, like the
   *  catalogue: a visitor reads the same feed she will keep reading once she
   *  registers, so the first screen after sign-up is already familiar.
   *
   *  What she is *not* shown is decided on the server — adult health posts are
   *  filtered out for a minor and for a reader whose age we do not know, so an
   *  age-inappropriate card never reaches the browser to be hidden here. */
  news: (params: { category?: string; search?: string; size?: number; page?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.category) q.set("category", params.category);
    if (params.search) q.set("search", params.search);
    q.set("size", String(params.size ?? 20));
    q.set("page", String(params.page ?? 1));
    return api.get<Page<NewsPost>>(`/news?${q}`);
  },
  newsCounts: () => api.get<Record<string, number>>("/news/categories"),
  newsPost: (slug: string) => api.get<NewsDetail>(`/news/${encodeURIComponent(slug)}`),

  /** The personalised section. Ranking only: every post here is in the feed
   *  above too, and everything it ranks last is still one tap away in the
   *  feed, in its category and in search. */
  newsForYou: (size = 6) => api.get<ForYouFeed>(`/news/for-you?size=${size}`),
  newsPreferences: () => api.get<NewsPreferences>("/news/preferences"),
  saveNewsPreferences: (body: { age?: number | null; interests?: string[] }) =>
    api.put<NewsPreferences>("/news/preferences", body),

  opportunities: () => api.get<Page<Opportunity>>("/opportunities"),
  /** The landing page shows real listings to visitors, so this one must not
   *  send an Authorization header expectation with it. */
  opportunitiesPublic: (params: { size?: number; type?: string } = {}) =>
    api.get<Page<Opportunity>>(
      `/opportunities?size=${params.size ?? 4}` +
        (params.type ? `&type=${encodeURIComponent(params.type)}` : ""),
    ),
  /** Public too: the counts the landing page states before asking for an
   *  account have to come from the same catalogue the visitor can then open. */
  opportunityStats: () => api.get<OpportunityStats>("/opportunities/stats"),
  recommended: () => api.get<OpportunityMatch[]>("/opportunities/recommended"),
  consentStatus: () => api.get<Record<string, boolean>>("/opportunities/consent-status"),
  apply: (opportunityId: string) =>
    api.post("/opportunities/apply", { opportunity_id: opportunityId, payload: {} }),
  myApplications: () => api.get<ApplicationRecord[]>("/opportunities/me/applications"),

  /** The catalogue as she searches it. Open to visitors; her fit comes along
   *  when she is signed in. */
  discover: (params: DiscoverParams = {}) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "" && value !== false) {
        query.set(key, String(value));
      }
    }
    const q = query.toString();
    return api.get<OpportunityDiscover>(`/opportunities/discover${q ? `?${q}` : ""}`);
  },
  opportunity: (id: string) =>
    api.get<OpportunityDetail>(`/opportunities/${encodeURIComponent(id)}`),
  /** Apply from the confirm step. `consent` is her agreement, given there, to
   *  share the listed fields with the listing's partner platform. */
  applyTo: (id: string, consent: boolean) =>
    api.post<ApplicationRecord>(`/opportunities/${encodeURIComponent(id)}/apply`, { consent }),
  withdrawApplication: (applicationId: string) =>
    api.post<ApplicationRecord>(`/opportunities/applications/${applicationId}/withdraw`),
  saveOpportunity: (id: string) =>
    api.put<void>(`/opportunities/${encodeURIComponent(id)}/save`),
  unsaveOpportunity: (id: string) =>
    api.delete<void>(`/opportunities/${encodeURIComponent(id)}/save`),
  mySaved: () => api.get<OpportunityCard[]>("/opportunities/me/saved"),
  /** Events not yet over, soonest first. Open to visitors. */
  events: (params: EventParams = {}) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "" && value !== false) {
        query.set(key, String(value));
      }
    }
    const q = query.toString();
    return api.get<EventCatalogue>(`/events${q ? `?${q}` : ""}`);
  },
  event: (id: string) => api.get<EventDetail>(`/events/${encodeURIComponent(id)}`),
  recommendedEvents: () => api.get<EventCard[]>("/events/recommended"),
  myEvents: () => api.get<EventCard[]>("/events/me"),
  setReminder: (id: string) =>
    api.put<{ event_id: string; remind_at: string }>(`/events/${encodeURIComponent(id)}/reminder`),
  cancelReminder: (id: string) => api.delete<void>(`/events/${encodeURIComponent(id)}/reminder`),
  week: () => api.get<WeekRead>("/ai/week"),

  /** "For your business" — signed in; every item carries its reasons. */
  business: () => api.get<BusinessRead>("/opportunities/business"),

  // Organisations: the public page, her side, the workspace, administrators.
  organizationPublic: (slug: string) =>
    api.get<OrganizationPublic>(`/organizations/public/${encodeURIComponent(slug)}`),
  myInvitations: () => api.get<MyInvitation[]>("/organizations/me/invitations"),
  answerInvitation: (id: string, accept: boolean) =>
    api.post<MyInvitation>(`/organizations/me/invitations/${id}`, { accept }),
  mySharing: () => api.get<OrganizationBrief[]>("/organizations/me/sharing"),
  stopSharing: (orgId: string) => api.delete<void>(`/organizations/me/sharing/${orgId}`),
  myOrganizations: () => api.get<OrganizationRead[]>("/organizations/mine"),
  organization: (orgId: string) => api.get<OrganizationRead>(`/organizations/${orgId}`),
  updateOrganization: (orgId: string, body: OrganizationProfileIn) =>
    api.patch<OrganizationRead>(`/organizations/${orgId}`, body),
  orgMembers: (orgId: string) => api.get<OrgMember[]>(`/organizations/${orgId}/members`),
  orgListings: (orgId: string) => api.get<OrgListing[]>(`/organizations/${orgId}/listings`),
  createListing: (orgId: string, body: ListingIn) =>
    api.post<OrgListing>(`/organizations/${orgId}/listings`, body),
  updateListing: (orgId: string, listingId: string, body: Partial<ListingIn>) =>
    api.patch<OrgListing>(`/organizations/${orgId}/listings/${listingId}`, body),
  closeListing: (orgId: string, listingId: string) =>
    api.post<OrgListing>(`/organizations/${orgId}/listings/${listingId}/close`),
  orgApplications: (orgId: string, listingId?: string | null) =>
    api.get<OrgApplication[]>(
      `/organizations/${orgId}/applications` +
        (listingId ? `?listing_id=${encodeURIComponent(listingId)}` : ""),
    ),
  setApplicationStatus: (orgId: string, applicationId: string, status: ApplicationStatus, note?: string) =>
    api.post<OrgApplication>(`/organizations/${orgId}/applications/${applicationId}/status`, {
      status,
      ...(note ? { note } : {}),
    }),
  orgCandidates: (orgId: string, params: { skill?: string; region?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.skill) q.set("skill", params.skill);
    if (params.region) q.set("region", params.region);
    const qs = q.toString();
    return api.get<CandidateCard[]>(`/organizations/${orgId}/candidates${qs ? `?${qs}` : ""}`);
  },
  inviteCandidate: (orgId: string, body: { ref: string; opportunity_id?: string | null; message?: string | null }) =>
    api.post<OrgInvitation>(`/organizations/${orgId}/invitations`, body),
  orgInvitations: (orgId: string) => api.get<OrgInvitation[]>(`/organizations/${orgId}/invitations`),

  adminOrganizations: () => api.get<OrganizationAdmin[]>("/admin/organizations"),
  adminCreateOrganization: (name: string, kind: OrganizationKind) =>
    api.post<OrganizationAdmin>("/admin/organizations", { name, kind }),
  adminSetOrganization: (orgId: string, body: { is_verified?: boolean; is_active?: boolean }) =>
    api.patch<OrganizationAdmin>(`/admin/organizations/${orgId}`, body),
  adminAddMember: (orgId: string, email: string, role: OrgMemberRole) =>
    api.post<OrganizationAdmin>(`/admin/organizations/${orgId}/members`, { email, role }),
  adminRemoveMember: (orgId: string, userId: string) =>
    api.delete<{ detail: string }>(`/admin/organizations/${orgId}/members/${userId}`),

  consents: () => api.get<Record<string, boolean>>("/users/me/consents"),
  setConsent: (scope: string, accepted: boolean) =>
    api.post("/users/me/consents", { scope, accepted, policy_version: "1.0" }),

  dashboard: (filters: AdminFilters = {}) => api.get(`/admin/dashboard${queryOf(filters)}`),

  assistantAsk: (message: string, language: string, route = "auto") =>
    api.post<AssistantReply>("/assistant/ask", { message, language, route }, {
      headers: { "X-Guest-Id": guestId() },
    }),
  assistantDetail: (message: string, answer: string, kind: string, language: string) =>
    api.post<AssistantReply>("/assistant/education/detail", {
      message,
      answer,
      kind,
      language,
    }),
  assistantDaily: (language: string) =>
    api.get<AssistantReply>(`/assistant/daily?language=${encodeURIComponent(language)}`),
  assistantProfile: () => api.get<AssistantProfile>("/assistant/profile"),

  /** Practical tasks. Public catalogue; everything personal needs a session. */
  practicalTasks: (params: { skill?: string; level?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    for (const [name, value] of Object.entries(params)) if (value) q.set(name, value);
    const query = q.toString();
    return api.get<PracticalTask[]>(`/practical-tasks${query ? `?${query}` : ""}`);
  },
  practicalTask: (slug: string) =>
    api.get<PracticalTaskDetail>(`/practical-tasks/${encodeURIComponent(slug)}`),
  myPracticalTasks: () => api.get<PracticalTaskDetail[]>("/practical-tasks/me"),
  startTask: (slug: string) =>
    api.post<PracticalTaskDetail>(`/practical-tasks/${encodeURIComponent(slug)}/start`, {}),
  /** Hand the work in. Validated on the server whatever the form allowed. */
  submitTask: (
    slug: string,
    payload: { text?: string; link?: string; fields?: Record<string, string> },
    language?: string,
  ) =>
    api.post<PracticalTaskDetail>(
      `/practical-tasks/${encodeURIComponent(slug)}/submit${language ? `?language=${language}` : ""}`,
      payload,
    ),

  /** Her whole portfolio in one response, private parts included. */
  myPortfolio: () => api.get<Portfolio>("/portfolio/me"),
  updatePortfolio: (settings: {
    is_public?: boolean;
    sections?: Partial<Record<PortfolioSectionKey, boolean>>;
  }) => api.patch<PortfolioSettings>("/portfolio/me", settings),
  createProject: (payload: ProjectInput) =>
    api.post<PortfolioProject>("/portfolio/me/projects", payload),
  updateProject: (id: string, payload: Partial<ProjectInput>) =>
    api.patch<PortfolioProject>(`/portfolio/me/projects/${id}`, payload),
  deleteProject: (id: string) => api.delete<void>(`/portfolio/me/projects/${id}`),
  /** A portfolio its owner published. No account needed. */
  publicPortfolio: (slug: string) =>
    api.get<PublicPortfolio>(`/portfolio/public/${encodeURIComponent(slug)}`),
  /** The skill vocabulary, for picking what a project used. */
  searchSkills: (search: string) =>
    api.get<Page<{ slug: string; name_i18n: Record<string, string>; category: string }>>(
      `/skills?size=8&search=${encodeURIComponent(search)}`,
    ),

  /** Career directions. Open to a visitor; her fit comes with them when she
   *  is signed in. */
  careers: (category?: CareerCategory) =>
    api.get<CareerCard[]>(`/career-paths${category ? `?category=${category}` : ""}`),
  career: (slug: string) =>
    api.get<CareerDetail>(`/career-paths/${encodeURIComponent(slug)}`),
  /** Her chosen direction, or null when she has not chosen one. */
  myCareer: () => api.get<CareerDetail | null>("/career-paths/me"),
  chooseCareer: (slug: string) => api.put<CareerDetail>("/career-paths/me", { slug }),
  clearCareer: () => api.delete<void>("/career-paths/me"),

  /** Where she stands and what to do next — deterministic, no model call. */
  coachContext: (language: string) =>
    api.get<CoachContext>(`/assistant/coach?language=${encodeURIComponent(language)}`),
  /** Ask the Coach. Grounded server-side in the same records. */
  coachAsk: (message: string, language: string, opportunityId?: string | null) =>
    api.post<CoachReply>("/assistant/coach", {
      message,
      language,
      ...(opportunityId ? { opportunity_id: opportunityId } : {}),
    }),
  assistantGuestAllowance: () =>
    api.get<GuestAllowance>("/assistant/guest-allowance", {
      headers: { "X-Guest-Id": guestId() },
    }),
  assistantOnboarding: (payload: {
    name: string;
    surname?: string;
    /** "YYYY-MM-DD". A date rather than an age, so the safety band follows her
     *  instead of being right only on the day she signed up. */
    birth_date: string;
    region?: string | null;
    interests: string[];
    goal: string;
    direction: string;
    consent_ai_personalisation: boolean;
  }) => api.post<AssistantProfile>("/assistant/onboarding", payload),
  kpi: (filters: AdminFilters = {}) => api.get(`/admin/kpi${queryOf(filters)}`),
  traffic: (days = 30) => api.get<TrafficReport>(`/admin/traffic?days=${days}`),
  adminUsers: (params: { region?: string; limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.region) q.set("region", params.region);
    q.set("limit", String(params.limit ?? 50));
    q.set("offset", String(params.offset ?? 0));
    return api.get<AdminUser[]>(`/admin/users?${q}`);
  },
  adminAudit: (limit = 60) => api.get<AuditEntry[]>(`/admin/audit?limit=${limit}`),
  assignRole: (userId: string, role: string) =>
    api.post<{ detail: string }>(`/admin/users/${userId}/roles`, { role }),
  revokeRole: (userId: string, role: string) =>
    api.delete<{ detail: string }>(`/admin/users/${userId}/roles/${role}`),
  regionStats: () => api.get<Array<{ region: string; users: number }>>("/admin/stats/regions"),

  results: {
    overview: (f: ResultsFilters) => api.get<ResultsOverview>(`/admin/results/overview${queryOf(f)}`),
    learning: (f: ResultsFilters) => api.get<ResultsLearning>(`/admin/results/learning${queryOf(f)}`),
    programmes: (
      f: ResultsFilters,
      q: {
        search?: string;
        sort?: ProgrammeSort;
        order?: "asc" | "desc";
        page?: number;
        size?: number;
        /** Names sort in the reader's language. */
        lang?: "uz" | "ru" | "en";
      },
    ) =>
      api.get<ProgrammeTable>(
        `/admin/results/programmes${queryOf({
          ...f,
          search: q.search || undefined,
          sort: q.sort,
          order: q.order,
          page: q.page ? String(q.page) : undefined,
          size: q.size ? String(q.size) : undefined,
          lang: q.lang,
        })}`,
      ),
    skills: (f: ResultsFilters) => api.get<ResultsSkills>(`/admin/results/skills${queryOf(f)}`),
    // A score is today's reading: only the region applies.
    score: (f: ResultsFilters) =>
      api.get<ResultsScore>(`/admin/results/score${queryOf({ region: f.region })}`),
    opportunities: (f: ResultsFilters) =>
      api.get<ResultsOpportunities>(`/admin/results/opportunities${queryOf(f)}`),
    events: (f: ResultsFilters) => api.get<ResultsEvents>(`/admin/results/events${queryOf(f)}`),
    exportCsv: (f: ResultsFilters) => api.text(`/admin/results/export${queryOf(f)}`),
  },
};
