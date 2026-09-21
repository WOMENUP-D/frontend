"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, getAccessToken, isStaff, staffHome } from "@/services/api";
import {
  portal,
  type AssistantProfile,
  type DevelopmentScore,
  type Recommendations,
  type ScoreInsights,
} from "@/services/portal";
import { EdRow, EdRows, Empty, ErrorNote, Loading, NeedsAuth, ScoreRing } from "@/components/ui";
import { YourWeek } from "@/components/home/YourWeek";
import { GettingStarted } from "@/components/home/GettingStarted";
import { DimensionInsights, ForYou, NextSteps } from "@/components/Recommendations";
import { MyCareer } from "@/components/career/MyCareer";
import { SkillsSection } from "@/components/Skills";
import { ActivityCalendar } from "@/components/ActivityCalendar";
import { ProfileCard } from "@/components/ProfileCard";
import { FeedPreferences } from "@/components/FeedPreferences";
import { useI18n, type MessageKey } from "@/i18n";
import { dimensionKey, interestKey, regionKey } from "@/utils/format";

interface Profile {
  full_name: string | null;
  completeness_percent: number;
  profession: string | null;
  education_level: string | null;
  education_field: string | null;
  employment_status: string | null;
  years_of_experience: number | null;
  district: string | null;
  age_group: string | null;
  skills: string[];
  interests: string[];
  languages: string[];
  bio: string | null;
  birth_date: string | null;
}
interface Plan { id: string; title: string; progress_percent: number; items: unknown[]; is_active: boolean }
/** The account itself. Unlike the profile table this is never empty — she has
 *  an id, an address and a joining date from the moment she signs up. */
interface Account {
  id: string;
  email: string | null;
  phone: string | null;
  region: string | null;
  language: string | null;
  created_at: string | null;
  email_verified: boolean;
  phone_verified: boolean;
}

/**
 * Who she is, in her own cabinet.
 *
 * Account facts first, because they always exist: she has a WomanUP ID, an
 * address and a joining date from the moment she signs up. The profile table is
 * empty until she fills it, and an aside that says only "your profile is empty"
 * is a worse answer than the identity the platform already holds.
 *
 * Professional and educational fields follow when there are any. Marital status,
 * children, disability and register membership are on the profile too, but they
 * are classified sensitive and are not summary-card material — they exist to
 * route help to her, not to be printed on the first screen she opens each day.
 */
/**
 * The profile card: who she is, what she can do, and where she is going.
 *
 * Two panels. The left one is identity — the face, the name's initials, and the
 * two things a stranger reads first: where she is and whether she is open to
 * work. The right one is substance: what she does, what she knows, what she has
 * done and what she studied.
 *
 * Every field is optional and every one of them disappears cleanly when it is
 * empty, because a profile is filled in over months and a card that shows eight
 * blank labels on day one is a list of things she has failed to do. What never
 * disappears is the identity panel: she has a WomanUP ID from the moment she
 * signs up, and that is enough for the card to be about someone.
 */
/** Briefcase. Drawn rather than an emoji, so it takes the text colour and does
 *  not change shape between platforms. */
function IconWork() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="7.5" width="19" height="12.5" rx="2.5" />
      <path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7" />
      <path d="M2.5 12.5h19" />
    </svg>
  );
}

/** Graduation cap. */
function IconStudy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4 2.5 8.6 12 13.2l9.5-4.6L12 4Z" />
      <path d="M6.6 10.8v4.6c0 1.6 2.4 2.9 5.4 2.9s5.4-1.3 5.4-2.9v-4.6" />
      <path d="M21.5 8.6v5.2" />
    </svg>
  );
}

/**
 * The profile card.
 *
 * Glass: a translucent pane with a blurred backdrop, a hairline of light along
 * its top edge and a soft shadow under it, so it sits above the page rather
 * than in it. Deliberately not very translucent — the branch behind it is
 * bright, and a card you can read the garden through is a card you cannot read.
 *
 * Every field is optional and folds away when empty. A profile is filled in
 * over months, and a card showing eight blank labels on day one is a list of
 * things she has not done yet.
 */
