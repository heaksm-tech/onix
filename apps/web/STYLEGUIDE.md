# Onix CRM — UI Style Guide

The single source of truth for building UI in Onix. If you are implementing a
new section, screen, or component — human or AI agent — read this first and
follow it. When something you need is not covered here, extend the existing
patterns rather than inventing new ones, and document the addition here.

Onix is an internal B2B CRM for S. D. Melas Trading Business. The UI language
is **Greek**. The design language is **minimal but refined**: one accent color,
card-based surfaces, hairline borders, generous whitespace, no decoration that
does not carry information.

---

## 1. Non-negotiables

1. **Semantic tokens only.** Never use raw colors (`bg-white`, `text-zinc-500`,
   hex values) in components. Use the token utilities from `src/app/globals.css`
   (`bg-surface`, `text-ink-secondary`, `border-line`, …). If a new color is
   genuinely needed, add it as a token there first, in both light and dark.
2. **No `dark:` variants.** Each token carries both themes via `light-dark()`;
   which one resolves is decided by `color-scheme` at the root. Components must
   be theme-blind — they never know or ask which theme is active.
3. **Greek copy everywhere** (see §7 for the short list of allowed English).
4. **Reuse the primitives** in `src/components/` (`Card`, `Button`,
   `PageHeader`, `EmptyState`, icons). Do not add UI libraries, icon packages,
   or CSS frameworks — the app intentionally has zero UI dependencies.
5. **Server components by default.** Add `'use client'` only where there is
   real interactivity (state, handlers, `usePathname`, …).
6. **Typed routes.** Hrefs flow through Next's `Route` type (`typedRoutes` is
   on). Nav lives in `src/lib/nav.ts` — never hardcode nav structure elsewhere.
7. Before finishing any change run, in `apps/web/`:
   `npm run typecheck && npm run lint && npm run format:check`
   All three must pass.

---

## 2. Design tokens

Defined in [`src/app/globals.css`](src/app/globals.css) as CSS variables mapped
into Tailwind v4 via `@theme inline`. Use them as `bg-*`, `text-*`, `border-*`
utilities.

Each token declares both values at once — `--canvas: light-dark(#f8f8f7,
#101012)` — and `color-scheme` on `:root` decides which one resolves:

- **`:root { color-scheme: light dark }`** — the default, follows the OS.
- **`<html data-scheme="light">` / `"dark"`** — explicit override, wins over the
  OS. Removing the attribute returns to following the OS.

Adding a token means adding one `light-dark()` line; there is no second block to
keep in sync, and no media query anywhere.

| Token           | Role                                            | Light         | Dark          |
| --------------- | ----------------------------------------------- | ------------- | ------------- |
| `canvas`        | App background (page, sidebar, topbar)          | `#f8f8f7`     | `#101012`     |
| `surface`       | Cards, active nav pill, inputs                  | `#ffffff`     | `#18181b`     |
| `surface-hover` | Hover state of `surface` elements               | `#f4f4f3`     | `#202024`     |
| `ink`           | Primary text; primary button background         | `#1a1a1e`     | `#f2f2f3`     |
| `ink-secondary` | Supporting text, descriptions, inactive nav     | `#5b5b66`     | `#a6a6af`     |
| `ink-faint`     | Placeholders, captions, disabled, icons at rest | `#9b9ba4`     | `#6b6b74`     |
| `line`          | Hairline borders, dividers                      | `#e7e7e4`     | `#26262b`     |
| `line-strong`   | Border hover emphasis                           | `#d4d4d1`     | `#333338`     |
| `accent`        | THE accent (indigo): active icons, focus, links | `#4f46e5`     | `#818cf8`     |
| `accent-strong` | Accent hover / gradient end                     | `#4338ca`     | `#a5b4fc`     |
| `accent-soft`   | Accent-tinted chip/icon backgrounds             | `#eef0fd`     | `#232345`     |
| `positive`      | Success (status dots, confirmations)            | `#059669`     | `#34d399`     |
| `negative`      | Errors, destructive                             | `#dc2626`     | `#f87171`     |
| `scrim`         | The wash behind a modal                         | `#101014` 32% | `#000000` 60% |

`scrim` is the one token that is dark in **both** themes: it is shade, not a
surface, so it cannot be an alpha of `ink` — that inverts between themes and
would haze the page white in dark mode.

