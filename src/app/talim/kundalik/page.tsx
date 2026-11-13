import { redirect } from "next/navigation";

/**
 * The study diary used to be drawn from design-time fixtures: every account
 * opened it to another woman's entries ("…ovozim baribir titradi"), shown as
 * if they were her own. There is no diary storage behind the platform yet, so
 * there is nothing true to show here — the address now opens the learning
 * dashboard instead of a stranger's notes. (QA B-05)
 *
 * When a diary backend exists, this page comes back reading `/users/me/…`;
 * the fixtures and the mock-data hook were removed so they cannot return.
 */
export default function LearningDiary() {
  redirect("/talim");
}
