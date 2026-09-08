"use client";

/**
 * Sign-in.
 *
 * One centred card rather than a form dropped on a page: signing in is the
 * moment a woman decides whether this portal is for her, so the left side says
 * what she gets and the right side asks for the one thing needed — her number.
 *
 * The code step shows the number it was sent to and keeps a way back, because
 * a mistyped digit is the most common way this flow fails.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { ApiError, getRoles } from "@/services/api";
import { googleLogin, passwordLogin, register } from "@/services/auth";
import {
  completeGoogleRedirect,
  GoogleCancelled,
  googleConfigured,
  requestGoogleIdToken,
} from "@/services/googleAuth";
import { portal } from "@/services/portal";
import {
  BirthDateField,
  EMPTY_BIRTH,
  birthError,
  isoBirthDate,
  type BirthParts,
} from "@/components/BirthDateField";
import { useI18n, type MessageKey } from "@/i18n";
import { showDemo } from "@/services/env";

/** Where a signed-in learner lands. The feed is the portal's first tab, and
 *  it is the one screen that has something on it before she has done any
 *  work — which is exactly the state she is in one second after registering. */
const HOME = "/yangiliklar";

const DEMO_ACCOUNTS = [
  {
    email: "demo@womanup.uz",
    password: "WomanUP2026",
    label: "login.roleUser",
    hint: "login.hintUser",
  },
] as const;

/** Good enough to catch a typo before a code is sent nowhere; the address is
 *  proved by the code arriving, not by this. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

/** Google's own mark, inline: the button must not depend on a remote asset. */
function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5Z"/>
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v7.8h12.4c-.3 2.1-1.6 5.2-4.6 7.3l7.6 5.9c4.5-4.2 6.7-10.3 6.7-16.9Z"/>
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.3 0 20 0 24s1 7.7 2.6 10.8l7.8-6.1Z"/>
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2 1.4-4.8 2.4-8.3 2.4-6.4 0-11.7-3.7-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48Z"/>
    </svg>
  );
}