Shadows: `shadow-card` (default card/pill elevation — includes a faint 1px
ring), `shadow-pop` (menus, popovers) and `shadow-modal` (dialogs, the only
place a heavy shadow is right — it is what lifts the panel off the scrim).

**Accent discipline** — the accent appears only in small doses: active nav
icons, focus rings, the logo stone, empty-state icon chips, links, tiny status
elements. Large surfaces are never indigo. Primary buttons are **ink**, not
accent. Alpha tints of ink (`bg-ink/5`) are the standard hover wash.

---

## 3. Typography

System font stack (`--font-sans`, already on `<body>`); no webfonts.

| Use                       | Classes                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| Page title (`PageHeader`) | `text-xl font-semibold tracking-tight`                            |
| Card / section heading    | `text-sm font-semibold`                                           |
| Empty-state title         | `text-base font-semibold tracking-tight`                          |
| Body & controls           | `text-sm`                                                         |
| Submenu items             | `text-[13px]`                                                     |
| Captions, hints           | `text-xs text-ink-faint`                                          |
| Overline labels (sidebar) | `text-[11px] font-medium uppercase tracking-wider text-ink-faint` |
| Numbers/metrics           | add `tabular-nums`                                                |

Greek text renders fine in all-caps via CSS `uppercase` (browsers drop the
tonos correctly) — write source copy in normal case.

---

## 4. Shape, spacing, elevation

- Radii: cards `rounded-xl` · buttons, inputs, nav rows `rounded-lg` ·
  submenu items, small chips `rounded-md` · pills/avatars `rounded-full`.
- Borders are always hairline `border-line`. Elevation = border + `shadow-card`,
  never heavy shadows.
- Card padding `p-5` (empty states `px-6 py-16`). Grid gaps `gap-4`.
- Content column: `mx-auto w-full max-w-6xl px-4 py-8 lg:px-8` (already in the
  app-shell layout — pages only render their content).
- Control heights: buttons `h-9`, compact inputs `h-8`, topbar `h-14`,
  sidebar width `w-60`.

---

## 5. Motion & interaction states

- Color/opacity transitions: `transition-colors duration-150`.
- Structural transitions (expand/collapse): 200ms; submenus animate via CSS grid
  `grid-rows-[0fr] → [1fr]` with an `overflow-hidden` inner wrapper.
- Dialogs: 150ms fade + 2% scale, both directions, defined once on the `dialog`
  element in `globals.css` (entry needs `@starting-style`, exit needs
  `allow-discrete` on `display` and `overlay`, or the element vanishes before it
  can animate out). The scroll lock is CSS too — `html:has(dialog[open])`.
  Everything here collapses to 1ms under `prefers-reduced-motion: reduce`.
- Popovers that mount on open (`.popover-panel`, also in `globals.css`): the
  same 150ms fade, with a 4px rise. Entry needs `@starting-style` for the same
  reason a dialog does — the element does not exist to transition _from_ until
  it appears. There is no exit half: unmounting takes the element with it, and a
  panel that must animate out has to stay in the tree the way `dialog` does.
- Hover: `hover:bg-ink/5` wash (or `hover:bg-surface-hover` on surfaces).
- Focus: **every** interactive element gets
  `outline-none focus-visible:ring-2 focus-visible:ring-accent/60`.
- Accessibility is part of the style: `aria-current="page"` on active links,
  `aria-expanded` on toggles, `inert` on collapsed/hidden regions, Greek
  `aria-label`s on icon-only buttons.

---

## 6. Components (the contract)

All in `src/components/` — import, don't duplicate:

- **`Card`** — the only surface primitive (`border-line bg-surface shadow-card
rounded-xl`). Everything card-like uses it.
- **`Button`** — variants: `primary` (ink bg — max one per view), `secondary`
  (bordered surface), `ghost` (text + hover wash), `danger` (negative text +
  tinted hover, for destructive actions). Sizes: `md` (default, `h-9`) and
  `sm` (`h-8`, for actions inside a list row). Extend with variants, not
  one-off classes. `buttonClass(variant, size, className)` is the same styling
  without the element, for the one case a `<button>` cannot cover: a `Link`
  that acts as an action («Επεξεργασία»). Anything that _does_ something
  rather than _goes_ somewhere stays a `Button`.
