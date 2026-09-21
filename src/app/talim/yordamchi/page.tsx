import { redirect } from "next/navigation";

/**
 * This address used to hold a placeholder assistant that answered every
 * question with "the live assistant arrives with the API". It has arrived: the
 * AI Coach at /yordamchi answers from her own records. Keeping a second,
 * silent assistant in the learning section would send her to the wrong one.
 */
export default function LearningAssistant() {
  redirect("/yordamchi");
}
