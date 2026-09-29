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

export interface Question {
  id: string;
  dimension: string;
  order_index: number;
  text_i18n: Record<string, string>;
  options: Array<{ value: number; label_i18n: Record<string, string> }>;
}

export interface ProgramModule {
  id: string;
  order_index: number;
  title_i18n: Record<string, string>;
  content_i18n: Record<string, string>;
  media_url: string | null;
  duration_minutes: number | null;
}

export interface ProgramDetail extends Program {
  modules: ProgramModule[];
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
  duration_hours: number | null;
  duration_weeks: number | null;
  skills_taught: string[];
  learning_outcomes: Array<Record<string, string>>;
  has_certificate: boolean;
  provider: string | null;
  /** Set when the course belongs to somebody else and lives on their site. */
  external_url?: string | null;
  source?: string | null;
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
}

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
  matched_skills: string[];
  missing_skills: string[];
  explanation: string;
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

export interface AdminFilters {
  date_from?: string;
  date_to?: string;
  region?: string;
  age_group?: string;
  program_category?: string;
}

/** Section 09 lists these filters; the API already accepts them. */
function queryOf(filters: AdminFilters): string {
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
  enroll: (programId: string) => api.post(`/programs/${programId}/enroll`),
  myEnrollments: () => api.get("/programs/me/enrollments"),

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
  myApplications: () => api.get("/opportunities/me/applications"),

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
};