- **`PageHeader`** — title + optional description + optional right-side
  `action`. Every page starts with it.
- **`EmptyState`** — icon + title + description inside a `Card`. The standard
  body for not-yet-built or zero-data states.
- **`ConfirmDialog`** — the app's only modal, and the only way to ask before
  doing something irreversible. Props: `open` `title` `description`
  `confirmLabel` `cancelLabel` `busyLabel` `tone` (`accent` | `danger`) `icon`
  `busy` `error` `onConfirm` `onCancel`. It is a native `<dialog>` opened with
  `showModal()` — that is what supplies the focus trap, Escape, the top layer,
  the inert page and the return of focus to the trigger, so **never hand-build
  a modal out of a fixed div**. Three rules it keeps, which any caller must
  respect: `open` is owned by the caller and the dialog never closes itself;
  while `busy` nothing dismisses it; and a failure is passed back in as `error`
  rather than closing the prompt. Focus starts on the cancel button — a stray
  Enter must give the safe answer.
- **`Field` / `controlClass`** (`field.tsx`) — the form contract. `Field` is a
  labelled row (label above, optional hint below); `controlClass` carries the
  input styling and goes on native `input`, `select` and `textarea` alike.
  There is no styled input component — the native elements already behave, they
  only need the tokens. Never re-declare that class string in a form.
  A problem with one control belongs in that field's `error` prop (announced,
  and it replaces the hint) with `aria-invalid` on the control itself; the
  form-wide `role="alert"` line above the submit button is for everything else.
- **`SearchSelect`** (`search-select.tsx`) — a select whose list is long enough
  to need a filter: the trigger wears `controlClass` and shows the chosen
  option, and the panel under it holds a search box above the list. **It is the
  exception, not the rule** — a handful of options is still a native `<select>`,
  which is the better control. Filtering starts at **two characters** (one
  narrows nothing; below the threshold the whole list is offered, so the control
  still behaves like the select it replaces) and is accent- and case-blind, so
  «Οδός» is found by typing `οδος`; the matched run is tinted where it sits.
  The options are not focusable — the search box keeps focus and points at the
  active one with `aria-activedescendant`, which is what lets one control both
  type and choose. Because it has no native validity, a form using it validates
  the value itself, the way both communication forms already do.
- **`icons.tsx`** — hand-rolled 24×24 stroke icons (`stroke-width 1.75`, round
  caps/joins, Lucide-style geometry). New icons are added here following the
  same recipe; **never install an icon package**. Default rendered sizes:
  nav `size-[18px]`, inline `size-4`, chips `size-5`.
- **`logo.tsx` / `LogoMark`** — the emerald-cut "O" with the accent stone. Band
  uses `currentColor`, stone uses `var(--accent)`. Do not restyle, recolor, or
  redraw; the favicon (`src/app/icon.svg`) must stay visually in sync with it.
- **Shell** (`src/components/shell/`) — `Sidebar` + `Topbar` + `MobileNav`;
  pages never render their own chrome. Breadcrumbs derive automatically from
  nav. `NavList` is the nav rows themselves, rendered by both the sidebar and
  the mobile drawer — add nav behavior there, not in either shell.
  `AccountMenu` is the one home of account actions at every viewport: identity,
  password change and sign-out. `UserCard` in the sidebar/drawer is identity
  only, so never add a second copy of those actions there.
- **Dashboard** (`src/components/dashboard/`) — the report primitives:
  `StatTile` (one headline number), `ReportCard` (titled panel, optional note
  opposite the heading) and `ReportEmpty` (quiet in-panel zero state). See §10.

---

## 7. Language (Greek-first)

- All user-facing copy is Greek, in the formal plural («συνεργάζεστε»).
  This includes `aria-label`s, `<title>`s, error/404 pages, alt text.
- Deliberate English exceptions (keep exactly these): **Dashboard**,
  **Workspace**, the brand **Onix CRM**, the subtitle "S. D. Melas Trading
  Business", technical initialisms (CRM, API, email), and the `⌘K` shortcut.
- URL slugs are English kebab-case (`/companies/new-communication`), Greek
  labels on top via `nav.ts`.
- Page metadata: Greek `title` per page; the root template appends `· Onix`.
- Tone: short, factual, no exclamation marks. Empty states say what will live
  there, in one or two sentences.

