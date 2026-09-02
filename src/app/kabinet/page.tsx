"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, getAccessToken, isStaff } from "@/services/api";
import {
  portal,
  type AssistantProfile,
  type DevelopmentScore,
  type NextStepCard,
} from "@/services/portal";
import { DimensionRow, EdRow, EdRows, Empty, Loading, NeedsAuth, ScoreRing } from "@/components/ui";
import { ActivityCalendar } from "@/components/ActivityCalendar";
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
  account,
  persona,
  name,
  t,
}: {
  profile: Profile | null;
  account: Account | null;
  persona: AssistantProfile | null;
  name: string;
  t: (key: MessageKey) => string;
}) {
  const shortId = account?.id ? account.id.split("-")[0].toUpperCase() : null;
  const joined = account?.created_at
    ? new Date(account.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" })
    : null;
  /** Numeric runs are skipped: "dilnoza1998" should give D, not D1. */
  const initials = name
    .split(/[\s@._-]+/)
    .filter((part) => part && /\p{L}/u.test(part))
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  /* Age comes from the assistant persona; the birth date is the fallback,
     because a profile can carry one without the persona having been built. */
  const age = persona?.age ?? (profile?.birth_date
    ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / 31557600000)
    : null);
  /* The directions she is developing in — the weakest score dimensions. Falls
     back to what she studied, which is the nearest thing a profile holds. */
  const directions = (persona?.directions ?? []).map((d) => t(dimensionKey(d)));
  const direction = directions.length > 0
    ? directions.join(", ")
    : profile?.education_field ?? null;

  /* `district` is free text she typed; `region` is an enum value and has to be
     looked up, or the card prints "tashkent_city" at her. */
  const place = profile?.district ?? (account?.region ? t(regionKey(account.region)) : null);
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
  const percent = profile?.completeness_percent ?? 0;

  return (
    <section className="pcard">
      <div className="pcard-portrait">
        <span className="pcard-avatar" aria-hidden="true">{initials || "•"}</span>
        {profile?.employment_status && (
          <span className="pcard-status">
            <span className="pcard-dot" aria-hidden="true" />
            {profile.employment_status}
          </span>
        )}
        {shortId && (
          <span className="pcard-idno">{t("prof.id")} <code>{shortId}</code></span>
        )}
      </div>

      <div className="pcard-body">
        {/* The page heading: this card is the identity block of the cabinet,
            so the person's name is the page's h1 rather than a heading above it. */}
        <h1 className="pcard-name">{name}</h1>
        {role && <p className="pcard-role">{role}</p>}
        {profile?.bio && <p className="pcard-bio">{profile.bio}</p>}

        {(age != null || direction) && (
          <dl className="pcard-facts">
            {age != null && (
              <div><dt>{t("prof.age")}</dt><dd>{age}</dd></div>
            )}
            {direction && (
              <div><dt>{t("prof.direction")}</dt><dd>{direction}</dd></div>
            )}
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

      <footer className="pcard-foot">
        <div className="pcard-where">
          {place && <span className="pcard-place">📍 {place}</span>}
          {joined && (
            <span className="pcard-avail">{t("prof.joined")}: {joined}</span>
          )}
          {/* A profile filled in over months spends most of its life half empty,
              and a card that just leaves the gaps blank reads as broken. The
              meter turns the blanks into progress and gives the button below a
              reason to be pressed. */}
          <div className="pcard-meter">
            <div className="spread small">
              <span className="muted">{t("cab.profileFull")}</span>
              <strong>{percent}%</strong>
            </div>
            <div className="bar"><span style={{ width: `${percent}%` }} /></div>
          </div>
        </div>
        <Link href="/welcome" className="pcard-cta">
          {percent < 100 ? t("prof.fill") : t("prof.edit")}
        </Link>
      </footer>
    </section>
  );
}

export default function CabinetPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [score, setScore] = useState<DevelopmentScore | null>(null);
  const [step, setStep] = useState<NextStepCard | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [enrollments, setEnrollments] = useState<{ progress_percent: number; status: string }[]>([]);
  /* The questionnaire she actually fills in on /diagnostika. It is a different
     record from the Development Score, and telling them apart is the whole
     point — see the aside below. */
  const [assessed, setAssessed] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  /* Age and the development directions live on the assistant persona, not on
     the profile row — the directions are the weakest score dimensions. */
  const [persona, setPersona] = useState<AssistantProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    setAuthed(Boolean(token));
    if (!token) { setLoading(false); return; }
    // Staff have no profile, no score and no plan — this page would draw an
    // empty cabinet under an administrator's name. Their screen is /admin.
    if (isStaff()) { router.replace("/admin"); return; }

    // Each block degrades on its own — a missing score must not blank the page.
    async function soft<T>(call: () => Promise<T>): Promise<T | null> {
      try { return await call(); } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        return null;
      }
    }

    (async () => {
      const [p, s, n, pl, en, lq, acc, per] = await Promise.all([
        soft(() => portal.profile() as Promise<Profile>),
        soft(() => portal.score()),
        soft(() => portal.nextStep()),
        soft(() => portal.activePlan() as Promise<Plan>),
        soft(() => portal.myEnrollments() as Promise<{ progress_percent: number; status: string }[]>),
        soft(() => portal.learningProfile()),
        soft(() => portal.me() as Promise<Account>),
        soft(() => portal.assistantProfile()),
      ]);
      setProfile(p); setScore(s); setStep(n); setPlan(pl); setEnrollments(en ?? []);
      setAssessed(Boolean(lq?.completed)); setAccount(acc); setPersona(per);
      setLoading(false);
    })();
  }, []);

  if (authed === false) return <main className="wrap page"><NeedsAuth /></main>;
  if (loading) return <main className="wrap page"><Loading rows={4} /></main>;

  const active = enrollments.filter((e) => e.status !== "completed").length;
  const done = enrollments.filter((e) => e.status === "completed").length;

  /* Her name if the platform has it, then the address she signed up with.
     "Пользователь" is the last resort rather than the first: a cabinet that
     greets her as a generic noun is not hers. */
  const displayName =
    profile?.full_name || account?.email?.split("@")[0] || account?.phone || t("cab.user");

  const stats: ReadonlyArray<[string, string | number]> = [
    [t("cab.activeCourses"), active],
    [t("cab.completed"), done],
    [t("cab.profileFull"), `${profile?.completeness_percent ?? 0}%`],
    [t("cab.totalScore"), score ? Math.round(score.composite) : "—"],
  ];

  return (
    <main className="wrap page">
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
                <Link href="/diagnostika" className="btn btn-outline btn-sm">
                  {t("cab.retake")}
                </Link>
              </div>
              <div className="stack" style={{ gap: 10 }}>
                {score.dimensions.map((d) => (
                  <DimensionRow key={d.dimension} {...d} />
                ))}
              </div>
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
            <ProfileDetails
              profile={profile}
              account={account}
              persona={persona}
              name={displayName}
              t={t}
            />
          </div>
        </aside>

        <div className="stack" style={{ gap: 26 }}>
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
                <Link href="/diagnostika" className="btn btn-primary">
                  {t("cab.startAssess")}
                </Link>
              }
            />
          )}

          {/* A year of squares: what she has actually been doing, before the
              plan tells her what to do next. */}
          <ActivityCalendar />

          {/* Today's step, set as a pull quote */}
          {step && (
            <div className="ed-panel">
              <span className="eyebrow">{t("cab.todayStep")}</span>
              <p className="ed-panel-quote">{step.title}</p>
              <p className="muted small">{step.description}</p>
              {step.action_url && (
                <Link
                  href={
                    step.action_url.startsWith("/assessments") ? "/diagnostika" : "/reja"
                  }
                  className="btn btn-primary btn-sm"
                  style={{ alignSelf: "flex-start" }}
                >
                  {t("cab.begin")}
                </Link>
              )}
            </div>
          )}

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

          <div>
            <span className="eyebrow">{t("cab.quickLinks")}</span>
            <EdRows>
              {stats.map(([label, value], index) => (
                <EdRow
                  key={label}
                  index={index + 1}
                  title={label}
                  arrow={false}
                  side={
                    <strong className="figure" style={{ fontSize: "1.5rem" }}>
                      {value}
                    </strong>
                  }
                />
              ))}
            </EdRows>
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
