import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";

const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) });
export default [
  { ignores: [".next/**", "node_modules/**"] },
  ...compat.extends("next/core-web-vitals"),
  // QA B-05: the design-time fixtures in `@/content/learning` are types only
  // for screens — a screen that renders sample goals, courses or diary
  // entries shows a stranger's data as hers. Import the types, never the data.
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/content/learning",
              importNames: [
                "learner", "courses", "learningStats", "events", "goals", "achievements",
                "recommendations", "notifications", "assistantActions", "continueCourse",
                "enrolledCourses", "findCourse", "findLesson", "goalStepState",
              ],
              message: "Sample data — read the real records from @/services/portal.",
            },
          ],
          patterns: [
            { group: ["@/content/diary", "@/content/study-log", "**/useMockData"], message: "Sample data is not allowed in screens." },
          ],
        },
      ],
    },
  },
];
