"use client";

/**
 * Forgotten password (C-04).
 *
 * Without a token: she gives her address and is told — whatever the address —
 * that a link was sent if an account uses it. The API answers 202 either way,
 * so the page cannot reveal who has an account and does not try.
 *
 * With `?token=` (the emailed link, valid 60 minutes, single use): she sets a
 * new password. The token is taken out of the address bar as soon as it is
 * read, so it does not linger in history or travel on as a Referer. Saving it
 * signs her out everywhere; she then signs in with the new one.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { requestPasswordReset, resetPassword } from "@/services/auth";
import { EMAIL_PATTERN, authProblem, passwordIssue } from "@/services/authErrors";
import { PasswordInput } from "@/components/PasswordInput";
import { loginHref } from "@/utils/url";
import { takeResetEmail } from "./handoff";

export default function PasswordResetPage() {
  return (
    <Suspense fallback={<main className="auth-page" aria-busy="true" />}>
      <PasswordReset />
    </Suspense>
  );
}

function PasswordReset() {
  // From the router: during a client navigation `window.location` is stale.
  const params = useSearchParams();
  const [{ token, email }, setLink] = useState(() => ({
    token: params?.get("token") ?? null,
    email: params?.get("token") ? "" : takeResetEmail(),
  }));

  useEffect(() => {
    if (token) window.history.replaceState(null, "", "/parol-tiklash");
  }, [token]);

  return (
    <main className="auth-page">
      <div className="auth-shell auth-shell-single">
        <section className="auth-card stack">
          {token ? (
            <NewPassword token={token} onRestart={() => setLink({ token: null, email: "" })} />
          ) : (
            <AskForLink initialEmail={email} />
          )}
        </section>
      </div>
    </main>
  );
}

function AskForLink({ initialEmail }: { initialEmail: string }) {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function submit() {
    if (busy) return;
    if (!EMAIL_PATTERN.test(email)) {
      setError("au.err.emailInvalid");
      input.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email, locale);
      setSent(true);
    } catch (err) {
      setError(authProblem(err, "forgot").key);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="auth-title" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2rem)" }}>{t("au.fp.title")}</h1>
      {sent ? (
        <p className="notice small" role="status">{t("au.fp.sent")}</p>
      ) : (
        <form
          className="stack"
          style={{ gap: 16 }}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <p className="muted">{t("au.fp.lead")}</p>
          <div className="field">
            <label className="label" htmlFor="email">{t("login.email")}</label>
            <input
              id="email"
              ref={input}
              type="email"
              className="input input-lg"
              value={email}
              onChange={(event) => setEmail(event.target.value.trim())}
              inputMode="email"
              autoComplete="username"
              autoFocus
              aria-invalid={error === "au.err.emailInvalid" || undefined}
              aria-describedby={error ? "fp-error" : undefined}
            />
          </div>
          {error && (
            <p className="au-field-error" id="fp-error" role="alert">{t(error)}</p>
          )}
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy}>
            {t(busy ? "login.working" : "au.fp.send")}
          </button>
        </form>
      )}
      <Link href={loginHref("signin")} className="au-inline-action">{t("au.fp.back")}</Link>
    </>
  );
}

function NewPassword({ token, onRestart }: { token: string; onRestart: () => void }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<{ key: MessageKey; field?: "password" | "repeat" } | null>(null);
  const first = useRef<HTMLInputElement>(null);
  const second = useRef<HTMLInputElement>(null);

  async function submit() {
    if (busy) return;
    const issue = passwordIssue(password);
    if (issue) {
      setError({ key: issue === "short" ? "au.err.short" : "au.err.weak", field: "password" });
      first.current?.focus();
      return;
    }
    if (password !== repeat) {
      setError({ key: "au.err.mismatch", field: "repeat" });
      second.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      const found = authProblem(err, "reset");
      setError({ key: found.key, field: found.field === "password" ? "password" : undefined });
      if (found.field === "password") first.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <>
        <h1 className="auth-title" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2rem)" }}>{t("au.rp.title")}</h1>
        <p className="notice small" role="status">{t("au.rp.done")}</p>
        <Link href={loginHref("signin")} className="btn btn-primary btn-block btn-lg">{t("nav.signIn")}</Link>
      </>
    );
  }

  const describe = (field: "password" | "repeat") =>
    error?.field === field ? { "aria-invalid": true, "aria-describedby": "rp-error" } : {};

  return (
    <>
      <h1 className="auth-title" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2rem)" }}>{t("au.rp.title")}</h1>
      <form
        className="stack"
        style={{ gap: 16 }}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="muted">{t("au.rp.lead")}</p>
        <div className="field">
          <label className="label" htmlFor="new-password">{t("au.rp.password")}</label>
          <PasswordInput
            id="new-password"
            ref={first}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            autoFocus
            {...describe("password")}
          />
          <span className="faint">{t("login.passwordHint")}</span>
        </div>
        <div className="field">
          <label className="label" htmlFor="repeat-password">{t("au.rp.repeat")}</label>
          <PasswordInput
            id="repeat-password"
            ref={second}
            value={repeat}
            onChange={(event) => setRepeat(event.target.value)}
            autoComplete="new-password"
            {...describe("repeat")}
          />
        </div>
        {error && (
          <div className="au-field-error stack" style={{ gap: 6 }} id="rp-error" role="alert">
            <span>{t(error.key)}</span>
            {error.key === "au.err.resetInvalid" && (
              <button type="button" className="au-inline-action" onClick={onRestart}>
                {t("au.rp.again")}
              </button>
            )}
          </div>
        )}
        <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy}>
          {t(busy ? "login.working" : "au.rp.save")}
        </button>
      </form>
    </>
  );
}
