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

import { useMemo, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";

type Course = {
  href: string;
  /** Kept in the original: it is the name she will see on the other side. */
  title: string;
  provider: string;
  /** Borrows the catalogue's colour for the same subject. */
  cat: string;
  /** The language she will actually be taught in. */
  lang: "uz" | "ru" | "en";
  /** Both optional: a local platform often states neither. */
  level?: MessageKey;
  length?: MessageKey;
  /** A certificate at the end, or a set of courses rather than one course. */
  kind: "certificate" | "course" | "collection" | "free" | "freeCourse";
};

const COURSES: ReadonlyArray<Course> = [
  // --- Ўзбекча: Ochiq Kurs, бесплатная узбекская платформа ---
  {
    href: "https://ochiqkurs.uz/malaka/pythonda-dasturlash-asoslari/",
    title: "Pythonda dasturlash asoslari",
    provider: "Ochiq Kurs",
    cat: "digital_safety",
    lang: "uz",
    kind: "freeCourse",
  },
  {
    href: "https://ochiqkurs.uz/malaka/htmlda-dasturlash/",
    title: "HTMLda dasturlash",
    provider: "Ochiq Kurs",
    cat: "digital_safety",
    lang: "uz",
    kind: "freeCourse",
  },
  {
    href: "https://ochiqkurs.uz/malaka/css-asoslari/",
    title: "CSS asoslari",
    provider: "Ochiq Kurs",
    cat: "digital_safety",
    lang: "uz",
    kind: "freeCourse",
  },
  {
    href: "https://ochiqkurs.uz/malaka/javascript-darslari/",
    title: "JavaScript darslari",
    provider: "Ochiq Kurs",
    cat: "digital_safety",
    lang: "uz",
    kind: "freeCourse",
  },
  {
    href: "https://ochiqkurs.uz/malaka/django-asoslari/",
    title: "Django asoslari",
    provider: "Ochiq Kurs",
    cat: "digital_safety",
    lang: "uz",
    kind: "freeCourse",
  },
  {
    href: "https://ochiqkurs.uz/malaka/postgresql-darslari-pgadminda/",
    title: "PostgreSQL darslari (pgAdminda)",
    provider: "Ochiq Kurs",
    cat: "digital_safety",
    lang: "uz",
    kind: "freeCourse",
  },
  {
    href: "https://ochiqkurs.uz/malaka/docker/",
    title: "Docker",
    provider: "Ochiq Kurs",
    cat: "digital_safety",
    lang: "uz",
    kind: "freeCourse",
  },
  {
    href: "https://ochiqkurs.uz/malaka/ai-agentlar-qurish-kursi/",
    title: "AI agentlar qurish kursi",
    provider: "Ochiq Kurs",
    cat: "digital_safety",
    lang: "uz",
    kind: "freeCourse",
  },

  // --- Деньги и язык: то, что сделано для жителей Узбекистана ---
  {
    href: "https://direktor.uz/uz/learn",
    title: "Kichik biznes uchun moliyaviy savodxonlik",
    provider: "Direktor.uz · NORMA, Savdo-sanoat palatasi, IFC",
    cat: "financial_literacy",
    lang: "uz",
    length: "pc.len.11lessons",
    kind: "freeCourse",
  },
  {
    href: "https://migrant.spbu.ru/uzb",
    title: "Rus tili: 64 ta darsda",
    provider: "Sankt-Peterburg davlat universiteti",
    cat: "international",
    lang: "uz",
    length: "pc.len.64lessons",
    kind: "freeCourse",
  },

  // --- Профессия и занятость ---
  {
    href: "https://www.coursera.org/professional-certificates/google-data-analytics",
    title: "Google Data Analytics",
    provider: "Google",
    cat: "vocational_skills",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.6m",
    kind: "certificate",
  },
  {
    href: "https://www.coursera.org/learn/careerdevelopment",
    title: "English for Career Development",
    provider: "University of Pennsylvania",
    cat: "vocational_skills",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.4w",
    kind: "course",
  },
  {
    href: "https://www.coursera.org/career-academy/roles/digital-marketing-specialist",
    title: "Digital Marketing Specialist",
    provider: "Coursera Career Academy",
    cat: "vocational_skills",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.path",
    kind: "collection",
  },

  // --- Деньги ---
  {
    href: "https://www.coursera.org/learn/financial-markets-global",
    title: "Financial Markets",
    provider: "Yale University · Robert Shiller",
    cat: "financial_literacy",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.3w",
    kind: "course",
  },
  {
    href: "https://www.coursera.org/learn/financial-planning",
    title: "Financial Planning for Young Adults",
    provider: "University of Illinois",
    cat: "financial_literacy",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.2w",
    kind: "course",
  },
  {
    href: "https://www.khanacademy.org/college-careers-more/personal-finance",
    title: "Personal Finance",
    provider: "Khan Academy",
    cat: "financial_literacy",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.own",
    kind: "free",
  },

  // --- Дело и цифровая сфера ---
  {
    href: "https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce",
    title: "Google Digital Marketing & E-commerce",
    provider: "Google",
    cat: "entrepreneurship",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.6m",
    kind: "certificate",
  },
  {
    href: "https://www.coursera.org/learn/foundations-of-digital-marketing-and-e-commerce",
    title: "Foundations of Digital Marketing and E-commerce",
    provider: "Google",
    cat: "entrepreneurship",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.1w",
    kind: "course",
  },
  {
    href: "https://www.coursera.org/professional-certificates/ibm-ui-ux-designer",
    title: "IBM UI/UX Designer",
    provider: "IBM",
    cat: "digital_safety",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.4m",
    kind: "certificate",
  },
  {
    href: "https://www.coursera.org/learn/introduction-cybersecurity-cyber-attacks",
    title: "Introduction to Cybersecurity Tools & Cyberattacks",
    provider: "IBM",
    cat: "digital_safety",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.1w",
    kind: "course",
  },

  // --- Здоровье и семья ---
  {
    href: "https://www.coursera.org/learn/the-science-of-well-being",
    title: "The Science of Well-Being",
    provider: "Yale University · Laurie Santos",
    cat: "health",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.1w",
    kind: "course",
  },
  {
    href: "https://www.coursera.org/learn/childnutrition",
    title: "Child Nutrition and Cooking",
    provider: "Stanford Online",
    cat: "health",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.1w",
    kind: "course",
  },
  {
    href: "https://www.coursera.org/learn/everyday-parenting",
    title: "Everyday Parenting: The ABCs of Child Rearing",
    provider: "Yale University",
    cat: "parenting",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.2w",
    kind: "course",
  },

  // --- Лидерство ---
  {
    href: "https://www.coursera.org/learn/negotiation-skills",
    title: "Successful Negotiation: Essential Strategies and Skills",
    provider: "University of Michigan",
    cat: "leadership",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.2w",
    kind: "course",
  },
  {
    href: "https://www.coursera.org/learn/motivate-people-teams",
    title: "Inspiring and Motivating Individuals",
    provider: "University of Michigan",
    cat: "leadership",
    lang: "en",
    level: "pc.beginner",
    length: "pc.len.2w",
    kind: "course",
  },
];


const KIND: Record<Course["kind"], MessageKey> = {
  certificate: "pc.kind.certificate",
  course: "pc.kind.course",
  collection: "pc.kind.collection",
  free: "pc.kind.free",
  freeCourse: "pc.kind.freeCourse",
};

const LANGUAGE: Record<Course["lang"], MessageKey> = {
  uz: "pc.lang.uz",
  ru: "pc.lang.ru",
  en: "pc.lang.en",
};

/** Whose site it is, read off the address rather than typed twice. */
function host(href: string) {
  return new URL(href).host.replace(/^www\./, "");
}

/** Языки, которые реально есть в списке, плюс «все». */
const LANG_FILTERS: ReadonlyArray<{ key: "all" | Course["lang"]; label: MessageKey }> = [
  { key: "all", label: "common.all" },
  { key: "uz", label: "pc.f.uz" },
  { key: "ru", label: "pc.f.ru" },
  { key: "en", label: "pc.f.en" },
];

export function PartnerCourses() {
  const { t } = useI18n();
  const [lang, setLang] = useState<"all" | Course["lang"]>("all");
  const shown = useMemo(
    () => (lang === "all" ? COURSES : COURSES.filter((course) => course.lang === lang)),
    [lang],
  );

  return (
    <section className="section partner-section">
      <div className="sec-head sec-head-counted">
        <h2>{t("pc.title")}</h2>
        <p>{t("pc.lead")}</p>
        <span className="sec-count" aria-hidden="true">
          ({COURSES.length})
        </span>
      </div>

      <div className="partner-langs" role="group" aria-label={t("pc.langFilter")}>
        {LANG_FILTERS.map((option) => {
          const count = option.key === "all"
            ? COURSES.length
            : COURSES.filter((course) => course.lang === option.key).length;
          if (!count) return null;
          return (
            <button
              key={option.key}
              type="button"
              className={lang === option.key ? "chip chip-on" : "chip"}
              aria-pressed={lang === option.key}
              onClick={() => setLang(option.key)}
            >
              {t(option.label)}
              <span className="chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="partner-grid">
        {shown.map((course) => (
          <a
            key={course.href}
            className="partner-card"
            data-cat={course.cat}
            href={course.href}
            target="_blank"
            rel="noopener noreferrer"
            /* Said out loud, because the visible arrow is only visible. */
            aria-label={`${course.title} — ${course.provider}. ${t("pc.opens")} ${host(course.href)}`}
          >
            <span className="partner-provider">{course.provider}</span>
            <h3 className="partner-title">{course.title}</h3>
            <span className="partner-meta">
              {[course.level, course.length].filter(Boolean).map((key) => t(key!) + " · ")}
              {t(KIND[course.kind])}
            </span>
            <span className="partner-foot">
              <span className="partner-lang">{t(LANGUAGE[course.lang])}</span>
              <span className="partner-host">
                {host(course.href)}
                <span aria-hidden="true"> ↗</span>
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