---

## 8. Navigation & routing model

`src/lib/nav.ts` is the single source of truth; Sidebar and Topbar breadcrumb
both render from it.

- **Leaf item** `{ label, href, icon }` → navigates; gets the active pill
  (`bg-surface shadow-card`) when current.
- **Group item** `{ label, icon, children }` → **has no page and never
  navigates**; the row only toggles its submenu (`aria-expanded`, chevron
  rotates, auto-opens when a child route is active). Only its children have
  pages. The types enforce this — a group cannot carry an `href`.
- Active styling: exact page → pill on the leaf/sub-item; section with active
  child → group header gets `text-ink` + accent icon, no pill.

**One nav, two shells.** The rows live in `NavList`; `Sidebar` renders them in
the permanent column from `md` up, and `MobileNav` renders the same list in a
drawer below `md`, opened by the topbar's menu button (the only chrome on the
left at that width — the compact logo moved into the drawer header). The drawer
stays mounted so it animates both ways: `inert` is what removes it from the tab
order and the a11y tree while closed, `pointer-events-none` keeps the closed
backdrop from swallowing taps. It closes on backdrop tap, on `Escape`, on the
close button and on any navigation — including a tap on the page already open,
which is why `NavList` takes an `onNavigate` callback rather than relying on
the pathname changing. Opening moves focus to the close button and locks body
scroll; closing by any route other than navigation returns focus to the
trigger.

Routes live under the `(app)` route group so every section inherits the shell:

```
src/app/(app)/<section>/page.tsx
src/app/(app)/<section>/<sub-page>/page.tsx
```

`(app)` means **signed in**. Its layout resolves the current user and redirects
to `/login` when there is none, so every page inside it can assume a session.
Screens that exist _before_ sign-in live in `(auth)` instead — they render on a
bare canvas with no sidebar or topbar, and they are the only pages allowed to
do so. Route groups do not appear in the URL: `(auth)/login/page.tsx` is
`/login`.

### Recipe: adding a section

1. Add the icon to `icons.tsx` (if needed, same stroke recipe).
2. Add the leaf or group entry to `NAV_ITEMS` in `nav.ts`.
3. Create the page(s): Greek `metadata.title`, `PageHeader`, then content
   (or `EmptyState` while unbuilt).
4. Breadcrumb, active states, and submenu behavior come for free.
5. Run the three checks (§1.7).

---

## 9. Data & API conventions (web side)

- Talk to the Express API only through `apiFetch` in `src/lib/api.ts`
  (typed errors via `ApiError`). Server components reach Express directly via
  `API_URL`; browser code goes to this app's own `/api/v1/*` route, which
  forwards on. See the auth notes below for why that distinction matters.
- **Server components fetch through `apiFetchAsUser`** (`lib/server-api.ts`),
  never `apiFetch` on its own: they have no cookie jar, so the session cookie
  has to be forwarded by hand or every authenticated route answers 401. It
  defaults to `no-store`. That module is server-only — importing it from a
  client component is a build error, which is the point.
- Async server components that fetch should be wrapped in `<Suspense>` with a
  quiet Greek fallback, so pages never block on the API.
- Status indication: small `positive`/`negative` dot + short Greek text (see
  `api-status.tsx` for the pattern).

### Auth

- **The browser never talks to the API directly.** `apiFetch` posts to this
  app's own `/api/v1/*` route, which forwards to Express. There is no
  `NEXT_PUBLIC_API_URL`; the API's address is server-side only. Keep it that
  way — a browser-visible API URL undoes the lockdown below.
- The session is an httpOnly cookie issued by Express and relayed by that
  route, so it is first-party to the web origin. Same-origin requests carry it
  automatically; a 401 means the session is gone.
- Server components read the user through `getCurrentUser()` in `lib/auth.ts`.
  That module imports `next/headers` and is therefore server-only — client
  components take the user as a prop and import the shared `AuthUser` type,
  `ROLE_LABELS` and `initials()` from `lib/session.ts`.
- Role labels are Greek and live in one place (`ROLE_LABELS`). Never spell a
  role out in JSX.

### Account password

`/account/password` is reached from `AccountMenu`, not the primary navigation,
and is available to every signed-in role. It asks for the current password and
the replacement twice. The minimum length is 12 characters, matching the
account CLI; the API is authoritative for every rule even when the form answers
first.

