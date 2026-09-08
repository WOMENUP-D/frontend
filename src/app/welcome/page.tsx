"use client";

/**
 * First-run onboarding, shown once after sign-in.
 *
 * Two short steps, and only the first is required. Identity comes first — name,
 * surname, age, region — because age is what decides which health content she
 * may be shown at all, and region is what makes a vacancy or a grant relevant
 * to her rather than to Tashkent.
 *
 * The second step is what the assistant personalises on, and it is skippable:
 * an unfinished profile costs her some tailoring, and blocking her at the door
 * would cost her the portal.
 */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getAccessToken } from "@/services/api";
import { takeGoogleName } from "@/services/auth";
import { portal } from "@/services/portal";
import { useI18n, type MessageKey } from "@/i18n";
import {
  BirthDateField,
  EMPTY_BIRTH,
  birthError,
  isoBirthDate,
  type BirthParts,
} from "@/components/BirthDateField";

const REGIONS: ReadonlyArray<[string, MessageKey]> = [
  ["tashkent_city", "reg.tashkent_city"],
  ["tashkent_region", "reg.tashkent_region"],
  ["andijan", "reg.andijan"],
  ["bukhara", "reg.bukhara"],
  ["fergana", "reg.fergana"],
  ["jizzakh", "reg.jizzakh"],
  ["karakalpakstan", "reg.karakalpakstan"],
  ["kashkadarya", "reg.kashkadarya"],
  ["khorezm", "reg.khorezm"],
  ["namangan", "reg.namangan"],
  ["navoi", "reg.navoi"],
  ["samarkand", "reg.samarkand"],
  ["sirdarya", "reg.sirdarya"],
  ["surkhandarya", "reg.surkhandarya"],
];

/** The stored value and its label. The same map is used by the cabinet to read
 *  these back — see `interestKey` in utils/format. */
const INTERESTS: ReadonlyArray<[string, MessageKey]> = [
  ["kasb egallash", "dir.work.t"],
  ["tadbirkorlik", "dir.biz.t"],
  ["sogʻliq", "dir.health.t"],
  ["farzand tarbiyasi", "dir.family.t"],
  ["raqamli koʻnikmalar", "dir.digital.t"],
  ["liderlik", "dir.lead.t"],
];

const DIRECTIONS: ReadonlyArray<[string, MessageKey]> = [
  ["education_skills", "dim.education_skills"],
  ["employment", "dim.employment"],
  ["entrepreneurship", "dim.entrepreneurship"],
  ["financial_literacy", "dim.financial_literacy"],
  ["healthy_lifestyle", "dim.healthy_lifestyle"],
  ["family_parenting", "dim.family_parenting"],
  ["social_activity", "dim.social_activity"],
  ["international_integration", "dim.international_integration"],
];

