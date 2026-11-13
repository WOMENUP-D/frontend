"use client";

/**
 * Sign-in and sign-up, on one card.
 *
 * The left side says what she gets; the right side is the form. Two tabs at
 * the top of the card name the two things the page does (J-02), and the page
 * opens on the one she came for: `?mode=signin` from every "Sign in" link,
 * `?mode=signup` from "Get started", otherwise the mode she last used in this
 * tab (C-07). A woman who is already signed in is sent on, not shown an empty
 * registration form under her own header (C-07); `?next=` brings her back to
 * the page that asked her to sign in (C-09).
 *
 * Every rule is checked when she presses the button, not by greying it out:
 * the first field that is wrong gets the focus and says what is wrong (C-11).
 * Server refusals arrive as stable codes and are said beside the field they
 * concern (C-08, C-10, C-20) — see services/authErrors.ts.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { getAccessToken, getRoles, isStaff, staffHome } from "@/services/api";
import { passwordLogin, register } from "@/services/auth";
import { track } from "@/services/analytics";
import { portal } from "@/services/portal";
import {
  EMAIL_PATTERN,
  authProblem,
  passwordIssue,
  type AuthField,
  type AuthProblem,
} from "@/services/authErrors";
import {
  BirthDateField,
  EMPTY_BIRTH,
  birthError,
  isoBirthDate,
  type BirthParts,
} from "@/components/BirthDateField";
import { useI18n, type MessageKey } from "@/i18n";
import { PasswordInput } from "@/components/PasswordInput";
import { showDemo } from "@/services/env";
import { safeNext } from "@/utils/url";
import { RESET_EMAIL_KEY } from "@/app/parol-tiklash/handoff";

/** Where a signed-in learner lands when nothing asked her to come back. */
const HOME = "/kabinet";

/** The mode she last used in this tab, so a reload does not flip the form. */
const MODE_KEY = "womanup.login.mode";

type Mode = "signup" | "signin";

/**
 * The ready-made account for a demonstration build.
 *
 * Written against `process.env.NEXT_PUBLIC_DEMO*` directly rather than
 * through `showDemo()`: the compiler replaces the variables at build time and
 * drops the whole branch, so a production bundle carries no credentials at
 * all. The values themselves are supplied by the demo deployment's
 * environment; nothing of the kind is written in this file.
 */
const DEMO_ACCOUNTS =
  process.env.NEXT_PUBLIC_DEMO === "true" &&
  process.env.NEXT_PUBLIC_DEMO_EMAIL &&
  process.env.NEXT_PUBLIC_DEMO_PASSWORD
    ? ([
        {
          email: process.env.NEXT_PUBLIC_DEMO_EMAIL,
          password: process.env.NEXT_PUBLIC_DEMO_PASSWORD,
          label: "login.roleUser",
          hint: "login.hintUser",
        },
      ] as const)
    : ([] as const);

const BENEFITS: ReadonlyArray<MessageKey> = ["login.b1", "login.b2", "login.b3"];

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

/** The page's address parameters, from the router: during a client-side
 *  navigation `window.location` still holds the page she came from. */
function readParams(params: URLSearchParams | null): { mode: Mode; next: string | null } {
  if (typeof window === "undefined" || !params) return { mode: "signup", next: null };
  const asked = params.get("mode");
  let mode: Mode = "signup";
  if (asked === "signin" || asked === "signup") mode = asked;
  else {
    try {
      const last = window.sessionStorage.getItem(MODE_KEY);
      if (last === "signin" || last === "signup") mode = last;
    } catch {
      /* no storage: sign-up, the default */
    }
  }
  return { mode, next: safeNext(params.get("next")) };
}

type FieldErrors = Partial<Record<AuthField, MessageKey>>;

