import { portal } from "@/services/portal";

/**
 * One in-flight `GET /users/me/profile` shared by the learning shell and the
 * page under it (QA H-06): both mount together and both want the record, and
 * on a phone on 3G the duplicate cost a round trip. The promise is kept only
 * briefly — long enough to deduplicate a first render, short enough that an
 * edit made on another page is read fresh on the next navigation.
 */
let pending: { at: number; promise: Promise<unknown> } | null = null;
const WINDOW_MS = 5000;

export function sharedProfile(): Promise<unknown> {
  const now = Date.now();
  if (pending && now - pending.at < WINDOW_MS) return pending.promise;
  const promise = portal.profile().catch((error) => {
    pending = null;
    throw error;
  });
  pending = { at: now, promise };
  return promise;
}
