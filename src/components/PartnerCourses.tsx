"use client";

/**
 * Courses that are not ours.
 *
 * The catalogue above is what WomanUP runs and can promise something about:
 * a plan, a mentor, a certificate the portal itself issues. These five are
 * somebody else's — Google's, Yale's, IBM's, on Coursera — and every one of
 * them leaves the site. That difference is the whole reason they sit in their
 * own section rather than mixed into the grid: a card that hands a woman to
 * another company in another language should say so before she taps it, not
 * after.
 *
 * So each card carries the provider, the length, and two facts the portal's
 * own programmes never need — that it opens on coursera.org, and that it is
 * taught in English.
 */

import { useI18n, type MessageKey } from "@/i18n";

type Course = {
  href: string;
  /** Kept in the original: it is the name she will see on the other side. */
  title: string;
  provider: string;
  /** Borrows the catalogue's colour for the same subject. */
  cat: string;
  length: MessageKey;
  /** A certificate at the end, or a set of courses rather than one course. */
  kind: "certificate" | "course" | "collection";
};

const COURSES: ReadonlyArray<Course> = [
  {
    href: "https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce",
    title: "Google Digital Marketing & E-commerce",
    provider: "Google",
    cat: "entrepreneurship",
    length: "pc.len.6m",
    kind: "certificate",
  },
  {
    href: "https://www.coursera.org/learn/foundations-of-digital-marketing-and-e-commerce",
    title: "Foundations of Digital Marketing and E-commerce",
    provider: "Google",
    cat: "digital_safety",
    length: "pc.len.1w",
    kind: "course",
  },
  {
    href: "https://www.coursera.org/learn/financial-markets-global",
    title: "Financial Markets",
    provider: "Yale University · Robert Shiller",
    cat: "financial_literacy",
    length: "pc.len.3w",
    kind: "course",
  },
  {
    href: "https://www.coursera.org/career-academy/roles/digital-marketing-specialist",
    title: "Digital Marketing Specialist",
    provider: "Coursera Career Academy",
    cat: "vocational_skills",
    length: "pc.len.path",
    kind: "collection",
  },
  {
    href: "https://www.coursera.org/professional-certificates/ibm-ui-ux-designer",
    title: "IBM UI/UX Designer",
    provider: "IBM",
    cat: "digital_safety",
    length: "pc.len.4m",
    kind: "certificate",
  },
];

const KIND: Record<Course["kind"], MessageKey> = {
  certificate: "pc.kind.certificate",
  course: "pc.kind.course",
  collection: "pc.kind.collection",
};

export function PartnerCourses() {
  const { t } = useI18n();

  return (
    <section className="section partner-section">
      <div className="sec-head sec-head-counted">
        <h2>{t("pc.title")}</h2>
        <p>{t("pc.lead")}</p>
        <span className="sec-count" aria-hidden="true">
          ({COURSES.length})
        </span>
      </div>

      <div className="partner-grid">
        {COURSES.map((course) => (
          <a
            key={course.href}
            className="partner-card"
            data-cat={course.cat}
            href={course.href}
            target="_blank"
            rel="noopener noreferrer"
            /* Said out loud, because the visible arrow is only visible. */
            aria-label={`${course.title} — ${course.provider}. ${t("pc.opens")}`}
          >
            <span className="partner-provider">{course.provider}</span>
            <h3 className="partner-title">{course.title}</h3>
            <span className="partner-meta">
              {t("pc.beginner")} · {t(course.length)} · {t(KIND[course.kind])}
            </span>
            <span className="partner-foot">
              <span className="partner-lang">{t("pc.english")}</span>
              <span className="partner-host">
                coursera.org<span aria-hidden="true"> ↗</span>
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
