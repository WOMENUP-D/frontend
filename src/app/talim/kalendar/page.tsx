import { redirect } from "next/navigation";

/**
 * The learning calendar used to be drawn from sample data — classes, exams and
 * deadlines that never existed. Courses on WomanUP are self-paced and have no
 * dates, so the only real things with a date are events: this address now
 * opens the event calendar, which draws nothing but real records and says so
 * when there are none.
 */
export default function LearningCalendar() {
  redirect("/tadbirlar?view=calendar");
}
