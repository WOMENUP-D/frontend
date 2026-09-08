"use client";

/**
 * What the news feed ranks on: her age and the subjects she ticked.
 *
 * It lives in the cabinet rather than on the feed. A setting about *her*
 * belongs with the rest of her account, not wedged above the thing it
 * configures — the feed is for reading, and a panel that opens over it every
 * time she wants to change one subject makes the reading surface into a
 * settings screen. The feed keeps a link here and nothing else.
 *
 * Nothing here shows a score. She is setting what she is interested in; how
 * heavily that weighs against freshness and importance is our problem.
 *
 * The age is chosen as a bracket rather than typed as a number. Only the
 * bracket is stored, so a free number field would take "15", save it, and read
 * back "13" — the form losing her answer in front of her. Six buttons cannot
 * do that, and the brackets are what the ranking actually uses.
 *
 * A real date of birth on her profile wins over anything set here — the server
 * prefers it and says so through `age_source` — so in that case the age is
 * shown as a fact rather than as a control offering to overwrite it with
 * something less precise. That branch is the reason this panel keeps its own
 * age block at all: for a profile that carries only a bracket it is the one
 * self-serve way to correct it, and hiding it whenever an age merely *exists*
 * would strand exactly those accounts.
 */

import { useEffect, useState } from "react";
import { portal, type NewsPreferences } from "@/services/portal";
import { ErrorNote, Loading } from "@/components/ui";
import { useI18n } from "@/i18n";
import { newsTopicKey } from "@/utils/format";

export function FeedPreferences() {
  const { t } = useI18n();

  const [prefs, setPrefs] = useState<NewsPreferences | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    portal
      .newsPreferences()
      .then((loaded) => {
        if (cancelled) return;
        setPrefs(loaded);
        setGroup(loaded.age_group);
        setChosen(loaded.interests);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (topic: string) => {
    setSaved(false);
    setChosen((prev) =>
      prev.includes(topic) ? prev.filter((one) => one !== topic) : [...prev, topic],
    );
  };

  const save = () => {
    setSaving(true);
    setFailed(false);
    portal
      .saveNewsPreferences({
        // The bracket's lower bound: the server stores the bracket an age
        // falls in, so sending "25" for 25-34 round-trips exactly.
        age: group ? Number.parseInt(group, 10) : null,
        interests: chosen,
      })
      .then((updated) => {
        setPrefs(updated);
        setGroup(updated.age_group);
        setSaved(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setSaving(false));
  };

  if (failed && !prefs) return <ErrorNote message={t("common.error")} />;
  if (!prefs) return <Loading rows={1} />;

  const fromBirthDate = prefs.age_source === "birth_date";

  return (
    <div className="news-prefs">
      <p className="faint news-prefs-lead">{t("news.prefsLead")}</p>

      <div className="news-prefs-age">
        <span className="eyebrow">{t("news.prefsAge")}</span>
        {fromBirthDate ? (
          <p className="news-prefs-derived">
            {prefs.age} <span className="faint">· {t("news.prefsAgeAuto")}</span>
          </p>
        ) : (
          <div className="cat-filters">
            {prefs.available_age_groups.map((bracket) => (
              <button
                key={bracket}
                type="button"
                aria-pressed={group === bracket}
                className={group === bracket ? "chip chip-on" : "chip"}
                onClick={() => {
                  setSaved(false);
                  setGroup((current) => (current === bracket ? null : bracket));
                }}
              >
                {bracket}
              </button>
            ))}
          </div>
        )}
      </div>

      <fieldset className="news-prefs-topics">
        <legend className="eyebrow">{t("news.prefsInterests")}</legend>
        <div className="cat-filters">
          {prefs.available_interests.map((topic) => (
            <button
              key={topic}
              type="button"
              aria-pressed={chosen.includes(topic)}
              className={chosen.includes(topic) ? "chip chip-on" : "chip"}
              onClick={() => toggle(topic)}
            >
              {t(newsTopicKey(topic))}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="news-prefs-actions">
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? t("common.loading") : t("news.prefsSave")}
        </button>
        {saved && <span className="faint">{t("news.prefsSaved")}</span>}
        {failed && <ErrorNote message={t("common.error")} />}
      </div>
    </div>
  );
}
