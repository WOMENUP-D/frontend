"use client";

/**
 * The account's two irreversible actions, at the foot of the cabinet.
 *
 * "Sign out on all devices" (C-17) — the server already had it for the woman
 * who signed in on a shared phone and walked away; it had no button.
 *
 * "Delete account" (I-06) — one request used to anonymise an account for good.
 * Now a dialog says what happens and asks for the current password (or, for
 * an account that has none, the typed word DELETE), and the server checks it.
 * A wrong password is said beside the field; the last administrator is
 * refused with a reason. On success this browser forgets her entirely.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { ApiError } from "@/services/api";
import { deleteAccount, logoutEverywhere } from "@/services/auth";
import { ConfirmDialog } from "@/components/org/ConfirmDialog";
import { PasswordInput } from "@/components/PasswordInput";

/** The message for a failed deletion. Pure; exported for the tests. */
export function deletionErrorKey(err: unknown): MessageKey {
  if (err instanceof ApiError) {
    if (err.detail === "password_incorrect" || err.status === 403) return "au.acc.wrongPassword";
    if (err.detail === "last_admin" || err.status === 409) return "au.acc.lastAdmin";
    // A passwordless account that did not type the word.
    if (err.detail === "confirmation_required") return "au.acc.typeDelete";
    if (err.status === 429) return "login.tooMany";
  }
  return "au.acc.deleteErr";
}

export function AccountSecurity() {
  const { t } = useI18n();
  const router = useRouter();

  const [everywhereOpen, setEverywhereOpen] = useState(false);
  const [everywhereBusy, setEverywhereBusy] = useState(false);
  const [everywhereError, setEverywhereError] = useState<MessageKey | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<MessageKey | null>(null);
  const [noPassword, setNoPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [word, setWord] = useState("");

  async function signOutEverywhere() {
    setEverywhereBusy(true);
    setEverywhereError(null);
    try {
      await logoutEverywhere();
      setEverywhereOpen(false);
      router.push("/login?mode=signin");
    } catch {
      setEverywhereError("au.acc.everywhereErr");
    } finally {
      setEverywhereBusy(false);
    }
  }

  async function confirmDelete() {
    if (noPassword ? word !== "DELETE" : !password) {
      setDeleteError(noPassword ? "au.acc.typeDelete" : "au.err.passwordEmpty");
      return;
    }
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteAccount(noPassword ? { confirm: "DELETE" } : { password });
      setDeleteOpen(false);
      router.push("/");
    } catch (err) {
      setDeleteError(deletionErrorKey(err));
    } finally {
      setDeleteBusy(false);
    }
  }

  function closeDelete() {
    if (deleteBusy) return;
    setDeleteOpen(false);
    setPassword("");
    setWord("");
    setDeleteError(null);
    setNoPassword(false);
  }

  return (
    <section className="au-account stack" aria-labelledby="au-account-h">
      <h2 id="au-account-h" className="eyebrow" style={{ margin: 0 }}>
        {t("au.acc.title")}
      </h2>

      <div className="au-account-row">
        <p className="small muted">{t("au.acc.everywhereHint")}</p>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => {
            setEverywhereError(null);
            setEverywhereOpen(true);
          }}
        >
          {t("au.acc.everywhere")}
        </button>
      </div>

      <div className="au-account-row">
        <p className="small muted">{t("au.acc.deleteHint")}</p>
        <button type="button" className="btn btn-sm au-danger-link" onClick={() => setDeleteOpen(true)}>
          {t("au.acc.delete")}
        </button>
      </div>

      <ConfirmDialog
        open={everywhereOpen}
        title={t("au.acc.everywhereTitle")}
        confirm={t("au.acc.everywhereConfirm")}
        busy={everywhereBusy}
        error={everywhereError ? t(everywhereError) : null}
        onConfirm={() => void signOutEverywhere()}
        onCancel={() => !everywhereBusy && setEverywhereOpen(false)}
      >
        <p className="small">{t("au.acc.everywhereHint")}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteOpen}
        title={t("au.acc.deleteTitle")}
        confirm={t("au.acc.deleteConfirm")}
        tone="danger"
        busy={deleteBusy}
        error={deleteError ? t(deleteError) : null}
        onConfirm={() => void confirmDelete()}
        onCancel={closeDelete}
      >
        <p className="small">{t("au.acc.deleteBody")}</p>
        {noPassword ? (
          <label className="au-confirm-field">
            <span className="label">{t("au.acc.typeDelete")}</span>
            <input
              className="input"
              value={word}
              onChange={(event) => setWord(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </label>
        ) : (
          <div className="au-confirm-field">
            <label className="label" htmlFor="au-delete-password">{t("au.acc.deletePassword")}</label>
            <PasswordInput
              id="au-delete-password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void confirmDelete();
                }
              }}
            />
          </div>
        )}
        <button
          type="button"
          className="au-inline-action"
          style={{ marginTop: 10 }}
          onClick={() => {
            setNoPassword((value) => !value);
            setDeleteError(null);
          }}
        >
          {t(noPassword ? "au.acc.havePassword" : "au.acc.noPassword")}
        </button>
      </ConfirmDialog>
    </section>
  );
}
