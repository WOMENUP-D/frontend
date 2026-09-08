/**
 * Mock dataset for the learning platform (`/talim`).
 *
 * Shaped exactly like the API content the rest of the portal renders: every
 * human-readable string is an `{uz, ru, en}` field read through `tx()`, never a
 * bare string. That is not ceremony — it is what lets the whole section be
 * swapped onto real endpoints later without touching a single component, and it
 * keeps the "no hardcoded UI strings" rule intact while the data is synthetic.
 *
 * Progress is always DERIVED from lessons (see `courseProgress`) rather than
 * stored. A card that says "72%" beside "12 of 16 lessons" invites the question
 * why it is not 75, and there is no good answer; one source of truth removes it.
 */

/** A translatable content string. Assignable to `I18nField`, so `tx()` reads it. */
export type Text = { uz: string; ru: string; en: string };

export type LessonKind = "video" | "reading" | "practice" | "quiz" | "project";

export interface Resource {
  title: Text;
  /** What the learner is about to open, so a click is never a surprise. */
  kind: "pdf" | "link" | "code";
  href: string;
}

/** One block of lesson content. Kept as data so the lesson page stays a renderer. */
export type LessonBlock =
  | { type: "paragraph"; text: Text }
  | { type: "heading"; text: Text }
  | { type: "list"; items: Text[] }
  | { type: "code"; language: string; code: string }
  | { type: "callout"; text: Text }
  | { type: "figure"; caption: Text; tone: CoverTone; emblem: string };

export interface Lesson {
  slug: string;
  title: Text;
  kind: LessonKind;
  minutes: number;
  completed: boolean;
  blocks?: LessonBlock[];
  resources?: Resource[];
}

export interface Module {
  title: Text;
  lessons: Lesson[];
}

/** Reuses the news feed's cover vocabulary so one palette covers the portal. */
export type CoverTone = "plum" | "rose" | "sage" | "sand" | "sky" | "ink";

export type CourseLevel = "beginner" | "intermediate" | "advanced";

export interface Course {
  slug: string;
  title: Text;
  /** One line on the card. Says what she will be able to do, not what it covers. */
  summary: Text;
  instructor: Text;
  instructorRole: Text;
  level: CourseLevel;
  weeks: number;
  rating: number;
  learners: number;
  tone: CoverTone;
  emblem: string;
  modules: Module[];
  /** Set when she has opened it at least once — drives "Continue learning". */
  lastOpenedAt?: string;
  certificate?: boolean;
}

export type EventKind = "class" | "assignment" | "exam" | "deadline";
export type EventStatus = "upcoming" | "due_soon" | "completed";

export interface CalendarEvent {
  id: string;
  title: Text;
  courseSlug: string;
  kind: EventKind;
  status: EventStatus;
  /** ISO date, local. Times are separate so an all-day deadline can omit one. */
  date: string;
  time?: string;
}

export interface Achievement {
  id: string;
  title: Text;
  description: Text;
  emblem: string;
  earnedOn?: string;
}

export interface Goal {
  id: string;
  title: Text;
  why: Text;
  targetDate: string;
  percent: number;
  steps: { title: Text; done: boolean }[];
}

export interface Recommendation {
  courseSlug: string;
  /** The AI's stated reason. Shown verbatim — an unexplained suggestion is noise. */
  reason: Text;
}

export interface Notification {
  id: string;
  title: Text;
  body: Text;
  at: Text;
  unread: boolean;
}

/* ------------------------------------------------------------------ */
/* The learner                                                         */
/* ------------------------------------------------------------------ */

export const learner = {
  name: "Durdona",
  fullName: "Durdona Mirmaxmudova",
  initials: "DM",
  /** ISO. The age on the card is derived from it, never stored beside it —
   *  two copies of the same fact drift the moment one has a birthday. */
  birthDate: "2003-04-12",
  joinedAt: "2026-08-19",
  role: { uz: "Talaba", ru: "Студентка", en: "Student" } as Text,
  region: { uz: "Toshkent shahri", ru: "Город Ташкент", en: "Tashkent city" } as Text,
  education: {
    uz: "TATU, Axborot texnologiyalari — 3-kurs",
    ru: "ТУИТ, Информационные технологии — 3 курс",
    en: "TUIT, Information Technology — 3rd year",
  } as Text,
  level: { uz: "Oʻrta daraja", ru: "Средний уровень", en: "Intermediate" } as Text,
  streakDays: 12,
  longestStreakDays: 21,
  learningHours: 48,
  weeklyTargetHours: 8,
  weeklyDoneHours: 6,
  interests: [
    { uz: "Veb-dasturlash", ru: "Веб-разработка", en: "Web development" },
    { uz: "Sunʼiy intellekt", ru: "Искусственный интеллект", en: "Artificial intelligence" },
    { uz: "Mahsulot dizayni", ru: "Продуктовый дизайн", en: "Product design" },
  ] as Text[],
  skills: ["HTML", "CSS", "JavaScript", "React", "Git", "Figma", "SQL"],
};

/* ------------------------------------------------------------------ */
/* Courses                                                             */
/* ------------------------------------------------------------------ */