A successful change keeps the session that proved the current password and
revokes every other session for that account. The notification email is sent
after the database transaction commits. A Resend failure therefore cannot undo
or cast doubt on a password that already changed: the response carries
`notificationSent`, and the form reports the partial outcome explicitly.

Email configuration belongs to the API only. In development it sends from
`onboarding@resend.dev` to `RESEND_DEV_TO` (the safe Resend delivered address by
default); in production it sends from `RESEND_FROM_EMAIL` at the verified domain
to the account's own email. `NODE_ENV` chooses the branch. No Resend key or
sender address may enter the web package or a `NEXT_PUBLIC_*` value.

### The anonymous perimeter

`proxy.ts` serves a visitor without a session exactly two things: the login
document and the endpoint it posts to. Pages redirect to `/login`; everything
else — API routes, RSC payloads, **and every JavaScript chunk** — gets a flat 404. The bundles name every endpoint and screen the app has, so handing them to
an anonymous visitor hands over a map of the API.

That works only because **the login page ships no JavaScript**:

- `login-form.tsx` is a server component rendering a native
  `<form method="post">`. It must stay that way. Adding `'use client'` anywhere
  under `/login` leaves the page rendering but never hydrating.
- Its CSS is inlined via `experimental.inlineCss`, so the document is
  self-contained in production.
- A failed sign-in is a redirect carrying an error **code**, mapped to Greek
  copy by `loginErrorMessage()`. Never put an API message in the URL.

Stylesheets are the one carve-out — they expose no endpoint, and the login page
already inlines the same rules. If you add a section, nothing here needs
touching: `(app)` pages and their chunks are covered by default.

---

## 10. Reports & metrics

The Dashboard is the reference implementation
(`src/components/dashboard/`, fed by `GET /communications/summary`).

**Layout.** A report is rows of `grid gap-4`: a `sm:grid-cols-2
xl:grid-cols-4` band of `StatTile`s first, then `lg:grid-cols-3` rows of
`ReportCard`s where the wider panel takes `lg:col-span-2`. Cards in a row
stretch to equal height — a panel that should fill that height (a chart) grows
via `flex-1`; list panels size to their content.

**Numbers.** Metric figures are `text-2xl font-semibold tracking-tight
tabular-nums` — the one type size above the page title, and only for a headline
figure. Every digit anywhere in a report gets `tabular-nums` so columns of
dates and counts line up.

