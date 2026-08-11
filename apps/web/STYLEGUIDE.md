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

| Token           | Role                                            | Light     | Dark      |
| --------------- | ----------------------------------------------- | --------- | --------- |
| `canvas`        | App background (page, sidebar, topbar)          | `#f8f8f7` | `#101012` |
| `surface`       | Cards, active nav pill, inputs                  | `#ffffff` | `#18181b` |
| `surface-hover` | Hover state of `surface` elements               | `#f4f4f3` | `#202024` |
| `ink`           | Primary text; primary button background         | `#1a1a1e` | `#f2f2f3` |
| `ink-secondary` | Supporting text, descriptions, inactive nav     | `#5b5b66` | `#a6a6af` |
| `ink-faint`     | Placeholders, captions, disabled, icons at rest | `#9b9ba4` | `#6b6b74` |
| `line`          | Hairline borders, dividers                      | `#e7e7e4` | `#26262b` |
| `line-strong`   | Border hover emphasis                           | `#d4d4d1` | `#333338` |
| `accent`        | THE accent (indigo): active icons, focus, links | `#4f46e5` | `#818cf8` |
| `accent-strong` | Accent hover / gradient end                     | `#4338ca` | `#a5b4fc` |
| `accent-soft`   | Accent-tinted chip/icon backgrounds             | `#eef0fd` | `#232345` |
| `positive`      | Success (status dots, confirmations)            | `#059669` | `#34d399` |
| `negative`      | Errors, destructive                             | `#dc2626` | `#f87171` |

Shadows: `shadow-card` (default card/pill elevation — includes a faint 1px
ring) and `shadow-pop` (menus, popovers).

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
  (bordered surface), `ghost` (text + hover wash). Extend with variants, not
  one-off classes.
- **`PageHeader`** — title + optional description + optional right-side
  `action`. Every page starts with it.
- **`EmptyState`** — icon + title + description inside a `Card`. The standard
  body for not-yet-built or zero-data states.
- **`Field` / `controlClass`** (`field.tsx`) — the form contract. `Field` is a
  labelled row (label above, optional hint below); `controlClass` carries the
  input styling and goes on native `input`, `select` and `textarea` alike.
  There is no styled input component — the native elements already behave, they
  only need the tokens. Never re-declare that class string in a form.
- **`icons.tsx`** — hand-rolled 24×24 stroke icons (`stroke-width 1.75`, round
  caps/joins, Lucide-style geometry). New icons are added here following the
  same recipe; **never install an icon package**. Default rendered sizes:
  nav `size-[18px]`, inline `size-4`, chips `size-5`.
- **`logo.tsx` / `LogoMark`** — the emerald-cut "O" with the accent stone. Band
  uses `currentColor`, stone uses `var(--accent)`. Do not restyle, recolor, or
  redraw; the favicon (`src/app/icon.svg`) must stay visually in sync with it.
- **Shell** (`src/components/shell/`) — `Sidebar` + `Topbar`; pages never
  render their own chrome. Breadcrumbs derive automatically from nav.

---

## 7. Language (Greek-first)

- All user-facing copy is Greek, in the formal plural («συνεργάζεστε»).
  This includes `aria-label`s, `<title>`s, error/404 pages, alt text.
- Deliberate English exceptions (keep exactly these): **Dashboard**,
  **Workspace**, the brand **Onix CRM**, the subtitle "S. D. Melas Trading
  Business", technical initialisms (CRM, API, email), and the `⌘K` shortcut.
- URL slugs are English kebab-case (`/suppliers/new-communication`), Greek
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

## 10. Quick do / don't

| Do                                                  | Don't                                      |
| --------------------------------------------------- | ------------------------------------------ |
| `bg-surface`, `text-ink-secondary`                  | `bg-white`, `text-gray-500`, hex in JSX    |
| Extend `Button` with a variant                      | One-off `<button className="…">`           |
| Add icons by hand in `icons.tsx`                    | `npm install lucide-react` (or any UI lib) |
| Greek copy, formal plural                           | English strings, informal («μπες»)         |
| `focus-visible:ring-2 focus-visible:ring-accent/60` | Removing focus outlines entirely           |
| Group nav item → submenu only                       | Giving a group its own page/route          |
| One ink `primary` button per view                   | Accent-colored or multiple primary buttons |
| `prefers-color-scheme` via tokens                   | `dark:` classes in components              |