const flexboxLesson: Lesson = {
  slug: "css-flexbox",
  title: { uz: "CSS Flexbox", ru: "CSS Flexbox", en: "CSS Flexbox" },
  kind: "reading",
  minutes: 18,
  completed: false,
  blocks: [
    {
      type: "paragraph",
      text: {
        uz: "Flexbox — elementlarni bitta oʻq boʻylab joylashtirish uchun moʻljallangan tartib modeli. Konteynerga `display: flex` bersangiz, uning bevosita bolalari moslashuvchan elementlarga aylanadi va qolgan boʻsh joyni oʻzaro taqsimlaydi.",
        ru: "Flexbox — модель раскладки для распределения элементов вдоль одной оси. Как только контейнер получает `display: flex`, его прямые потомки становятся гибкими элементами и делят между собой свободное место.",
        en: "Flexbox is a layout model for arranging elements along a single axis. The moment a container gets `display: flex`, its direct children become flex items and share the free space between them.",
      },
    },
    {
      type: "heading",
      text: {
        uz: "Ikkita oʻq",
        ru: "Две оси",
        en: "The two axes",
      },
    },
    {
      type: "paragraph",
      text: {
        uz: "Har bir flex konteynerda asosiy oʻq va unga koʻndalang oʻq bor. `justify-content` asosiy oʻq boʻylab, `align-items` esa koʻndalang oʻq boʻylab ishlaydi. Koʻpchilik xatolik shu ikkisini almashtirib yuborishdan kelib chiqadi.",
        ru: "У каждого flex-контейнера есть главная ось и поперечная. `justify-content` работает вдоль главной оси, `align-items` — вдоль поперечной. Большинство ошибок возникает именно из-за того, что их путают.",
        en: "Every flex container has a main axis and a cross axis. `justify-content` works along the main axis, `align-items` along the cross axis. Most mistakes come from swapping the two.",
      },
    },
    {
      type: "code",
      language: "css",
      code: `.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}`,
    },
    {
      type: "callout",
      text: {
        uz: "`gap` — flex uchun ham ishlaydi. Elementlarga margin berishdan koʻra shuni ishlating: oxirgi elementdan keyin ortiqcha boʻshliq qolmaydi.",
        ru: "`gap` работает и во flex. Используйте его вместо отступов у элементов: тогда после последнего не остаётся лишнего пространства.",
        en: "`gap` works in flex too. Prefer it to margins on the items: nothing is left dangling after the last one.",
      },
    },
    {
      type: "figure",
      caption: {
        uz: "Bitta qatorda: rasm chapda, matn oʻrtada, tugma oʻngda.",
        ru: "Одна строка: изображение слева, текст по центру, кнопка справа.",
        en: "One row: image left, text centred, button right.",
      },
      tone: "sage",
      emblem: "▤",
    },
    {
      type: "heading",
      text: { uz: "Qachon grid kerak", ru: "Когда нужен grid", en: "When to reach for grid" },
    },
    {
      type: "list",
      items: [
        {
          uz: "Bitta oʻq boʻylab joylashtirish — Flexbox.",
          ru: "Раскладка вдоль одной оси — Flexbox.",
          en: "Layout along one axis — Flexbox.",
        },
        {
          uz: "Satr va ustunlar birgalikda — CSS Grid.",
          ru: "Строки и столбцы одновременно — CSS Grid.",
          en: "Rows and columns together — CSS Grid.",
        },
        {
          uz: "Ikkalasini birga ishlatish mumkin va koʻpincha shunday qilinadi.",
          ru: "Их можно и нужно сочетать — так делают чаще всего.",
          en: "They combine, and in practice they usually do.",
        },
      ],
    },
  ],
  resources: [
    {
      title: {
        uz: "MDN — Flexbox asoslari",
        ru: "MDN — основы Flexbox",
        en: "MDN — Flexbox basics",
      },
      kind: "link",
      href: "https://developer.mozilla.org/docs/Web/CSS/CSS_flexible_box_layout",
    },
    {
      title: {
        uz: "Dars kodi (CodeSandbox)",
        ru: "Код урока (CodeSandbox)",
        en: "Lesson code (CodeSandbox)",
      },
      kind: "code",
      href: "https://codesandbox.io",
    },
  ],
};

