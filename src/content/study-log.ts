/**
 * A year of study, day by day.
 *
 * The rest of the learning section knows whether a lesson is finished but not
 * *when* it was finished — `Lesson.completed` is a boolean, and a boolean has
 * no history. The year view needs the history: it draws one square per day and
 * shades it by how much was done that day.
 *
 * So this module supplies that history the same way `content/learning.ts`
 * supplies everything else in the section — as a local dataset behind the
 * async boundary, ready to be swapped for the real endpoint when there is one.
 * Nothing here reaches the network.
 *
 * Two decisions worth keeping when the real data arrives:
 *
 * **The window ends today, and today is the last square.** Not a calendar
 * year: a year that runs January to December leaves the current month floating
 * in the middle of the grid and the last third of it empty. A rolling
 * fifty-two weeks plus the current partial week puts the most recent day where
 * the eye lands, at the end.
 *
 * **Days after today are not drawn.** An empty square means "studied nothing";
 * a day that has not happened yet means nothing at all, and giving the two the
 * same square would misreport the week the reader is standing in.
 */

import { learner, type Text } from "./learning";

export interface StudyEntry {
  /** Local time of day, as shown. */
  time: string;
  title: Text;
  course: Text;
  /** The direction's colour, from the catalogue's own set. */
  tone: string;
  minutes: number;
}

export interface StudyDay {
  /** `YYYY-MM-DD`, the same key shape the calendar page already uses. */
  key: string;
  date: Date;
  /** 0–4. Zero is a day with nothing on it; four is the busiest band. */
  level: number;
  entries: StudyEntry[];
  minutes: number;
}

export interface StudyYear {
  /** 53 columns of 7, oldest first. A cell is null where the day is in the
   *  future — the last column is partial by construction. */
  columns: (StudyDay | null)[][];
  /** The month label that belongs over each column, blank where the month
   *  did not change there. */
  monthAt: string[];
  today: StudyDay;
  totals: {
    lessons: number;
    activeDays: number;
    bestStreak: number;
    currentStreak: number;
    minutes: number;
  };
}

const DAY_MS = 86_400_000;
export const COLUMNS = 53;

const MONTHS_UZ = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

/**
 * The five bands, from an empty day to the busiest.
 *
 * One hue stepped in lightness, not five hues: the scale is a quantity, and a
 * reader has to be able to rank two squares at a glance. The top step is the
 * brand rose the rest of the portal already uses for its accent.
 */
export const LEVEL_TONES = ["#f0e9e7", "#e8c9d0", "#d09fac", "#b06f81", "#8e4a5c"];

/** What a day can hold, drawn from the catalogue this learner is enrolled in. */
const SOURCES: { course: Text; tone: string; titles: Text[] }[] = [
  {
    course: { uz: "Buxgalteriya asoslari", ru: "Основы бухгалтерии", en: "Accounting basics" },
    tone: "#8e4a5c",
    titles: [
      { uz: "Debet va kredit", ru: "Дебет и кредит", en: "Debit and credit" },
      { uz: "Birlamchi hujjatlar", ru: "Первичные документы", en: "Source documents" },
      { uz: "1C: birinchi kirish", ru: "1С: первый вход", en: "1C: first look" },
    ],
  },
  {
    course: { uz: "Oilaviy byudjetni rejalashtirish", ru: "Планирование семейного бюджета", en: "Family budgeting" },
    tone: "#4f6f63",
    titles: [
      { uz: "Xarajat jadvali", ru: "Таблица расходов", en: "The expense table" },
      { uz: "Zaxira jamgʻarma", ru: "Резервный фонд", en: "The emergency fund" },
      { uz: "Qarzni yopish tartibi", ru: "Порядок закрытия долгов", en: "Paying debt down" },
    ],
  },
  {
    course: { uz: "Ish uchun ingliz tili", ru: "Английский для работы", en: "English for work" },
    tone: "#8e4a5c",
    titles: [
      { uz: "Xat yozish qoliplari", ru: "Шаблоны деловых писем", en: "Email patterns" },
      { uz: "Qisqa uchrashuv", ru: "Короткая встреча", en: "The short meeting" },
      { uz: "Kasbiy lugʻat", ru: "Профессиональная лексика", en: "Professional vocabulary" },
    ],
  },
  {
    course: { uz: "Ayol rahbar: jamoa boshqaruvi", ru: "Женщина-руководитель", en: "Woman as a manager" },
    tone: "#6d5480",
    titles: [
      { uz: "Vazifa taqsimlash", ru: "Распределение задач", en: "Delegating work" },
      { uz: "Qiyin suhbat", ru: "Трудный разговор", en: "The hard conversation" },
      { uz: "Muddat qoʻyish", ru: "Постановка сроков", en: "Setting deadlines" },
    ],
  },
];

const TIMES = ["07:20", "13:05", "19:40", "21:15"];