const ORDER: AuthField[] = ["name", "birth", "email", "password", "consent"];

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-page" aria-busy="true" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const initial = useMemo(() => readParams(search as URLSearchParams | null), [search]);
  const [mode, setModeState] = useState<Mode>(initial.mode);
  const next = initial.next;
  // Already signed in: nothing on this page is for her.
  const [leaving, setLeaving] = useState(() => Boolean(getAccessToken()));

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [region, setRegion] = useState("");
  const [birth, setBirth] = useState<BirthParts>(EMPTY_BIRTH);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [problem, setProblem] = useState<AuthProblem | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const failures = useRef(0);

  const refs = {
    name: useRef<HTMLInputElement>(null),
    birth: useRef<HTMLSelectElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    consent: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    if (!getAccessToken()) return;
    router.replace(isStaff() ? staffHome() : (next ?? HOME));
  }, [router, next]);

  function setMode(value: Mode) {
    setModeState(value);
    // A message about the other form is not about this one (C-19).
    setProblem(null);
    setFields({});
    failures.current = 0;
    try {
      window.sessionStorage.setItem(MODE_KEY, value);
    } catch {
      /* the mode simply is not remembered */
    }
  }

  /* The sign-up funnel's first step: she touched the form. Reported once per
     visit to this page, so the figure counts people, not keystrokes. */
  const started = useRef(false);
  function onSignupTouched() {
    if (started.current || mode !== "signup") return;
    started.current = true;
    track("registration_started", { path: "/login" });
  }

  const today = useMemo(() => new Date(), []);

  /** What is wrong with the form as it stands, field by field. */
  function validate(): FieldErrors {
    const out: FieldErrors = {};
    if (mode === "signup") {
      if (!name.trim()) out.name = "au.err.name";
      const issue = birthError(birth, today);
      if (issue) out.birth = issue;
      else if (isoBirthDate(birth) === null) out.birth = "au.err.birth";
    }
    if (!EMAIL_PATTERN.test(email)) out.email = "au.err.emailInvalid";
    if (mode === "signup") {
      const pw = passwordIssue(password, email);
      if (pw === "short") out.password = "au.err.short";
      else if (pw === "common") out.password = "au.err.weak";
      if (!agreed) out.consent = "au.err.consent";
    } else if (!password) {
      out.password = "au.err.passwordEmpty";
    }
    return out;
  }

  function focusFirst(errors: FieldErrors) {
    const first = ORDER.find((field) => errors[field]);
    if (first) refs[first].current?.focus();
  }

  /** Register or sign in, then decide where she lands. */
  async function submit() {
    if (busy) return;
    const errors = validate();
    setFields(errors);
    setProblem(null);
    if (Object.keys(errors).length > 0) {
      focusFirst(errors);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await register(email, password, agreed);
        // Everything the welcome screen used to ask for was already typed on
        // this form, so save it now. Nobody introduces herself twice.
        try {
          await portal.assistantOnboarding({
            name: name.trim(),
            surname: surname.trim(),
            birth_date: isoBirthDate(birth)!,
            region: region || null,
            interests: [],
            goal: "",
            direction: "",
            consent_ai_personalisation: true,
          });
        } catch {
          // The account exists, but the portal knows nothing about her —
          // including her age, which decides what she may be shown. Finish it
          // on /welcome rather than dropping her in as an unknown.
          setLeaving(true);
          router.push("/welcome");
          return;
        }
        setLeaving(true);
        router.push(next ?? HOME);
        return;
      }

      await passwordLogin(email, password);
      failures.current = 0;
      setLeaving(true);
      // A coordinator signing in here belongs in the panel, not in a cabinet
      // she does not have.
      if (getRoles().some((role) => role !== "user" && role !== "mother")) {
        router.push(staffHome());
        return;
      }
      // An account that never finished onboarding has no name or age on
      // record; ask now rather than leave her as an unknown (C-16).
      const me = (await portal.me().catch(() => null)) as { onboarding_completed_at?: string | null } | null;
      router.push(me && !me.onboarding_completed_at ? "/welcome" : (next ?? HOME));
    } catch (err) {
      if (mode === "signin") failures.current += 1;
      const found = authProblem(err, mode, failures.current);
      if (found.field) {
        const fieldErrors = { [found.field]: found.key } as FieldErrors;
        setFields(fieldErrors);
        focusFirst(fieldErrors);
      }
      setProblem(found);
    } finally {
      setBusy(false);
    }
  }

  if (leaving) return <main className="auth-page" aria-busy="true" />;

  const fieldError = (field: AuthField) =>
    fields[field] ? (
      <span className="au-field-error" id={`${field}-error`} role="alert">
        {t(fields[field]!)}
      </span>
    ) : null;
  const invalid = (field: AuthField) =>
    fields[field] ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {};

  // A problem shown beside its field is not repeated under the button.
  const general = problem && !problem.field ? problem : null;
  // The address she typed is handed to the reset page in this tab's storage,
  // not in the URL, where it would sit in history and in server logs.
  const handOverEmail = () => {
    try {
      if (email) window.sessionStorage.setItem(RESET_EMAIL_KEY, email);
    } catch {
      /* she types it again */
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-aside stack">
          <span className="eyebrow">{t(mode === "signup" ? "au.badge.signup" : "au.badge.signin")}</span>
          <h1 className="auth-title">{t(mode === "signup" ? "login.signupTitle" : "login.title")}</h1>
          <p className="muted">{t(mode === "signup" ? "au.lead.signup" : "au.lead.signin")}</p>
          <ul className="stack" style={{ gap: 12, marginTop: 8 }}>
            {BENEFITS.map((key) => (
              <li key={key} className="auth-benefit">
                <span className="auth-tick">✦</span>
                <span className="small">{t(key)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="auth-card stack" onFocusCapture={onSignupTouched}>
          <div className="au-tabs" role="tablist" aria-label={t("au.tabs")}>
            {(["signin", "signup"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`tab-${value}`}
                aria-selected={mode === value}
                aria-controls="auth-form"
                className={mode === value ? "au-tab is-on" : "au-tab"}
                onClick={() => mode !== value && setMode(value)}
              >
                {t(value === "signin" ? "nav.signIn" : "login.signupTitle")}
              </button>
            ))}
          </div>

          <form
            id="auth-form"
            role="tabpanel"
            aria-labelledby={`tab-${mode}`}
            className="stack"
            style={{ gap: 16 }}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {mode === "signup" && (
              <>
                <div className="wel-row">
                  <div className="field">
                    <label className="label" htmlFor="name">{t("wel.firstName")}</label>
                    <input
                      id="name"
                      ref={refs.name}
                      className="input"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="given-name"
                      autoFocus
                      {...invalid("name")}
                    />
                    {fieldError("name")}
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
                      <option key={value} value={value}>{t(key)}</option>
                    ))}
                  </select>
                </div>

                <BirthDateField
                  value={birth}
                  onChange={(value) => {
                    setBirth(value);
                    if (fields.birth) setFields((current) => ({ ...current, birth: undefined }));
                  }}
                  dayRef={refs.birth}
                  error={fields.birth ?? null}
                />
              </>
            )}

            <div className="field">
              <label className="label" htmlFor="email">{t("login.email")}</label>
              <input
                id="email"
                ref={refs.email}
                type="email"
                className="input input-lg"
                value={email}
                onChange={(event) => setEmail(event.target.value.trim())}
                placeholder={t("login.emailPlaceholder")}
                inputMode="email"
                autoComplete={mode === "signin" ? "username" : "email"}
                autoFocus={mode === "signin"}
                {...invalid("email")}
              />
              {fieldError("email") ?? <span className="faint">{t("login.emailWhy")}</span>}
              {problem?.offerSignIn && (
                <button type="button" className="au-inline-action" onClick={() => setMode("signin")}>
                  {t("au.err.takenAction")}
                </button>
              )}
            </div>

            <div className="field">
              <div className="spread">
                <label className="label" htmlFor="password">{t("login.password")}</label>
                {mode === "signin" && (
                  <Link href="/parol-tiklash" className="au-forgot" onClick={handOverEmail}>{t("au.forgot")}</Link>
                )}
              </div>
              <PasswordInput
                id="password"
                ref={refs.password}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                {...invalid("password")}
              />
              {fieldError("password") ??
                (mode === "signup" && <span className="faint">{t("login.passwordHint")}</span>)}
            </div>

            {mode === "signup" && (
              <div className="field">
                <label className="auth-consent">
                  <input
                    ref={refs.consent}
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => {
                      setAgreed(e.target.checked);
                      if (e.target.checked) setFields((current) => ({ ...current, consent: undefined }));
                    }}
                    {...invalid("consent")}
                  />
                  <span>
                    {t("login.agreeLead")}{" "}
                    <Link href="/maxfiylik" target="_blank" rel="noopener noreferrer">
                      {t("legal.privacyTitle")}
                    </Link>
                  </span>
                </label>
                {fieldError("consent")}
              </div>
            )}

            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy}>
              {t(busy ? "login.working" : mode === "signup" ? "login.doRegister" : "login.doLogin")}
            </button>
          </form>

          {general && (
            <div className="notice notice-red small stack" style={{ gap: 6 }} role="alert">
              <span>{t(general.key)}</span>
              {general.offerReset && (
                <Link href="/parol-tiklash" className="au-inline-action" onClick={handOverEmail}>
                  {t("au.forgot")}
                </Link>
              )}
            </div>
          )}

          {/* The ready-made accounts publish a working password, so they
              appear only in a demonstration build. */}
          {showDemo() && (
            <details className="auth-demo">
              <summary className="small">{t("login.demoTitle")}</summary>
              <div className="stack" style={{ gap: 8, marginTop: 10 }}>
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    className="btn btn-outline btn-sm btn-block"
                    style={{ justifyContent: "space-between" }}
                    onClick={() => {
                      setMode("signin");
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                  >
                    <span>{t(account.label)} · {account.email}</span>
                    <span className="faint">{t(account.hint)}</span>
                  </button>
                ))}
                <p className="faint">{t("login.anyEmail")}</p>
              </div>
            </details>
          )}

          {/* The staff door, named once and quietly. */}
          <Link href="/admin/login" className="faint auth-staff">{t("login.staff")}</Link>
        </section>
      </div>

      <Link href="/" className="faint auth-back">← WomanUP</Link>
    </main>
  );
}