**Bars and charts.** Built by hand from divs — there is no chart library, and
none is to be added. Only the data-driven dimension (a bar's width or height)
is an inline `style`; everything else is tokens. Colour carries meaning through
the semantic tokens (`positive` / `negative` / `accent` / `ink-faint`), never
raw hues, and never as the _only_ channel: a state shown in `text-negative`
(«Εκπρόθεσμη») must also say so in words. A chart gets `role="img"` and a Greek
`aria-label` summarising it; per-bar detail goes in a `title`.

**Zero is data.** An outcome with no occurrences stays on the list at 0, and a
day with no activity keeps a hairline tick rather than vanishing — a gap the
reader can see beats a row that silently disappears between loads.

**Domain vocabulary lives in `lib/`.** Outcome codes are database values;
their Greek labels and token colours live in `lib/communications.ts`
(`OUTCOME_LABELS`, `OUTCOME_TONES`), the way roles live in `lib/session.ts`.
Never spell an outcome out in JSX — the form's select and the report's
breakdown read from the same map.

**The clock belongs to the database.** Anything time-relative — whether a
reminder is late, how many days until it is due — is computed in SQL and
travels with the row. Rendering must stay pure: reading `Date.now()` during
render is both a lint error and a source of server/browser disagreement.
Formatting is fixed to `Europe/Athens` in `lib/communications.ts`, so a deploy
on a UTC host cannot shift what «σήμερα» means for the office. The same applies
to input: `<input type="datetime-local">` hands over a bare wall clock, so it
is read and written through `toDateTimeLocal` / `fromDateTimeLocal`, never
through `new Date(value)` — which would silently mean the browser's zone and
would not survive a round trip through a server in another one.

---

## 11. Record screens (list → detail → edit)

Communications are the reference implementation
(`src/components/communications/`, fed by `GET /communications`).

**Three routes, one section.** `/companies/communications` lists, `…/[id]`
shows one record in full, `…/[id]/edit` changes it. The list and the detail are
server components; only the form and the delete action are `'use client'`.

**Fetching.** Each screen's async component fetches its own data through
`apiFetchAsUser` and the page wraps it in `<Suspense>`, so nothing blocks on
the API — including the detail header, whose title is the record's company.
Page `metadata.title` therefore stays static Greek; do not add a
`generateMetadata` that fetches the record a second time. A record that is
missing calls `notFound()` (`loadCommunication` in `lib/communication-record.ts`
does this for both screens); an API that did not answer renders `LoadError`.

**Rows.** A list is a `Card` around a `<ul>` of hairline-separated rows
(`border-b border-line … last:border-0`), each row: identity on the left,
outcome and date on the right, then its actions as `sm` `ghost` controls.
Icon-free text actions carry the record in their `aria-label`
(«Επεξεργασία επικοινωνίας με …»), since "Επεξεργασία" alone is not a name.

**Paging.** The API pages; the URL carries `?page=`. The pager states «Σελίδα N
από M» and keeps the unavailable end in place rather than dropping it, so the
controls do not shift. `<Suspense key={page}>` makes paging show the fallback
instead of the previous page's rows.

**Destructive actions.** The trigger is a quiet `danger` button that only opens
a `ConfirmDialog` (§6); the deed itself is the `destructive` button inside it.
Nothing in the app deletes on a first click. Deletion is soft on the API side,
and the client only calls `router.refresh()` — the list is server-rendered and
re-reads itself.

**A saved form leaves.** Creating or editing a record ends with
`router.push()` to the list or the detail screen, followed by `router.refresh()`
so the server-rendered page re-reads rather than restoring a copy that predates
the save. The record itself — at the top of the list, or on its own page — is
the confirmation, so there is no success banner to show and no form to reset.
`submitting` stays `true` through the navigation, which keeps the button
disabled and makes a double submit impossible.

**Forms are shared, not copied.** The fields of a communication live once, in
`communications/details-fields.tsx`, and both the create and the edit form
render them; `detailsPayload()` is the single place control values become a
request body. Mirrors the API, which builds its create and update schemas from
one set of fields. A select whose options load asynchronously always offers the
record's current value in the meantime — a form must not be able to change what
it is only displaying.

**A company name is unique, and both forms say so before saving.** The database
holds a unique index on the trimmed, case-folded name of every live company, so
the API answers 409 when a name is taken — creating one on the
new-communication form, or renaming one on the edit form. Both forms compare
against the company list they already loaded (`lib/companies.ts`) while the name
is typed, so the answer arrives before a request is sent; the 409 covers what
that list cannot see — a company added by someone else since the form loaded.
Either way the message lands in the name field's `error`, never in the
form-wide alert, and the submit button is disabled while it stands.

---

## 12. Quick do / don't

| Do                                                  | Don't                                         |
| --------------------------------------------------- | --------------------------------------------- |
| `bg-surface`, `text-ink-secondary`                  | `bg-white`, `text-gray-500`, hex in JSX       |
| Extend `Button` with a variant                      | One-off `<button className="…">`              |
| Add icons by hand in `icons.tsx`                    | `npm install lucide-react` (or any UI lib)    |
| Greek copy, formal plural                           | English strings, informal («μπες»)            |
| `focus-visible:ring-2 focus-visible:ring-accent/60` | Removing focus outlines entirely              |
| Group nav item → submenu only                       | Giving a group its own page/route             |
| One ink `primary` button per view                   | Accent-colored or multiple primary buttons    |
| `prefers-color-scheme` via tokens                   | `dark:` classes in components                 |
| Hand-built bars, tokens for colour                  | A chart library, or a raw hue per series      |
| `apiFetchAsUser` in server components               | `apiFetch` without the session cookie         |
| Time-relative values computed in SQL                | `Date.now()` during render                    |
| `buttonClass` on a `Link` that acts                 | A `Button` with an `onClick` that navigates   |
| Ask with `ConfirmDialog` before deleting            | `window.confirm`, or a modal built from a div |
| `SearchSelect` only for a list worth filtering      | Replacing every `<select>` with it            |
