"use client";

/**
 * Staff sign-in.
 *
 * Separate from the public login on purpose. An office account belongs to a
 * desk, not to somebody's personal handset: a coordinator on a shared machine
 * should not need an SMS to open a dashboard, and she is never asked for a
 * name, an age or a region — that questionnaire exists to personalise a
 * learner's plan, and she is not a learner here.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, setTokens } from "@/services/api";
import { staffLogin } from "@/services/auth";
import { useI18n } from "@/i18n";
import { PasswordInput } from "@/components/PasswordInput";

export default function StaffLoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy || login.trim().length < 3 || password.length < 8) return;
    setBusy(true);
    setError(null);
    try {
      const tokens = await staffLogin(login.trim(), password);
      setTokens(tokens.access_token, tokens.refresh_token);
      router.push("/admin");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? t("sl.tooMany")
          : t("sl.wrong"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell auth-shell-single">
        <section className="auth-card stack">
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">{t("sl.badge")}</span>
            <h1 className="auth-title" style={{ fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)" }}>
              {t("sl.title")}
            </h1>
            <p className="muted small">{t("sl.lead")}</p>
          </div>

          <div className="field">
            <label className="label" htmlFor="login">{t("sl.login")}</label>
            <input
              id="login"
              className="input input-lg"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void submit()}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="password">{t("sl.password")}</label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void submit()}
              autoComplete="current-password"
            />
          </div>

          <button
            className="btn btn-primary btn-block btn-lg"
            onClick={submit}
            disabled={busy || login.trim().length < 3 || password.length < 8}
          >
            {t(busy ? "sl.checking" : "sl.submit")}
          </button>

          {error && <div className="notice notice-red small">{error}</div>}

          <hr className="hr" />
          <Link href="/login" className="faint" style={{ textAlign: "center" }}>
            {t("sl.userLogin")}
          </Link>
        </section>
      </div>
    </main>
  );
}