function ProfileDetails({
  profile,
  persona,
  t,
}: {
  profile: Profile | null;
  persona: AssistantProfile | null;
  t: (key: MessageKey) => string;
}) {
  /* The directions she is developing in — the weakest score dimensions. Falls
     back to what she studied, which is the nearest thing a profile holds. */
  const directions = (persona?.directions ?? []).map((d) => t(dimensionKey(d)));
  const direction = directions.length > 0
    ? directions.join(", ")
    : profile?.education_field ?? null;

  const role = profile?.profession ?? profile?.employment_status ?? null;
  const label = (value: string) => {
    const key = interestKey(value);
    return key ? t(key) : value;
  };
  const skills = [
    ...(profile?.skills ?? []),
    ...(profile?.interests ?? []).map(label),
    ...(profile?.languages ?? []),
  ];
  const experience = [
    profile?.employment_status,
    profile?.years_of_experience != null ? `${profile.years_of_experience} ${t("prof.years")}` : null,
  ].filter(Boolean).join(" · ");
  const education = [profile?.education_level, profile?.education_field].filter(Boolean).join(", ");

  return (
    <section className="pcard">
      <div className="pcard-body">
        {/* Name, ID, age, city, joining date and the completeness meter all sit
            in the ProfileCard at the top of the page now. What is left here is
            only what that card does not carry — the prose and the lists. */}
        {role && <p className="pcard-role">{role}</p>}
        {profile?.bio && <p className="pcard-bio">{profile.bio}</p>}

        {direction && (
          <dl className="pcard-facts">
            <div><dt>{t("prof.direction")}</dt><dd>{direction}</dd></div>
          </dl>
        )}

        {skills.length > 0 && (
          <>
          <span className="pcard-skills-label">{t("prof.knowledge")}</span>
          <ul className="pcard-skills">
            {skills.map((skill) => (
              <li key={skill} className="pcard-skill">{skill}</li>
            ))}
          </ul>
          </>
        )}

        {experience && (
          <div className="pcard-block">
            <h3><IconWork /> {t("prof.experienceBlock")}</h3>
            <p>{experience}</p>
          </div>
        )}
        {education && (
          <div className="pcard-block">
            <h3><IconStudy /> {t("prof.education")}</h3>
            <p>{education}</p>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * The identity block: the card, and the four figures it summarises, on one line.
 *
 * The figures used to sit far down the page as a numbered list under a heading
 * that said "quick links", which is not what four numbers are. Beside the card
 * they read as what they are — the state of her account — and the card stops
 * leaving half the width of the page empty.
 */
function ProfileSummary({
  profile,
  account,
  persona,
  name,
  active,
  done,
  score,
  t,
}: {
  profile: Profile | null;
  account: Account | null;
  persona: AssistantProfile | null;
  name: string;
  active: number;
  done: number;
  score: DevelopmentScore | null;
  t: (key: MessageKey) => string;
}) {
  const shortId = account?.id ? account.id.split("-")[0].toUpperCase() : "—";
  const joined = account?.created_at
    ? new Date(account.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      })
    : null;
  /** Numeric runs are skipped: "dilnoza1998" should give D, not D1. */
  const initials =
    name
      .split(/[\s@._-]+/)
      .filter((part) => part && /\p{L}/u.test(part))
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "•";

  /* Prefer the assistant's number, then derive from the date of birth. Both
     ultimately come from the same column; the persona is simply already
     resolved. */
  const age =
    persona?.age ??
    (profile?.birth_date
      ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / 31557600000)
      : null);

  const place = profile?.district ?? (account?.region ? t(regionKey(account.region)) : null);
  const percent = profile?.completeness_percent ?? 0;

  const tiles: ReadonlyArray<[string, string | number]> = [
    [t("cab.activeCourses"), active],
    [t("cab.completed"), done],
    [t("cab.profileFull"), `${percent}%`],
    [t("cab.totalScore"), score ? Math.round(score.composite) : "—"],
  ];

  return (
    <div className="profcard-row">
      <ProfileCard
        headingLevel={1}
        name={name}
        initials={initials}
        womanupId={shortId}
        age={age}
        city={place}
        joined={joined}
        completeness={percent}
        fillHref="/welcome"
        portfolioHref="/kabinet/portfolio"
      />
      <div className="pstats">
        {tiles.map(([label, value]) => (
          <div className="pstat" key={label}>
            <div className="pstat-value">{value}</div>
            <span className="pstat-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CabinetPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  /* The score with every dimension explained. It is a superset of the plain
     score, so the profile summary above reads it unchanged. */
  const [score, setScore] = useState<ScoreInsights | null>(null);
  const [recs, setRecs] = useState<Recommendations | null>(null);
  const [recsFailed, setRecsFailed] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [enrollments, setEnrollments] = useState<{ progress_percent: number; status: string }[]>([]);
  /* The questionnaire she actually fills in on the last onboarding step. It is a different
     record from the Development Score, and telling them apart is the whole
     point — see the aside below. */
  const [assessed, setAssessed] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  /* Age and the development directions live on the assistant persona, not on
     the profile row — the directions are the weakest score dimensions. */
  const [persona, setPersona] = useState<AssistantProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /* Not through `soft` below: a failure here is shown and can be retried. An
     empty "next step" would read as "nothing to do", which is a different and
     wrong message. */
  async function loadRecommendations() {
    try {
      setRecs(await portal.recommendations());
      setRecsFailed(false);
    } catch {
      setRecsFailed(true);
    }
  }

  useEffect(() => {
    const token = getAccessToken();
    setAuthed(Boolean(token));
    if (!token) { setLoading(false); return; }
    // Staff have no profile, no score and no plan — this page would draw an
    // empty cabinet under an administrator's name. Their screen is /admin.
    if (isStaff()) { router.replace(staffHome()); return; }

    // Each block degrades on its own — a missing score must not blank the page.
    async function soft<T>(call: () => Promise<T>): Promise<T | null> {
      try { return await call(); } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        return null;
      }
    }

    (async () => {
      const [p, s, pl, en, lq, acc, per] = await Promise.all([
        soft(() => portal.profile() as Promise<Profile>),
        soft(() => portal.scoreInsights()),
        soft(() => portal.activePlan() as Promise<Plan>),
        soft(() => portal.myEnrollments() as Promise<{ progress_percent: number; status: string }[]>),
        soft(() => portal.learningProfile()),
        soft(() => portal.me() as Promise<Account>),
        soft(() => portal.assistantProfile()),
        loadRecommendations(),
      ]);
      setProfile(p); setScore(s); setPlan(pl); setEnrollments(en ?? []);
      setAssessed(Boolean(lq?.completed)); setAccount(acc); setPersona(per);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    if (window.location.hash !== "#lenta") return;
    document.getElementById("lenta")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading]);

  if (authed === false) return <main className="wrap page"><NeedsAuth /></main>;
  if (loading) return <main className="wrap page"><Loading rows={4} /></main>;

  const active = enrollments.filter((e) => e.status !== "completed").length;
  const done = enrollments.filter((e) => e.status === "completed").length;

  /* Her name if the platform has it, then the address she signed up with.
     "Пользователь" is the last resort rather than the first: a cabinet that
     greets her as a generic noun is not hers. */
  const displayName =
    profile?.full_name || account?.email?.split("@")[0] || account?.phone || t("cab.user");

  return (
    <main className="wrap page">
      <ProfileSummary
        profile={profile}
        account={account}
        persona={persona}
        name={displayName}
        active={active}
        done={done}
        score={score}
        t={t}
      />

      {/* For somebody new: five steps, each a link. Hidden by one tap, and
          never shown to a woman who has started a course. */}
      <GettingStarted isNew={enrollments.length === 0} />

      <div className="ed-split">
        {/* Score rides along as the reader scrolls */}
        <aside className="ed-aside stack" style={{ gap: 16 }}>
          {/* The name and the profession used to be repeated here above the
              score. The profile card carries both, so this said them twice —
              and on an account with no name filled in it said "Пользователь"
              in display type, which is the page greeting her as a noun. */}
          {score ? (
            <div className="stack" style={{ gap: 12 }}>
              <div className="row" style={{ justifyContent: "center" }}>
                <ScoreRing value={score.composite} size={158} />
              </div>
              <div className="spread">
                <span className="eyebrow">{t("cab.score")}</span>
                {/* The score is retaken on its own diagnostic. The learning
                    questionnaire on /welcome is a different instrument and
                    does not change this number. */}
                <Link href="/kabinet/diagnostika" className="btn btn-outline btn-sm">
                  {t("cab.retake")}
                </Link>
              </div>
              {/* Each dimension opens to its reading: the band, her own
                  answers, the gaps she can close here and what would move it. */}
              <DimensionInsights insights={score} />
              {score.weakest_dimensions.length > 0 && (
                <p className="faint">
                  {t("cab.weakest")}{" "}
                  <strong>
                    {score.weakest_dimensions.map((d) => t(dimensionKey(d))).join(", ")}
                  </strong>{" "}
                  {t("cab.weakestTail")}
                </p>
              )}
            </div>
          ) : null}

          {/* The card lives in the left rail. It is authored horizontal and
              reads its own width, so at 443px it lays itself out as a column
              rather than squeezing a 148px portrait against a 150px measure. */}
          <div className="pcard-slot">
            <ProfileDetails profile={profile} persona={persona} t={t} />
          </div>
        </aside>

        <div className="stack" style={{ gap: 26 }}>
          {/* Her week first: the lesson she left off at, then the next event,
              task and listing — each a real record or not drawn at all. */}
          <YourWeek />

          {/* The invitation to sit the assessment, on the wide side of the page
              where it has room to be an invitation rather than a footnote. It
              is keyed on the questionnaire she actually sat — not on the
              Development Score, which is a separate record that may not exist
              yet — so it disappears once she has done it instead of asking
              again for something already finished. */}
          {!assessed && (
            <Empty
              title={t("cab.noScore")}
              hint={t("cab.noScoreHint")}
              action={
                <Link href="/welcome?step=assessment" className="btn btn-primary">
                  {t("cab.startAssess")}
                </Link>
              }
            />
          )}

          {/* What to do next, before anything about the past: up to three
              steps, the first set as the page's one pull quote. A failure is
              said out loud — an empty space here would read as "nothing to do". */}
          {recsFailed ? (
            <div className="stack" style={{ gap: 10 }}>
              <ErrorNote message={t("cab.recsError")} />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ alignSelf: "flex-start" }}
                onClick={() => void loadRecommendations()}
              >
                {t("lms.err.retry")}
              </button>
            </div>
          ) : (
            recs && <NextSteps steps={recs.next_steps} />
          )}

          {/* Her career direction: the stage she is on and a way back to it,
              or — when she has none — one sentence and one way to find one. */}
          <MyCareer />

          <div>
            <div className="spread" style={{ marginBottom: 4 }}>
              <span className="eyebrow">{t("cab.myPlan")}</span>
              <Link href="/reja" className="btn btn-outline btn-sm">
                {t("common.open")}
              </Link>
            </div>
            {plan ? (
              <EdRows>
                <EdRow
                  index="01"
                  title={plan.title}
                  meta={`${plan.items.length} ${t("cab.steps")} · ${plan.progress_percent}%`}
                  arrow={false}
                  side={
                    <span style={{ width: 130 }}>
                      <span className="bar">
                        <span style={{ width: `${plan.progress_percent}%` }} />
                      </span>
                    </span>
                  }
                />
              </EdRows>
            ) : (
              <p className="muted small" style={{ paddingTop: 8 }}>
                {t("cab.noPlanHint")}
              </p>
            )}
          </div>

          {/* What she can do, and how well the platform knows it. It loads on
              its own, so a slow skills call cannot hold up the page. */}
          <SkillsSection />

          {/* The courses and listings behind those steps. Only what the
              catalogue holds right now; an empty column says so. */}
          {recs && (
            <ForYou
              programs={recs.programs}
              opportunities={recs.opportunities}
              assessed={recs.assessed}
            />
          )}

          {/* A year of squares: what she has actually been doing. It follows
              the next steps rather than leading the page, so the cabinet opens
              on what to do rather than on a record of the past. */}
          <ActivityCalendar />

          {/* What the feed ranks on. It lives here rather than over the feed
              itself: it is a setting about her, and settings belong where the
              rest of her account does. The feed keeps a link back to it. */}
          <div id="lenta">
            <span className="eyebrow">{t("news.prefs")}</span>
            <FeedPreferences />
          </div>


          <div className="row">
            <Link href="/dasturlar" className="btn btn-outline btn-sm">
              {t("nav.programs")}
            </Link>
            <Link href="/imkoniyatlar" className="btn btn-outline btn-sm">
              {t("nav.opportunities")}
            </Link>
            <Link href="/navigator" className="btn btn-outline btn-sm">
              {t("nav.navigator")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
