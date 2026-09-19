# Components

Presentational components live here, grouped by feature once there is more than
one file per feature (`cabinet/`, `programs/`, `navigator/`, `admin/`).

The design direction is fixed by section 10 of the technical specification:
mobile-first from 360 px, white background with soft violet/pink accents and
gold micro-details, large readable typography, no dark patterns, Uzbek first.

## Guided pages (`guide/`)

Reusable pieces for screens that have to be understood by somebody who has
never used a dashboard — the career path is the first page built from them.

| Piece | What it is for |
|---|---|
| `Journey`, `JourneyStep` | A short, real sequence drawn down one line. Each stage says its state in words beside a marker whose *shape* differs (check, blossom, open circle, dashed circle); detail opens in place from a real button with `aria-expanded`. Not for things that are not a sequence. |
| `NextStepCard` | The one thing to do now, with one large button. One per screen. |
| `SkillChip` | A skill and, in words, whether she has it: `have` (evidence), `claimed` (her own word), `need`. |
| `Hint` | "What's this?" beside a word that needs explaining. Opens in place — never on hover, never covering what it explains. |
| `Meter` | "2 of 5", written out, with a bar that only repeats the words. |

Rules they share: 44 px minimum targets, state never by colour alone, visible
focus, no hover-only behaviour, and the one motion (the walked line growing
into place) is skipped under `prefers-reduced-motion`. Plain words over
product terms: "What you still need to learn", not "skill gap".

## Jobs (`jobs/`)

`JobCard`, `SaveButton`, `FilterControls` / `FilterSheet` (the phone's filter
panel: a native modal dialog with "Clear all" and "Show results"), and the
listing page's `FitPanel`, `Requirements` and `ApplyPanel`. `format.ts` holds
the wording rules and is unit-tested. They reuse the guide pieces above
(`Meter`, `Hint`) and the same rules: 44 px targets, state in words, nothing on
hover only.

## Organisations (`org/`), business (`business/`), workspace (`workspace/`)

Her side and the organisation's side are drawn in two registers on purpose:
her pages keep the catalogue's warm, large style; the workspace sits in the
coordinators' flat, tabular shell (`aw-*`).

| Piece | What it is for |
|---|---|
| `org/OrgLine` | Who published a listing: its name, the verified mark (with its plain-words caveat behind a `Hint` when asked), and a link only when its page is public. |
| `org/StateLine` | A state in words with a shape beside it — filled check, ring with a dot, ring with a cross, empty ring — so colour is never the only signal. |
| `org/Expandable` | A heading that opens its body in place ("Why you're seeing this"). |
| `org/ConfirmDialog` | Ask once before something that cannot be quietly undone. Native modal `<dialog>`: focus held, Escape cancels (not while a request is in flight), focus returns to the opener. The confirm button says what it does. |
| `org/OrganisationsSection` | Her invitations, who can read her profile (with "Stop sharing"), and the "Organisations can find me" switch. |
| `business/BusinessCard` | A business listing in plain words: the kind and what it means, what she would receive exactly as recorded (or "not stated"), whether she may apply, and the server's reasons. |
| `workspace/*` | The organisation's listings table and form, applications with forward-only status moves, anonymous candidate search and invitations, and the owner-edited profile. `CandidateView` shows exactly the fields she agreed to share. |

`business/format.ts` and `workspace/model.ts` hold the wording and form rules
and are unit-tested; the server re-checks every one of them.

## Design system (`ds/`)

One import — `@/components/ds` — for the pieces every new screen is built
from, so a 20-year-old and a 55-year-old meet the same controls everywhere.

| Piece | Use it for |
|---|---|
| `CTA` | The primary / secondary / quiet action. 48px tall, words that say what happens, a link or a button. One primary per view. |
| `Section` | A heading, an optional line under it, one optional action. |
| `Badge` | A short state in words, icon optional. Never colour alone. |
| `EmptyState` | What is missing and what she can do instead — never a blank. |
| `Segmented` | Two to four always-on choices (a view, a format). |
| `Tabs` / `TabPanel` | Sections of one page; arrow keys, Home/End. |
| `Sheet` | Bottom sheet on a phone, dialog on a desk (filters). |
| `StepIndicator` | A short real sequence (the getting-started guide). |
| `Icon` | One 24px line set, including a shape per event kind. Always beside a word. |
| `Help` (= `Hint`) | "What's this?" / "How does it work?", opened in place, not on hover. |
| `Progress` (= `Meter`), `Modal` (= `ConfirmDialog`), `Expandable`, `StateLine` | Existing pieces, re-exported under the system's names. |

## Events (`events/`) and home widgets (`home/`)

`EventCard` answers What / When / Where / For whom and then "Learn more"; the
date leaf is its one bold element. `Timeline` groups events by month on one
line; `Calendar` is a keyboard-operable month grid over real events only.
`format.ts` holds every date and wording rule (Uzbek months from its own
tables — browsers lack them) and is unit-tested. `YourWeek` shows the lesson
to continue and at most three real next things; `GettingStarted` is a
skippable five-step map for someone new.

## Results dashboard (`results/`)

The admin panel's Results tab. `Results` owns the one filter row (period
presets in Tashkent days, custom dates, region — a coordinator gets no picker,
the server decides her scope) and the six section tabs; each section in
`Sections.tsx` loads its own endpoint, so one failure never blanks the rest.
`Figures.tsx` keeps four states apart: a count (0 is a count), a rate with its
"n of d", "No data" over a denominator of 0, and "Not recorded". Every tile
carries its definition (`res.def.*`). `Charts.tsx`: every chart's title is the
question it answers; `ColumnChart` reads by arrow keys and has a table view,
`BarList` is a real table with "<5" for hidden groups and "Unknown" in grey and
last, `SplitBars` draws a dimension's bands in one hue and no bar when a band is
hidden. Colours are `.rs` tokens, validated for contrast in both themes.
`model.ts` (unit-tested) only shapes requests and reads answers — the browser
never counts records.
