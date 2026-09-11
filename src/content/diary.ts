/**
 * The study diary.
 *
 * The year graph says *that* she studied; the calendar says *when*. Neither
 * says what it felt like, and that is the thing a learner forgets first and
 * needs most three months later — the lesson that finally made sense, the one
 * she had to take twice, the week she nearly stopped.
 *
 * So these are written entries, not generated ones. A diary composed by a
 * random generator would be filler in the exact place the platform is asking
 * someone to be honest, and the whole section is worth nothing if the reader
 * cannot tell the difference. When real entries exist, this file goes away and
 * the shape stays.
 *
 * Each entry carries what went well and what did not, because a log of only
 * good days is not a record anybody recognises as their own.
 */

import { type Text } from "./learning";

export interface DiaryEntry {
  /** ISO date, local — the same key shape the calendar uses. */
  date: string;
  course: Text;
  /** The direction's colour, from the catalogue's set. */
  tone: string;
  /** What she was working on that day. */
  lesson: Text;
  minutes: number;
  /** What landed. */
  gained: Text;
  /** What did not — omitted on a day where nothing snagged. */
  hard?: Text;
}

/** Newest first: a diary is opened at the last page, not the first. */
export const diary: DiaryEntry[] = [
  {
    date: "2026-09-10",
    course: { uz: "Ayol rahbar: jamoa boshqaruvi", ru: "Женщина-руководитель", en: "Woman as a manager" },
    tone: "#6d5480",
    lesson: { uz: "Qiyin suhbat", ru: "Трудный разговор", en: "The hard conversation" },
    minutes: 34,
    gained: {
      uz: "Suhbatni ayblovdan emas, faktdan boshlash kerak ekan. «Siz kechikdingiz» emas — «hisobot payshanba kuni kerak edi, juma kuni keldi».",
      ru: "Начинать не с обвинения, а с факта. Не «вы опоздали», а «отчёт был нужен в четверг, пришёл в пятницу».",
      en: "Open with the fact, not the accusation: not “you were late” but “the report was due Thursday and came Friday”.",
    },
    hard: {
      uz: "Amaliyotda ovozim baribir titradi. Yana bir bor takrorlashim kerak.",
      ru: "На практике голос всё равно дрожал. Нужно проговорить ещё раз.",
      en: "My voice still shook in the practice run. I need to rehearse it again.",
    },
  },
  {
    date: "2026-09-08",
    course: { uz: "Buxgalteriya asoslari", ru: "Основы бухгалтерии", en: "Accounting basics" },
    tone: "#8e4a5c",
    lesson: { uz: "Debet va kredit", ru: "Дебет и кредит", en: "Debit and credit" },
    minutes: 52,
    gained: {
      uz: "Nihoyat tushundim: debet — pul qayerga ketdi, kredit — qayerdan keldi. Ikki hafta chalkashib yurgan edim.",
      ru: "Наконец поняла: дебет — куда ушли деньги, кредит — откуда пришли. Две недели путалась.",
      en: "It finally clicked: debit is where the money went, credit is where it came from. Two weeks of confusion gone.",
    },
  },
  {
    date: "2026-09-05",
    course: { uz: "Ish uchun ingliz tili", ru: "Английский для работы", en: "English for work" },
    tone: "#8e4a5c",
    lesson: { uz: "Xat yozish qoliplari", ru: "Шаблоны деловых писем", en: "Email patterns" },
    minutes: 28,
    gained: {
      uz: "«Could you please» va «I would appreciate» — bir xil emas ekan. Birinchisi soʻrov, ikkinchisi biroz rasmiyroq.",
      ru: "«Could you please» и «I would appreciate» — не одно и то же. Первое просьба, второе официальнее.",
      en: "“Could you please” and “I would appreciate” are not interchangeable — the second is the more formal register.",
    },
    hard: {
      uz: "Tinglab tushunish hali qiyin. Tez gapirsalar, yarmini yoʻqotaman.",
      ru: "Аудирование пока тяжело. Если говорят быстро, теряю половину.",
      en: "Listening is still hard. At speed I lose half of it.",
    },
  },
  {
    date: "2026-09-02",
    course: { uz: "Oilaviy byudjetni rejalashtirish", ru: "Планирование семейного бюджета", en: "Family budgeting" },
    tone: "#4f6f63",
    lesson: { uz: "Xarajat jadvali", ru: "Таблица расходов", en: "The expense table" },
    minutes: 41,
    gained: {
      uz: "Bir oylik xarajatni yozib chiqdim va kichik xaridlar qancha ekanini koʻrdim. Katta xarajatlar emas, aynan shular yigʻilib ketar ekan.",
      ru: "Расписала месяц расходов и увидела, сколько уходит на мелкие покупки. Накапливаются именно они, а не крупные траты.",
      en: "I wrote out a month of spending and saw how much goes on small purchases. It is those that add up, not the big ones.",
    },
  },
  {
    date: "2026-08-29",
    course: { uz: "Raqamli xavfsizlik", ru: "Цифровая безопасность", en: "Digital safety" },
    tone: "#4d6480",
    lesson: { uz: "Parol va ikki bosqichli kirish", ru: "Пароли и двухфакторный вход", en: "Passwords and two-factor" },
    minutes: 22,
    gained: {
      uz: "Barcha hisoblarga ikki bosqichli kirishni yoqdim. Bank va pochtadan boshladim — eng muhimi shu ikkisi ekan.",
      ru: "Включила двухфакторный вход везде. Начала с банка и почты — они и есть самые важные.",
      en: "I turned on two-factor everywhere, starting with the bank and email — the two that matter most.",
    },
  },
  {
    date: "2026-08-26",
    course: { uz: "Ayol rahbar: jamoa boshqaruvi", ru: "Женщина-руководитель", en: "Woman as a manager" },
    tone: "#6d5480",
    lesson: { uz: "Vazifa taqsimlash", ru: "Распределение задач", en: "Delegating work" },
    minutes: 37,
    gained: {
      uz: "Vazifani berganda muddatni ham, natijani ham aytish kerak. «Qilib qoʻying» — vazifa emas.",
      ru: "Передавая задачу, нужно назвать и срок, и результат. «Сделайте» — это не задача.",
      en: "Handing over work means naming both the deadline and the result. “Get it done” is not a task.",
    },
    hard: {
      uz: "Hammasini oʻzim qilishga odatlanganman. Bu eng qiyini boʻldi.",
      ru: "Привыкла делать всё сама. Это оказалось самым трудным.",
      en: "I am used to doing everything myself. That turned out to be the hard part.",
    },
  },
];