export default function LoginPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [region, setRegion] = useState("");
  const [birth, setBirth] = useState<BirthParts>(EMPTY_BIRTH);
  const [birthTouched, setBirthTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  /** The API speaks English to developers; the login screen must not. The OTP
   *  throttle is the one error a real user hits routinely, so it gets its own
   *  translated string with the remaining seconds carried across. */
  function localiseError(err: unknown, fallback: MessageKey): string {
    if (err instanceof ApiError) {
      if (err.status === 429) return t("login.tooMany");
      // Only registration can answer 409, and it is the one failure she can
      // actually act on — so it says plainly what happened.
      if (err.status === 409) return t("login.taken");
    }
    return t(fallback);
  }

  /** Sign in with Google.
   *
   *  `googleBusy` is its own flag rather than the shared `busy` one, so the
   *  popup and the phone form cannot be fired at once, and a second click
   *  while the popup is open is ignored instead of opening a second popup.
   *
   *  With no OAuth client configured the button stays visible and says so —
   *  the same degrade-rather-than-fail rule the rest of the portal follows.
   */
  async function continueWithGoogle() {
    if (busy || googleBusy) return;
    if (!googleConfigured()) {
      setError(t("login.googleSoon"));
      return;
    }

    setGoogleBusy(true);
    setError(null);
    try {
      const idToken = await requestGoogleIdToken();
      // `null` means the browser refused the popup and Firebase sent her off
      // on a full-page redirect. There is nothing to do here; the result is
      // picked up when she comes back.
      if (idToken === null) return;
      await finishGoogle(idToken);
    } catch (err) {
      if (err instanceof GoogleCancelled) {
        // She closed the popup. Nothing went wrong; say nothing.
      } else if (err instanceof ApiError) {
        setError(
          err.status === 409
            ? t("login.googleStaff")
            : err.status === 503
              ? t("login.googleDown")
              : err.status === 429
                ? t("login.tooSoon").replace("{n}", "60")
                : t("login.googleErr"),
        );
      } else {
        setError(t("login.googleBlocked"));
      }
    } finally {
      setGoogleBusy(false);
    }
  }

  /** Exchange a Firebase token for our session and decide where she lands.
   *
   *  A brand-new account still has to say how old she is and where she lives —
   *  Google supplies neither — so she finishes onboarding; everyone else goes
   *  straight to the feed.
   */
  async function finishGoogle(idToken: string) {
    const session = await googleLogin(idToken);
    router.push(session.onboarding_completed ? HOME : "/welcome");
  }

  // Coming back from a redirect sign-in. Silent when there is nothing waiting.
  useEffect(() => {
    let cancelled = false;
    completeGoogleRedirect()
      .then((idToken) => {
        if (!idToken || cancelled) return;
        setGoogleBusy(true);
        return finishGoogle(idToken).finally(() => setGoogleBusy(false));
      })
      .catch(() => setError(t("login.googleErr")));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Opening an account and agreeing to the privacy policy are one act: the
     account cannot lawfully exist without a basis for holding her data, so the
     tick is a precondition of the button rather than a setting to find later. */
  const [agreed, setAgreed] = useState(false);

  const today = useMemo(() => new Date(), []);
  const birthIso = isoBirthDate(birth);
  const birthIssue = birthError(birth, today);

  /* The date of birth is now a precondition of signing up, not an optional
     extra. It used to be blank-able, and a blank one became 18 — which handed
     every reader who skipped it the adult health scope by default, including
     the children this portal is explicitly open to. */
  const valid =
    EMAIL.test(email) &&
    password.length >= (mode === "signup" ? 8 : 1) &&
    (mode !== "signup" ||
      (name.trim().length > 0 && agreed && birthIssue === null && birthIso !== null));

  /** Register or sign in, then decide where she lands. */
  async function submit() {
    if (busy || googleBusy || !valid) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        await register(email, password, agreed);
        // Everything the welcome screen used to ask for was already typed on
        // this form, so save it now. Nobody introduces herself twice.
        try {
          await portal.assistantOnboarding({
            name: name.trim(),
            surname: surname.trim(),
            birth_date: birthIso!,
            region: region || null,
            interests: [],
            goal: "",
            direction: "",
            consent_ai_personalisation: true,
          });
        } catch {
          // The account exists and she is signed in, but the portal now knows
          // nothing about her — including her age, which decides what she may
          // be shown. Finish it on /welcome rather than dropping her into an
          // unpersonalised feed as an unknown, which the age gate has to treat
          // as a minor anyway.
          router.push("/welcome");
          return;
        }
        // The feed, not her cabinet. A minute-old account has no score, no
        // plan and no activity, so the cabinet greets her with an empty form
        // and a 0% bar — the portal asking for work before it has shown her
        // anything. The feed has something to read on day one.
        router.push(HOME);
        return;
      }

      await passwordLogin(email, password);
      // A coordinator signing in here belongs in the panel, not in a cabinet
      // she does not have.
      const staff = getRoles().some((role) => role !== "user" && role !== "mother");
      router.push(staff ? "/admin" : HOME);
    } catch (err) {
      setError(localiseError(err, mode === "signup" ? "login.errRegister" : "login.errLogin"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-aside stack">
          <span className="eyebrow">{t("login.badge")}</span>
          <h1 className="auth-title">{t(mode === "signup" ? "login.signupTitle" : "login.title")}</h1>
          <p className="muted">{t("login.lead")}</p>
          <ul className="stack" style={{ gap: 12, marginTop: 8 }}>
            {BENEFITS.map((key) => (
              <li key={key} className="auth-benefit">
                <span className="auth-tick">✦</span>
                <span className="small">{t(key)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="auth-card stack">
          <>
            {mode === "signup" && (
              <>
                <div className="wel-row">
                  <div className="field">
                    <label className="label" htmlFor="name">{t("wel.firstName")}</label>
                    <input
                      id="name"
                      className="input"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="given-name"
                      autoFocus
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

                {/* Alone in the column now that the age input has become the
                    date-of-birth control below, so it takes the full width
                    rather than sitting in half a two-column row. */}
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

                <div onBlur={() => setBirthTouched(true)}>
                  <BirthDateField
                    value={birth}
                    onChange={setBirth}
                    error={birthTouched ? birthIssue : null}
                  />
                </div>
              </>
            )}

            <div className="field">
              <label className="label" htmlFor="email">{t("login.email")}</label>
              <input
                id="email"
                type="email"
                className="input input-lg"
                value={email}
                onChange={(event) => setEmail(event.target.value.trim())}
                onKeyDown={(event) => event.key === "Enter" && void submit()}
                placeholder="ism@example.com"
                inputMode="email"
                autoComplete="email"
                autoFocus={mode === "signin"}
              />
              <span className="faint">{t("login.emailWhy")}</span>
            </div>

            <div className="field">
              <label className="label" htmlFor="password">{t("login.password")}</label>
              <input
                id="password"
                type="password"
                className="input input-lg"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void submit()}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              {mode === "signup" && <span className="faint">{t("login.passwordHint")}</span>}
            </div>

            {mode === "signup" && (
              <label className="auth-consent">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>
                  {t("login.agreeLead")}{" "}
                  <Link href="/maxfiylik" target="_blank" rel="noopener noreferrer">
                    {t("legal.privacyTitle")}
                  </Link>
                </span>
              </label>
            )}

            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={submit}
              disabled={busy || googleBusy || !valid}
            >
              {t(
                busy
                  ? "login.working"
                  : mode === "signup"
                    ? "login.doRegister"
                    : "login.doLogin",
              )}
            </button>
            {/* Google sign-in appears only once Firebase is configured.
                Until the project has credentials there is nothing behind the
                button, and a button that answers every click with "not set
                up yet" is worse than no button — so it is not rendered.
                Fill the NEXT_PUBLIC_FIREBASE_* variables and it comes back
                on its own; the code behind it is untouched. */}
            {googleConfigured() && (
              <>
                <div className="auth-or"><span>{t("login.orDivider")}</span></div>

                <button
                  className="btn btn-outline btn-block btn-lg"
                  onClick={continueWithGoogle}
                  disabled={busy || googleBusy}
                >
                  {googleBusy ? <span className="spinner" aria-hidden="true" /> : <GoogleMark />}
                  {t(googleBusy ? "login.googleWait" : "login.google")}
                </button>
              </>
            )}

            <button
              className="btn btn-ghost btn-block btn-sm"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {t(mode === "signup" ? "login.haveAccount" : "login.noAccount")}
            </button>
          </>
          {error && <div className="notice notice-red small">{error}</div>}

          {/* The ready-made accounts publish a working password, so they
              appear only in a demonstration build. */}
          {showDemo() && (
            <details className="auth-demo">
              <summary className="small">{t("login.demoTitle")}</summary>
              <div className="stack" style={{ gap: 8, marginTop: 10 }}>
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    className="btn btn-outline btn-sm btn-block"
                    style={{ justifyContent: "space-between" }}
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                      setMode("signin");
                      setError(null);
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

          {/* No staff-sign-in link here: a public sign-in page should not
              advertise a door that only coordinators and admins can open.
              Staff reach /admin/login directly. */}
          <p className="faint auth-terms">{t("login.terms")}</p>
        </section>
      </div>

      <Link href="/" className="faint auth-back">← WomanUP</Link>
    </main>
  );
}