/**
 * A stable pseudo-random value for a day.
 *
 * Deterministic on purpose: the same date must always draw the same shade, or
 * the graph reshuffles itself on every click and stops meaning anything. Keyed
 * on the day number since the epoch, so the picture also survives a reload and
 * shifts by exactly one column at midnight.
 */
function noise(seed: number): number {
  let x = (seed * 1_103_515_245 + 12_345) & 0x7fff_ffff;
  x ^= x >> 13;
  x = (x * 1_274_126_177) & 0x7fff_ffff;
  return (x >>> 8) / 0x7f_ffff;
}

function dayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isoKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * The last stretch of days is always active, and its length is the streak the
 * rest of the section already claims.
 *
 * `learner.streakDays` is shown on the dashboard and on the profile card. If
 * the graph disagreed with it — and a free-running generator will, most days —
 * the two screens would be telling the reader different things about the same
 * week. One fact, one source.
 */
function inStreak(daysBack: number): boolean {
  return daysBack < learner.streakDays;
}

function levelFor(serial: number, daysBack = -1): number {
  if (daysBack >= 0 && inStreak(daysBack)) {
    // Still varied in weight — a streak is unbroken, not identical.
    return 2 + Math.floor(noise(serial * 7 + 11) * 3);
  }
  // The day the streak starts from is empty by construction. Without it the
  // run simply continues into whatever the generator produced next, and the
  // graph reports a longer streak than the dashboard claims — which is the
  // disagreement this whole branch exists to prevent.
  if (daysBack === learner.streakDays) return 0;

  const weekday = ((serial % 7) + 7) % 7;
  // Sundays are quiet, which is what makes the grid look like a person's week
  // rather than an even wash.
  const rest = weekday === 6 ? 0.35 : 1;
  const value = noise(serial) * rest;
  if (value < 0.3) return 0;
  if (value < 0.46) return 1;
  if (value < 0.62) return 2;
  if (value < 0.8) return 3;
  return 4;
}

function buildDay(date: Date, daysBack = -1): StudyDay {
  const serial = Math.floor(date.getTime() / DAY_MS);
  const level = levelFor(serial, daysBack);

  const entries: StudyEntry[] = [];
  for (let i = 0; i < level; i += 1) {
    const source = SOURCES[Math.floor(noise(serial * 31 + i * 7) * SOURCES.length) % SOURCES.length];
    const title = source.titles[Math.floor(noise(serial * 17 + i * 3) * source.titles.length) % source.titles.length];
    entries.push({
      time: TIMES[i],
      title,
      course: source.course,
      tone: source.tone,
      minutes: 14 + Math.floor(noise(serial + i * 53) * 26),
    });
  }

  return {
    key: isoKey(date),
    date,
    level,
    entries,
    minutes: entries.reduce((sum, entry) => sum + entry.minutes, 0),
  };
}

/**
 * The rolling year ending on `anchor`.
 *
 * `anchor` is passed in rather than read here: the calendar page resolves the
 * client's own date after mount, and a module that called `new Date()` during
 * render would let the server and the browser disagree about which square is
 * today.
 */
export function studyYear(anchor: Date): StudyYear {
  const today = dayStart(anchor);
  // Monday-first, matching the weekday rail the rest of the section uses.
  const weekday = (today.getDay() + 6) % 7;
  const total = (COLUMNS - 1) * 7 + weekday + 1;
  const startMs = today.getTime() - (total - 1) * DAY_MS;

  const columns: (StudyDay | null)[][] = [];
  const monthAt: string[] = [];
  let previousMonth = -1;
  let todayDay: StudyDay | null = null;

  let lessons = 0;
  let activeDays = 0;
  let minutes = 0;
  let run = 0;
  let bestStreak = 0;

  for (let column = 0; column < COLUMNS; column += 1) {
    const cells: (StudyDay | null)[] = [];

    for (let row = 0; row < 7; row += 1) {
      const index = column * 7 + row;
      if (index >= total) {
        cells.push(null);
        continue;
      }

      const day = buildDay(new Date(startMs + index * DAY_MS), total - 1 - index);
      cells.push(day);

      if (day.level > 0) {
        lessons += day.level;
        activeDays += 1;
        minutes += day.minutes;
        run += 1;
        if (run > bestStreak) bestStreak = run;
      } else {
        run = 0;
      }

      if (index === total - 1) todayDay = day;
    }

    columns.push(cells);

    // The label goes over the column the month starts in. The last column is
    // skipped: a label there would sit half off the edge of the grid.
    const columnStart = new Date(startMs + column * 7 * DAY_MS);
    const month = columnStart.getMonth();
    if (month !== previousMonth && column < COLUMNS - 1) {
      monthAt.push(MONTHS_UZ[month]);
      previousMonth = month;
    } else {
      monthAt.push("");
    }
  }

  return {
    columns,
    monthAt,
    today: todayDay ?? buildDay(today, 0),
    totals: { lessons, activeDays, bestStreak, currentStreak: run, minutes },
  };
}