export default function WelcomePage() {
  const { t } = useI18n();
  const router = useRouter();

  const [stage, setStage] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [birth, setBirth] = useState<BirthParts>(EMPTY_BIRTH);
  // Set once she leaves the control, so the form does not complain at someone
  // who has only got as far as picking a month.
  const [birthTouched, setBirthTouched] = useState(false);
  const [region, setRegion] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [direction, setDirection] = useState(DIRECTIONS[0][0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const birthRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    // Google already told us her name. Asking for it again would be the
    // portal admitting it did not listen.
    const fromGoogle = takeGoogleName();
    if (fromGoogle?.name) setName(fromGoogle.name);
    if (fromGoogle?.surname) setSurname(fromGoogle.surname);

    // Focus the first field she still has to fill in. `autoFocus` cannot do
    // this: it is decided when the input mounts, which is before we know
    // whether Google already gave us a name.
    (fromGoogle?.name ? birthRef : nameRef).current?.focus();
    // Staff never see this: the questionnaire exists to personalise a learner's
    // plan, and a coordinator does not have one.
    portal
      .me()
      .then((me) => {
        const roles = (me as { roles?: string[] }).roles ?? [];
        if (roles.some((r) => r !== "user" && r !== "mother")) router.replace("/admin");
      })
      .catch(() => undefined);
  }, [router]);

  const today = useMemo(() => new Date(), []);
  const birthIso = isoBirthDate(birth);
  const birthIssue = birthError(birth, today);
  const stage1Valid = name.trim().length > 0 && birthIssue === null && birthIso !== null;

  async function save(withDetails: boolean) {
    if (!stage1Valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await portal.assistantOnboarding({
        name: name.trim(),
        surname: surname.trim(),
        birth_date: birthIso!,
        region: region || null,
        interests: withDetails ? interests : [],
        goal: withDetails ? goal.trim() : "",
        direction: withDetails ? direction : "",
        consent_ai_personalisation: true,
      });
      // Onboarding ends in the feed. Her plan and her score live one tab
      // away and are worth opening deliberately; the first thing the portal
      // owes her after she has answered its questions is something to read.
      router.push("/yangiliklar");
    } catch {
      setError(t("asst.err"));
    } finally {
      setBusy(false);
    }
  }

  function toggle(value: string) {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value],
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-shell auth-shell-single">
        <section className="auth-card stack">
          <div className="stack" style={{ gap: 6 }}>
            <span className="eyebrow">
              {t("wel.step")} {stage} / 2
            </span>
            <h1 className="auth-title" style={{ fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)" }}>
              {t(stage === 1 ? "wel.title1" : "wel.title2")}
            </h1>
            <p className="muted small">{t(stage === 1 ? "wel.lead1" : "wel.lead2")}</p>
            <div className="wel-progress" aria-hidden="true">
              <span className="wel-progress-fill" style={{ width: stage === 1 ? "50%" : "100%" }} />
            </div>
          </div>

          {stage === 1 ? (
            <>
              <div className="wel-row">
                <div className="field">
                  <label className="label" htmlFor="name">{t("wel.firstName")}</label>
                  <input
                    id="name"
                    ref={nameRef}
                    className="input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="given-name"
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="surname">{t("wel.lastName")}</label>
                  <input
                    id="surname"
                    className="input"
                    value={surname}
                    onChange={(event) => setSurname(event.target.value)}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div onBlur={() => setBirthTouched(true)}>
                <BirthDateField
                  value={birth}
                  onChange={setBirth}
                  dayRef={birthRef}
                  error={birthTouched ? birthIssue : null}
                />
              </div>

              <div className="wel-row">
                <div className="field">
                  <label className="label" htmlFor="region">{t("wel.region")}</label>
                  <select
                    id="region"
                    className="input"
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                  >
                    <option value="">{t("wel.regionPick")}</option>
                    {REGIONS.map(([value, key]) => (
                      <option key={value} value={value}>
                        {t(key)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className="btn btn-primary btn-block btn-lg"
                onClick={() => setStage(2)}
                disabled={!stage1Valid}
              >
                {t("wel.next")}
              </button>
            </>
          ) : (
            <>
              <div className="stack" style={{ gap: 8 }}>
                <span className="small">{t("asst.obInterests")}</span>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {INTERESTS.map(([value, key]) => (
                    <button
                      key={value}
                      type="button"
                      className={interests.includes(value) ? "chip chip-on" : "chip"}
                      onClick={() => toggle(value)}
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="goal">{t("asst.obGoal")}</label>
                <input
                  id="goal"
                  className="input"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder={t("asst.obGoalPh")}
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="direction">{t("asst.obDirection")}</label>
                <select
                  id="direction"
                  className="input"
                  value={direction}
                  onChange={(event) => setDirection(event.target.value)}
                >
                  {DIRECTIONS.map(([value, key]) => (
                    <option key={value} value={value}>
                      {t(key)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-primary btn-block btn-lg"
                onClick={() => save(true)}
                disabled={busy}
              >
                {t("wel.finish")}
              </button>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-ghost btn-sm grow" onClick={() => setStage(1)}>
                  {t("wel.back")}
                </button>
                <button
                  className="btn btn-ghost btn-sm grow"
                  onClick={() => save(false)}
                  disabled={busy}
                >
                  {t("wel.skip")}
                </button>
              </div>
            </>
          )}

          {error && <div className="notice notice-red small">{error}</div>}
        </section>
      </div>
    </main>
  );
}