export const courses: Course[] = [
  {
    slug: "frontend-development",
    title: {
      uz: "Frontend dasturlash",
      ru: "Frontend-разработка",
      en: "Frontend Development",
    },
    summary: {
      uz: "HTML, CSS va JavaScript’dan React’gacha — brauzerda ishlaydigan interfeys yasashni oʻrganasiz.",
      ru: "От HTML, CSS и JavaScript до React — научитесь собирать интерфейсы, которые работают в браузере.",
      en: "From HTML, CSS and JavaScript to React — build interfaces that actually run in a browser.",
    },
    instructor: { uz: "Nilufar Qodirova", ru: "Нилуфар Кодирова", en: "Nilufar Qodirova" },
    instructorRole: {
      uz: "Frontend muhandisi, Uzum",
      ru: "Frontend-инженер, Uzum",
      en: "Frontend engineer, Uzum",
    },
    level: "beginner",
    weeks: 10,
    rating: 4.8,
    learners: 3120,
    tone: "rose",
    emblem: "◧",
    lastOpenedAt: "2026-09-02",
    modules: [
      {
        title: { uz: "Kirish", ru: "Введение", en: "Introduction" },
        lessons: [
          {
            slug: "how-the-web-works",
            title: {
              uz: "Veb qanday ishlaydi",
              ru: "Как работает веб",
              en: "How the web works",
            },
            kind: "video",
            minutes: 12,
            completed: true,
          },
          {
            slug: "tooling",
            title: {
              uz: "Muharrir va brauzer vositalari",
              ru: "Редактор и инструменты браузера",
              en: "Editor and browser tools",
            },
            kind: "video",
            minutes: 14,
            completed: true,
          },
        ],
      },
      {
        title: { uz: "HTML asoslari", ru: "Основы HTML", en: "HTML basics" },
        lessons: [
          {
            slug: "semantic-html",
            title: { uz: "Semantik HTML", ru: "Семантический HTML", en: "Semantic HTML" },
            kind: "reading",
            minutes: 16,
            completed: true,
          },
          {
            slug: "forms",
            title: { uz: "Formalar", ru: "Формы", en: "Forms" },
            kind: "practice",
            minutes: 25,
            completed: true,
          },
          {
            slug: "accessibility",
            title: { uz: "Qulaylik (a11y)", ru: "Доступность (a11y)", en: "Accessibility (a11y)" },
            kind: "reading",
            minutes: 20,
            completed: true,
          },
        ],
      },
      {
        title: { uz: "CSS", ru: "CSS", en: "CSS" },
        lessons: [
          {
            slug: "selectors",
            title: { uz: "Selektorlar va kaskad", ru: "Селекторы и каскад", en: "Selectors and the cascade" },
            kind: "reading",
            minutes: 18,
            completed: true,
          },
          {
            slug: "box-model",
            title: { uz: "Box model", ru: "Блочная модель", en: "The box model" },
            kind: "reading",
            minutes: 15,
            completed: true,
          },
          flexboxLesson,
          {
            slug: "css-grid",
            title: { uz: "CSS Grid", ru: "CSS Grid", en: "CSS Grid" },
            kind: "practice",
            minutes: 30,
            completed: false,
          },
          {
            slug: "responsive",
            title: { uz: "Moslashuvchan dizayn", ru: "Адаптивная вёрстка", en: "Responsive design" },
            kind: "practice",
            minutes: 28,
            completed: false,
          },
        ],
      },
      {
        title: { uz: "JavaScript", ru: "JavaScript", en: "JavaScript" },
        lessons: [
          {
            slug: "variables",
            title: { uz: "Oʻzgaruvchilar va tiplar", ru: "Переменные и типы", en: "Variables and types" },
            kind: "reading",
            minutes: 16,
            completed: true,
          },
          {
            slug: "functions",
            title: { uz: "Funksiyalar", ru: "Функции", en: "Functions" },
            kind: "practice",
            minutes: 24,
            completed: true,
          },
          {
            slug: "dom",
            title: { uz: "DOM bilan ishlash", ru: "Работа с DOM", en: "Working with the DOM" },
            kind: "practice",
            minutes: 26,
            completed: true,
          },
          {
            slug: "fetch",
            title: { uz: "Serverdan maʼlumot olish", ru: "Запросы к серверу", en: "Fetching data" },
            kind: "practice",
            minutes: 22,
            completed: true,
          },
        ],
      },
      {
        title: { uz: "React", ru: "React", en: "React" },
        lessons: [
          {
            slug: "react-components",
            title: { uz: "React komponentlari", ru: "Компоненты React", en: "React components" },
            kind: "video",
            minutes: 20,
            completed: false,
          },
          {
            slug: "react-state",
            title: { uz: "Holat va effektlar", ru: "Состояние и эффекты", en: "State and effects" },
            kind: "practice",
            minutes: 32,
            completed: false,
          },
        ],
      },
    ],
  },
  {
    slug: "java-backend",
    title: {
      uz: "Java’da backend",
      ru: "Backend на Java",
      en: "Backend with Java",
    },
    summary: {
      uz: "Spring Boot’da REST API yozish, maʼlumotlar bazasi bilan ishlash va xizmatni ishga tushirish.",
      ru: "Пишем REST API на Spring Boot, работаем с базой данных и выкатываем сервис.",
      en: "Write a REST API with Spring Boot, work with a database, and ship the service.",
    },
    instructor: { uz: "Sardor Aliyev", ru: "Сардор Алиев", en: "Sardor Aliyev" },
    instructorRole: {
      uz: "Backend muhandisi, Payme",
      ru: "Backend-инженер, Payme",
      en: "Backend engineer, Payme",
    },
    level: "intermediate",
    weeks: 8,
    rating: 4.9,
    learners: 2400,
    tone: "ink",
    emblem: "◈",
    lastOpenedAt: "2026-08-30",
    modules: [
      {
        title: { uz: "Java asoslari", ru: "Основы Java", en: "Java fundamentals" },
        lessons: [
          {
            slug: "syntax",
            title: { uz: "Sintaksis va tiplar", ru: "Синтаксис и типы", en: "Syntax and types" },
            kind: "reading",
            minutes: 22,
            completed: true,
          },
          {
            slug: "oop",
            title: { uz: "Obyektga yoʻnaltirilgan yondashuv", ru: "Объектный подход", en: "Object-oriented design" },
            kind: "reading",
            minutes: 26,
            completed: true,
          },
          {
            slug: "collections",
            title: { uz: "Kolleksiyalar", ru: "Коллекции", en: "Collections" },
            kind: "practice",
            minutes: 30,
            completed: true,
          },
        ],
      },
      {
        title: { uz: "Spring Boot", ru: "Spring Boot", en: "Spring Boot" },
        lessons: [
          {
            slug: "first-service",
            title: { uz: "Birinchi xizmat", ru: "Первый сервис", en: "Your first service" },
            kind: "video",
            minutes: 18,
            completed: true,
          },
          {
            slug: "rest-controllers",
            title: { uz: "REST kontrollerlar", ru: "REST-контроллеры", en: "REST controllers" },
            kind: "practice",
            minutes: 34,
            completed: true,
          },
          {
            slug: "validation",
            title: { uz: "Kiruvchi maʼlumotni tekshirish", ru: "Валидация входных данных", en: "Validating input" },
            kind: "practice",
            minutes: 24,
            completed: false,
          },
          {
            slug: "error-handling",
            title: { uz: "Xatolarni qayta ishlash", ru: "Обработка ошибок", en: "Error handling" },
            kind: "reading",
            minutes: 20,
            completed: false,
          },
        ],
      },
      {
        title: { uz: "Maʼlumotlar bazasi", ru: "База данных", en: "The database" },
        lessons: [
          {
            slug: "jdbc",
            title: { uz: "SQL va JDBC", ru: "SQL и JDBC", en: "SQL and JDBC" },
            kind: "reading",
            minutes: 26,
            completed: false,
          },
          {
            slug: "jpa",
            title: { uz: "JPA va migratsiyalar", ru: "JPA и миграции", en: "JPA and migrations" },
            kind: "practice",
            minutes: 36,
            completed: false,
          },
          {
            slug: "transactions",
            title: { uz: "Tranzaksiyalar", ru: "Транзакции", en: "Transactions" },
            kind: "reading",
            minutes: 22,
            completed: false,
          },
        ],
      },
      {
        title: { uz: "Yakuniy loyiha", ru: "Финальный проект", en: "Final project" },
        lessons: [
          {
            slug: "final-api",
            title: { uz: "Toʻliq API yozish", ru: "Собрать полноценный API", en: "Build a complete API" },
            kind: "project",
            minutes: 180,
            completed: false,
          },
          {
            slug: "deploy",
            title: { uz: "Serverga chiqarish", ru: "Выкатка на сервер", en: "Deploying" },
            kind: "practice",
            minutes: 40,
            completed: false,
          },
          {
            slug: "final-quiz",
            title: { uz: "Yakuniy test", ru: "Итоговый тест", en: "Final quiz" },
            kind: "quiz",
            minutes: 25,
            completed: false,
          },
        ],
      },
    ],
  },
  {
    slug: "python-for-beginners",
    title: {
      uz: "Boshlanuvchilar uchun Python",
      ru: "Python для начинающих",
      en: "Python for Beginners",
    },
    summary: {
      uz: "Birinchi dasturingizdan avtomatlashtirilgan kundalik vazifalargacha.",
      ru: "От первой программы до автоматизации ежедневных задач.",
      en: "From your first program to automating everyday work.",
    },
    instructor: { uz: "Kamola Rasulova", ru: "Камола Расулова", en: "Kamola Rasulova" },
    instructorRole: {
      uz: "Maʼlumot muhandisi, EPAM",
      ru: "Дата-инженер, EPAM",
      en: "Data engineer, EPAM",
    },
    level: "beginner",
    weeks: 6,
    rating: 4.7,
    learners: 5840,
    tone: "sage",
    emblem: "◇",
    lastOpenedAt: "2026-07-14",
    certificate: true,
    modules: [
      {
        title: { uz: "Birinchi qadamlar", ru: "Первые шаги", en: "First steps" },
        lessons: [
          {
            slug: "hello",
            title: { uz: "Birinchi dastur", ru: "Первая программа", en: "Your first program" },
            kind: "video",
            minutes: 10,
            completed: true,
          },
          {
            slug: "types",
            title: { uz: "Tiplar va oʻzgaruvchilar", ru: "Типы и переменные", en: "Types and variables" },
            kind: "reading",
            minutes: 15,
            completed: true,
          },
          {
            slug: "conditions",
            title: { uz: "Shartlar", ru: "Условия", en: "Conditions" },
            kind: "practice",
            minutes: 18,
            completed: true,
          },
        ],
      },
      {
        title: { uz: "Maʼlumot tuzilmalari", ru: "Структуры данных", en: "Data structures" },
        lessons: [
          {
            slug: "lists",
            title: { uz: "Roʻyxatlar", ru: "Списки", en: "Lists" },
            kind: "practice",
            minutes: 20,
            completed: true,
          },
          {
            slug: "dicts",
            title: { uz: "Lugʻatlar", ru: "Словари", en: "Dictionaries" },
            kind: "practice",
            minutes: 22,
            completed: true,
          },
          {
            slug: "files",
            title: { uz: "Fayllar bilan ishlash", ru: "Работа с файлами", en: "Working with files" },
            kind: "practice",
            minutes: 24,
            completed: true,
          },
        ],
      },
      {
        title: { uz: "Amaliyot", ru: "Практика", en: "Practice" },
        lessons: [
          {
            slug: "automation",
            title: { uz: "Kundalik vazifani avtomatlashtirish", ru: "Автоматизация рутины", en: "Automating a routine task" },
            kind: "project",
            minutes: 90,
            completed: true,
          },
          {
            slug: "python-quiz",
            title: { uz: "Yakuniy test", ru: "Итоговый тест", en: "Final quiz" },
            kind: "quiz",
            minutes: 20,
            completed: true,
          },
        ],
      },
    ],
  },
  {
    slug: "ui-ux-design",
    title: { uz: "UI/UX dizayn", ru: "UI/UX-дизайн", en: "UI/UX Design" },
    summary: {
      uz: "Foydalanuvchini tushunishdan tayyor interfeys maketigacha.",
      ru: "От понимания пользователя до готового макета интерфейса.",
      en: "From understanding the user to a finished interface.",
    },
    instructor: { uz: "Malika Yusupova", ru: "Малика Юсупова", en: "Malika Yusupova" },
    instructorRole: {
      uz: "Mahsulot dizayneri, Click",
      ru: "Продуктовый дизайнер, Click",
      en: "Product designer, Click",
    },
    level: "beginner",
    weeks: 7,
    rating: 4.8,
    learners: 1960,
    tone: "sand",
    emblem: "◐",
    modules: [
      {
        title: { uz: "Tadqiqot", ru: "Исследование", en: "Research" },
        lessons: [
          {
            slug: "interviews",
            title: { uz: "Foydalanuvchi bilan suhbat", ru: "Интервью с пользователем", en: "User interviews" },
            kind: "video",
            minutes: 18,
            completed: false,
          },
          {
            slug: "personas",
            title: { uz: "Personajlar va stsenariylar", ru: "Персоны и сценарии", en: "Personas and scenarios" },
            kind: "reading",
            minutes: 16,
            completed: false,
          },
        ],
      },
      {
        title: { uz: "Interfeys", ru: "Интерфейс", en: "Interface" },
        lessons: [
          {
            slug: "layout",
            title: { uz: "Tartib va ierarxiya", ru: "Композиция и иерархия", en: "Layout and hierarchy" },
            kind: "reading",
            minutes: 20,
            completed: false,
          },
          {
            slug: "typography",
            title: { uz: "Tipografika", ru: "Типографика", en: "Typography" },
            kind: "reading",
            minutes: 18,
            completed: false,
          },
          {
            slug: "design-system",
            title: { uz: "Dizayn tizimi", ru: "Дизайн-система", en: "Design system" },
            kind: "practice",
            minutes: 34,
            completed: false,
          },
        ],
      },
      {
        title: { uz: "Portfolio", ru: "Портфолио", en: "Portfolio" },
        lessons: [
          {
            slug: "case-study",
            title: { uz: "Keys yozish", ru: "Оформить кейс", en: "Write a case study" },
            kind: "project",
            minutes: 120,
            completed: false,
          },
        ],
      },
    ],
  },
  {
    slug: "data-analytics",
    title: { uz: "Maʼlumotlar tahlili", ru: "Аналитика данных", en: "Data Analytics" },
    summary: {
      uz: "SQL, jadvallar va vizualizatsiya — raqamlardan qaror chiqarish.",
      ru: "SQL, таблицы и визуализация — как превратить цифры в решение.",
      en: "SQL, spreadsheets and charts — turning numbers into a decision.",
    },
    instructor: { uz: "Zilola Ismoilova", ru: "Зилола Исмоилова", en: "Zilola Ismoilova" },
    instructorRole: {
      uz: "Tahlilchi, Korzinka",
      ru: "Аналитик, Korzinka",
      en: "Analyst, Korzinka",
    },
    level: "intermediate",
    weeks: 9,
    rating: 4.6,
    learners: 1480,
    tone: "sky",
    emblem: "◱",
    modules: [
      {
        title: { uz: "SQL", ru: "SQL", en: "SQL" },
        lessons: [
          {
            slug: "select",
            title: { uz: "Soʻrovlar asoslari", ru: "Основы запросов", en: "Query basics" },
            kind: "practice",
            minutes: 24,
            completed: false,
          },
          {
            slug: "joins",
            title: { uz: "Jadvallarni birlashtirish", ru: "Соединение таблиц", en: "Joining tables" },
            kind: "practice",
            minutes: 30,
            completed: false,
          },
        ],
      },
      {
        title: { uz: "Vizualizatsiya", ru: "Визуализация", en: "Visualisation" },
        lessons: [
          {
            slug: "charts",
            title: { uz: "Toʻgʻri diagrammani tanlash", ru: "Выбор правильного графика", en: "Choosing the right chart" },
            kind: "reading",
            minutes: 20,
            completed: false,
          },
          {
            slug: "dashboards",
            title: { uz: "Boshqaruv paneli", ru: "Дашборд", en: "Dashboards" },
            kind: "project",
            minutes: 75,
            completed: false,
          },
        ],
      },
    ],
  },
  {
    slug: "product-management",
    title: { uz: "Mahsulot menejmenti", ru: "Продуктовый менеджмент", en: "Product Management" },
    summary: {
      uz: "Gipotezadan ishga tushirishgacha: nimani va nima uchun qilish kerakligini aniqlash.",
      ru: "От гипотезы до запуска: как понять, что делать и зачем.",
      en: "From hypothesis to launch: deciding what to build and why.",
    },
    instructor: { uz: "Shahnoza Karimova", ru: "Шахноза Каримова", en: "Shahnoza Karimova" },
    instructorRole: {
      uz: "Mahsulot menejeri, Uzum Market",
      ru: "Продакт-менеджер, Uzum Market",
      en: "Product manager, Uzum Market",
    },
    level: "advanced",
    weeks: 8,
    rating: 4.7,
    learners: 890,
    tone: "plum",
    emblem: "◆",
    modules: [
      {
        title: { uz: "Muammoni topish", ru: "Поиск проблемы", en: "Finding the problem" },
        lessons: [
          {
            slug: "discovery",
            title: { uz: "Discovery", ru: "Discovery", en: "Discovery" },
            kind: "video",
            minutes: 22,
            completed: false,
          },
          {
            slug: "metrics",
            title: { uz: "Metrikalar", ru: "Метрики", en: "Metrics" },
            kind: "reading",
            minutes: 24,
            completed: false,
          },
        ],
      },
      {
        title: { uz: "Ishga tushirish", ru: "Запуск", en: "Launch" },
        lessons: [
          {
            slug: "roadmap",
            title: { uz: "Yoʻl xaritasi", ru: "Дорожная карта", en: "Roadmap" },
            kind: "practice",
            minutes: 28,
            completed: false,
          },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Derived helpers — the single source of truth for progress            */
/* ------------------------------------------------------------------ */

export function courseLessons(course: Course): Lesson[] {
  return course.modules.flatMap((module) => module.lessons);
}

export function courseProgress(course: Course): {
  total: number;
  done: number;
  percent: number;
  minutesLeft: number;
} {
  const lessons = courseLessons(course);
  const done = lessons.filter((lesson) => lesson.completed).length;
  const minutesLeft = lessons
    .filter((lesson) => !lesson.completed)
    .reduce((sum, lesson) => sum + lesson.minutes, 0);
  return {
    total: lessons.length,
    done,
    percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
    minutesLeft,
  };
}

export type CourseStatus = "not_started" | "in_progress" | "completed";

export function courseStatus(course: Course): CourseStatus {
  const { done, total } = courseProgress(course);
  if (done === 0) return "not_started";
  return done === total ? "completed" : "in_progress";
}

/** The next lesson she has not finished — where "Continue" actually goes. */
export function nextLesson(course: Course): Lesson | undefined {
  return courseLessons(course).find((lesson) => !lesson.completed);
}

export function findCourse(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug);
}

export function findLesson(
  course: Course,
  slug: string,
): { lesson: Lesson; index: number; all: Lesson[] } | undefined {
  const all = courseLessons(course);
  const index = all.findIndex((lesson) => lesson.slug === slug);
  return index === -1 ? undefined : { lesson: all[index], index, all };
}

/** Most recently opened course that still has something left in it. */
export function continueCourse(): Course | undefined {
  return courses
    .filter((course) => course.lastOpenedAt && courseStatus(course) === "in_progress")
    .sort((a, b) => (a.lastOpenedAt! < b.lastOpenedAt! ? 1 : -1))[0];
}

export function enrolledCourses(): Course[] {
  return courses.filter((course) => courseStatus(course) !== "not_started");
}

export const learningStats = {
  get completed() {
    return courses.filter((course) => courseStatus(course) === "completed").length;
  },
  get inProgress() {
    return courses.filter((course) => courseStatus(course) === "in_progress").length;
  },
  hours: learner.learningHours,
  streak: learner.streakDays,
};

/* ------------------------------------------------------------------ */
/* Calendar, goals, achievements, recommendations, notifications        */
/* ------------------------------------------------------------------ */

export const events: CalendarEvent[] = [
  {
    id: "e1",
    title: { uz: "Java bo‘yicha topshiriq", ru: "Задание по Java", en: "Java assignment" },
    courseSlug: "java-backend",
    kind: "assignment",
    status: "due_soon",
    date: "2026-09-05",
    time: "18:00",
  },
  {
    id: "e2",
    title: { uz: "Frontend bo‘yicha test", ru: "Тест по frontend", en: "Frontend quiz" },
    courseSlug: "frontend-development",
    kind: "exam",
    status: "upcoming",
    date: "2026-09-07",
    time: "12:00",
  },
  {
    id: "e3",
    title: { uz: "Loyiha muddati", ru: "Дедлайн проекта", en: "Project deadline" },
    courseSlug: "java-backend",
    kind: "deadline",
    status: "upcoming",
    date: "2026-09-10",
  },
  {
    id: "e4",
    title: { uz: "React bo‘yicha jonli dars", ru: "Живое занятие по React", en: "Live class on React" },
    courseSlug: "frontend-development",
    kind: "class",
    status: "upcoming",
    date: "2026-09-12",
    time: "19:00",
  },
  {
    id: "e5",
    title: { uz: "Dizayn keysini topshirish", ru: "Сдача дизайн-кейса", en: "Design case hand-in" },
    courseSlug: "ui-ux-design",
    kind: "assignment",
    status: "upcoming",
    date: "2026-09-16",
    time: "20:00",
  },
  {
    id: "e6",
    title: { uz: "CSS bo‘yicha topshiriq", ru: "Задание по CSS", en: "CSS assignment" },
    courseSlug: "frontend-development",
    kind: "assignment",
    status: "completed",
    date: "2026-08-28",
    time: "18:00",
  },
  {
    id: "e7",
    title: { uz: "SQL amaliyoti", ru: "Практика по SQL", en: "SQL practice" },
    courseSlug: "data-analytics",
    kind: "class",
    status: "completed",
    date: "2026-08-25",
    time: "17:00",
  },
];

export const goals: Goal[] = [
  {
    id: "g1",
    title: {
      uz: "Backend dasturchi bo‘lish",
      ru: "Стать backend-разработчиком",
      en: "Become a backend developer",
    },
    why: {
      uz: "Java kursini tugatib, yakuniy loyihani portfolioga qo‘shish va birinchi ishga ariza berish.",
      ru: "Закончить курс по Java, добавить финальный проект в портфолио и подать первый отклик на вакансию.",
      en: "Finish the Java course, add the final project to a portfolio, and apply for a first role.",
    },
    targetDate: "2026-12-20",
    percent: 68,
    steps: [
      {
        title: { uz: "Java asoslarini tugatish", ru: "Закрыть основы Java", en: "Finish Java fundamentals" },
        done: true,
      },
      {
        title: { uz: "Spring Boot modulini tugatish", ru: "Закрыть модуль Spring Boot", en: "Finish the Spring Boot module" },
        done: false,
      },
      {
        title: { uz: "Yakuniy API loyihasini yozish", ru: "Собрать финальный API-проект", en: "Build the final API project" },
        done: false,
      },
      {
        title: { uz: "Rezyume va portfolioni yangilash", ru: "Обновить резюме и портфолио", en: "Refresh CV and portfolio" },
        done: false,
      },
    ],
  },
  {
    id: "g2",
    title: {
      uz: "Har hafta 8 soat o‘qish",
      ru: "Учиться 8 часов в неделю",
      en: "Study eight hours a week",
    },
    why: {
      uz: "Muntazamlik tezlikdan muhimroq: haftasiga sakkiz soat kursni muddatida tugatishga yetadi.",
      ru: "Регулярность важнее скорости: восьми часов в неделю хватает, чтобы закончить курс в срок.",
      en: "Regularity beats speed: eight hours a week is enough to finish the course on time.",
    },
    targetDate: "2026-10-31",
    percent: 75,
    steps: [
      {
        title: { uz: "Kunlik 12 kunlik seriya", ru: "Серия из 12 дней", en: "A 12-day streak" },
        done: true,
      },
      {
        title: { uz: "Haftalik 8 soatga yetish", ru: "Выйти на 8 часов в неделю", en: "Reach eight hours a week" },
        done: false,
      },
    ],
  },
];

export const achievements: Achievement[] = [
  {
    id: "a1",
    title: { uz: "Birinchi kurs tugadi", ru: "Первый курс пройден", en: "First course completed" },
    description: {
      uz: "«Boshlanuvchilar uchun Python» to‘liq tugatildi.",
      ru: "Курс «Python для начинающих» пройден полностью.",
      en: "Python for Beginners, finished end to end.",
    },
    emblem: "🏆",
    earnedOn: "2026-07-14",
  },
  {
    id: "a2",
    title: { uz: "7 kunlik seriya", ru: "Серия 7 дней", en: "7-day streak" },
    description: {
      uz: "Bir hafta davomida har kuni dars o‘qildi.",
      ru: "Неделя занятий без единого пропуска.",
      en: "A full week of study without a gap.",
    },
    emblem: "🔥",
    earnedOn: "2026-08-19",
  },
  {
    id: "a3",
    title: { uz: "10 ta dars", ru: "10 уроков", en: "10 lessons completed" },
    description: {
      uz: "O‘nta dars tugatildi — boshlanish sanaladi.",
      ru: "Десять уроков позади — начало положено.",
      en: "Ten lessons done — the start is behind you.",
    },
    emblem: "📚",
    earnedOn: "2026-06-30",
  },
  {
    id: "a4",
    title: { uz: "Birinchi loyiha", ru: "Первый проект", en: "First project" },
    description: {
      uz: "Kundalik vazifani avtomatlashtiruvchi skript yozildi.",
      ru: "Написан скрипт, автоматизирующий рутинную задачу.",
      en: "A script that automates a routine task, written and shipped.",
    },
    emblem: "💻",
    earnedOn: "2026-07-08",
  },
  {
    id: "a5",
    title: { uz: "Maqsadga erishildi", ru: "Цель достигнута", en: "Goal achieved" },
    description: {
      uz: "Birinchi o‘quv maqsadi belgilangan muddatda yopildi.",
      ru: "Первая учебная цель закрыта в срок.",
      en: "A first learning goal, closed on time.",
    },
    emblem: "🎯",
  },
  {
    id: "a6",
    title: { uz: "30 kunlik seriya", ru: "Серия 30 дней", en: "30-day streak" },
    description: {
      uz: "Bir oy davomida har kuni o‘qish.",
      ru: "Месяц ежедневных занятий.",
      en: "A month of studying every day.",
    },
    emblem: "🌸",
  },
];

export const recommendations: Recommendation[] = [
  {
    courseSlug: "java-backend",
    reason: {
      uz: "Siz backend yo‘nalishiga qiziqqaningiz va Java modulining yarmini tugatganingiz uchun tavsiya qilinadi.",
      ru: "Рекомендуем, потому что вы интересуетесь backend-разработкой и уже прошли половину модуля по Java.",
      en: "Recommended because you are drawn to backend work and are already halfway through the Java module.",
    },
  },
  {
    courseSlug: "data-analytics",
    reason: {
      uz: "SQL Java’dagi ma’lumotlar bazasi moduliga yaqin — ikkalasi bir-birini mustahkamlaydi.",
      ru: "SQL примыкает к модулю баз данных в Java — эти два курса усиливают друг друга.",
      en: "SQL sits right next to the database module in Java — the two reinforce each other.",
    },
  },
  {
    courseSlug: "ui-ux-design",
    reason: {
      uz: "Frontend kursida interfeys tuzayapsiz; dizayn asoslari qaror qabul qilishni osonlashtiradi.",
      ru: "Вы собираете интерфейсы на курсе frontend; основы дизайна упростят принятие решений.",
      en: "You are building interfaces on the frontend course; design fundamentals make those calls easier.",
    },
  },
];

export const notifications: Notification[] = [
  {
    id: "n1",
    title: { uz: "Topshiriq muddati yaqin", ru: "Скоро дедлайн задания", en: "An assignment is due soon" },
    body: {
      uz: "«Java bo‘yicha topshiriq» — 5-sentyabr, 18:00.",
      ru: "«Задание по Java» — 5 сентября, 18:00.",
      en: "Java assignment — 5 September, 18:00.",
    },
    at: { uz: "2 soat oldin", ru: "2 часа назад", en: "2 hours ago" },
    unread: true,
  },
  {
    id: "n2",
    title: { uz: "Yangi dars ochildi", ru: "Открыт новый урок", en: "A new lesson is open" },
    body: {
      uz: "«React komponentlari» — Frontend dasturlash kursida.",
      ru: "«Компоненты React» — в курсе Frontend-разработка.",
      en: "React components — in Frontend Development.",
    },
    at: { uz: "Kecha", ru: "Вчера", en: "Yesterday" },
    unread: true,
  },
  {
    id: "n3",
    title: { uz: "Seriya 12 kunga yetdi", ru: "Серия достигла 12 дней", en: "Your streak reached 12 days" },
    body: {
      uz: "Yana ikki kun — va shaxsiy rekordga yaqinlashasiz.",
      ru: "Ещё два дня — и вы приблизитесь к личному рекорду.",
      en: "Two more days and you are closing on your own record.",
    },
    at: { uz: "3 kun oldin", ru: "3 дня назад", en: "3 days ago" },
    unread: false,
  },
];

/** Quick actions on the assistant card. Kept as data so the card stays dumb. */
export const assistantActions: { id: string; label: Text; prompt: Text }[] = [
  {
    id: "explain",
    label: { uz: "Mavzuni tushuntir", ru: "Объясни тему", en: "Explain this topic" },
    prompt: {
      uz: "CSS Flexbox’da asosiy va ko‘ndalang o‘q farqini oddiy misolda tushuntiring.",
      ru: "Объясните разницу между главной и поперечной осью в CSS Flexbox на простом примере.",
      en: "Explain the difference between the main and cross axis in CSS Flexbox with a simple example.",
    },
  },
  {
    id: "plan",
    label: { uz: "O‘quv reja tuz", ru: "Составь план обучения", en: "Create a study plan" },
    prompt: {
      uz: "Haftasiga 8 soat vaqtim bor. Java kursini dekabrgacha tugatish uchun reja tuzing.",
      ru: "У меня 8 часов в неделю. Составьте план, чтобы закончить курс по Java до декабря.",
      en: "I have eight hours a week. Build me a plan to finish the Java course by December.",
    },
  },
  {
    id: "check",
    label: { uz: "Topshiriqni tekshir", ru: "Проверь задание", en: "Check my assignment" },
    prompt: {
      uz: "REST kontroller uchun yozgan kodimni tekshiring va xatolarni ko‘rsating.",
      ru: "Проверьте мой код REST-контроллера и укажите на ошибки.",
      en: "Review my REST controller code and point out the mistakes.",
    },
  },
  {
    id: "recommend",
    label: { uz: "Kurs tavsiya qil", ru: "Порекомендуй курс", en: "Recommend a course" },
    prompt: {
      uz: "Java kursidan keyin nimani o‘rganganim ma’qul?",
      ru: "Что стоит изучать после курса по Java?",
      en: "What should I study after the Java course?",
    },
  },
];
