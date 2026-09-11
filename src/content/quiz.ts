/**
 * Questions a visitor can answer before she has an account.
 *
 * The landing page can describe the programmes all it likes; one real question
 * from inside one of them says more than a paragraph about what the teaching
 * is actually like. So these are not marketing quiz-bait — each is lifted from
 * the material of a named programme, has one defensible answer, and carries
 * the explanation the course itself would give.
 *
 * Two rules for anything added here:
 *
 * **No trick questions and no shaming.** A visitor who gets one wrong has just
 * learnt something, and the page must read that way — the explanation is shown
 * whichever answer she picks, and the wrong ones are never mocked.
 *
 * **Nothing that needs a disclaimer.** No medical, legal or financial advice
 * that a wrong reading could hurt someone with: the platform's own rules put
 * final verdicts in those fields behind a human, and a landing-page quiz is
 * the last place to bend that.
 */

import { type Text } from "./learning";

export interface QuizOption {
  id: string;
  label: Text;
  correct?: boolean;
}

export interface QuizQuestion {
  id: string;
  /** The programme this came out of, named on the card. */
  course: Text;
  /** Its direction's colour, from the catalogue's set. */
  tone: string;
  question: Text;
  options: QuizOption[];
  /** Shown after any answer — the point of the exercise, not a reward. */
  explain: Text;
}

export const quiz: QuizQuestion[] = [
  {
    id: "q-budget",
    course: { uz: "Oilaviy byudjetni rejalashtirish", ru: "Планирование семейного бюджета", en: "Family budgeting" },
    tone: "#4f6f63",
    question: {
      uz: "Zaxira jamgʻarma qancha boʻlishi kerak, deb hisoblanadi?",
      ru: "Каким считается достаточный размер резервного фонда?",
      en: "How large should an emergency fund be?",
    },
    options: [
      { id: "a", label: { uz: "Bir oylik xarajat", ru: "Расходы за один месяц", en: "One month of expenses" } },
      { id: "b", label: { uz: "3–6 oylik xarajat", ru: "Расходы за 3–6 месяцев", en: "Three to six months of expenses" }, correct: true },
      { id: "c", label: { uz: "Bir yillik daromad", ru: "Годовой доход", en: "A year of income" } },
    ],
    explain: {
      uz: "3–6 oylik xarajat — ish oʻzgarganda yoki kutilmagan tashvishda qarzga kirmasdan yetadigan muddat. Daromaddan emas, aynan xarajatdan hisoblanadi.",
      ru: "Три-шесть месяцев расходов — срок, которого хватает пережить смену работы или непредвиденное, не влезая в долги. Считают именно от расходов, а не от дохода.",
      en: "Three to six months of expenses covers a job change or an emergency without borrowing. It is counted from what you spend, not what you earn.",
    },
  },
  {
    id: "q-phishing",
    course: { uz: "Raqamli xavfsizlik", ru: "Цифровая безопасность", en: "Digital safety" },
    tone: "#4d6480",
    question: {
      uz: "Bankdan kelgan xabar haqiqiy ekanini nima ishonchli koʻrsatadi?",
      ru: "Что надёжнее всего подтверждает, что письмо действительно от банка?",
      en: "What most reliably shows a message really came from your bank?",
    },
    options: [
      { id: "a", label: { uz: "Xatdagi bank logotipi", ru: "Логотип банка в письме", en: "The bank's logo in the message" } },
      { id: "b", label: { uz: "Havolaning chiroyli koʻrinishi", ru: "Красивая ссылка", en: "A tidy-looking link" } },
      { id: "c", label: { uz: "Hech nima — bankka oʻzingiz qoʻngʻiroq qilish", ru: "Ничего — нужно позвонить в банк самой", en: "Nothing — call the bank yourself" }, correct: true },
    ],
    explain: {
      uz: "Logotip ham, havola ham osongina soxtalashtiriladi. Yagona ishonchli yoʻl — xatdagi raqamga emas, bank kartasi orqasidagi raqamga oʻzingiz qoʻngʻiroq qilish.",
      ru: "И логотип, и ссылку подделать просто. Единственный надёжный способ — позвонить самой по номеру с обратной стороны карты, а не по тому, что указан в письме.",
      en: "Both the logo and the link are trivial to fake. The only reliable check is to call the number on the back of your card — never the one in the message.",
    },
  },
  {
    id: "q-interview",
    course: { uz: "Rezyume va ish suhbati", ru: "Резюме и собеседование", en: "CV and interview" },
    tone: "#8e4a5c",
    question: {
      uz: "Rezyumeda tajribani qanday yozgan kuchliroq boʻladi?",
      ru: "Как сильнее описать опыт в резюме?",
      en: "Which way of writing experience is stronger?",
    },
    options: [
      { id: "a", label: { uz: "«Hisobot tayyorlash bilan shugʻullanganman»", ru: "«Занималась подготовкой отчётов»", en: "“Responsible for preparing reports”" } },
      { id: "b", label: { uz: "«Oyiga 14 ta hisobotni 2 kunga tez topshirdim»", ru: "«14 отчётов в месяц, срок сократила на 2 дня»", en: "“14 reports a month, two days faster”" }, correct: true },
      { id: "c", label: { uz: "«Mehnatsevar va mas’uliyatli»", ru: "«Трудолюбивая и ответственная»", en: "“Hard-working and responsible”" } },
    ],
    explain: {
      uz: "Vazifa emas, natija yoziladi: nima qilgansiz, qancha va qanday oʻzgarish boʻlgan. Raqam boʻlsa — albatta koʻrsating, u sifatlardan koʻra koʻproq gapiradi.",
      ru: "Пишут не обязанность, а результат: что делали, сколько и что изменилось. Если есть число — ставьте его, оно говорит больше любых прилагательных.",
      en: "Write the result, not the duty: what you did, how much of it, and what changed. A number says more than any adjective.",
    },
  },
];
