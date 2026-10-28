<!-- Generated from .agents/instructions.base.md by `npm run sync:rules`. Do not edit by hand. -->

You are assisting with PeekDiff, a Valorant stats tracker for a closed group of players ("the
crew"). It is the Valorant counterpart of JungleDiff (League of Legends) and shares its architecture:
it reads player and rank data from the GameOn API, renders game art from media.valorant-api.com, and
presents the crew's ladder. The interface is French; there is no public sign-up — authentication
exists so a crew member is recognised ("Vous") and, later, can edit their own profile.

# Technology Stack

- Nuxt 4.6.3, SSR enabled, `app/` directory structure, Nitro server routes under `server/`
- Vue Composition API, `<script setup>` only
- TypeScript strict; `any` is a lint error
- Tailwind CSS v4 driven by the "Protocol" design system (`design-system/MASTER.md`)
- Pinia setup stores
- Keycloak OIDC, implemented **server-side** in Nitro — no OIDC library ships to the browser
- `@nuxt/fonts` (self-hosted Big Shoulders / Barlow / JetBrains Mono), `@nuxt/icon` (lucide)
- Playwright for end-to-end tests, ESLint via `@nuxt/eslint`

# Language Policy

- **All source code and code comments are written in English**, without exception.
- User-facing strings stay **French**: UI labels, error messages rendered in the interface, and
  `useSeoMeta` content. The product is French; the code is not.

# Features

Only the home page exists so far. Profiles, match pages, records, settings and an admin space are
JungleDiff features PeekDiff does not have yet — and the GameOn API does not serve Valorant matches
yet either (see Known Gaps).

- `/` — crew dashboard, built from the "Protocol" design system. Top to bottom: status chips (the
  reload chip with "Synchro il y a X min", "7 derniers jours", the current act), four crew tiles
  (`WeekBento`: ranked players with an ASCII bar, net RR over 7 days, the best current rank, the
  crew's best all-time peak), then two columns — `CrewLadder` (a podium of three over each player's
  `wideart` card, "L'échelle des rangs" (`RankTrack`) on the elo axis with a 7-day trail, the remaining
  rows) beside a rail: `PlayerOfTheWeek` (best positive 7-day RR swing, over the player's `largeart`),
  `LastRankedGames` (the latest competitive game of each player, read off `valorantCurrentRank`) and
  `PeakRecords` (all-time peaks). Everything on it is live data from `GET /val/player`.
- **Smurf toggle** — page state in `index.vue`, off by default. It filters the roster the tiles, the
  ladder and the rail are built from; the store always keeps every account.
- **Theme** — dark by default, "Bone" (light) through the header toggle.
- **Sign-in** — the header's "Se connecter" starts the OIDC flow; signed in, the header shows the
  player's card and a sign-out button, and the ladder marks the viewer's row "Vous".

# Directory Layout

- `app/pages/` — orchestrate data loading with `useAsyncData` and own the page layout.
- `app/components/ui/` — generic, domain-free UI (`AppHeader`, `SectionIndex`, `FrameHead`,
  `MockBadge`).
- `app/components/home/` — the home page's business components.
- `app/components/val/` — components representing a Valorant entity (`ValRankEmblem`,
  `ValPlayerCard`), reused across pages.
- `app/composables/` — reusable logic and API client injection.
- `app/stores/` — Pinia setup stores.
- `app/lib/api/` — typed HTTP clients built on `BaseApiService`.
- `app/lib/types/` — domain interfaces, re-exported through `app/lib/types/index.ts`.
- `app/utils/` — pure helpers.
- `shared/types/` — contracts used by both Nitro and the app, imported via `#shared`.
- `shared/utils/` — logic both sides run, imported explicitly via `#shared/utils/...`
  (`admin-access.ts`: `ADMIN_ROLE`).
- `server/api/`, `server/routes/`, `server/middleware/`, `server/plugins/`, `server/utils/` — Nitro.
- `design-system/` — the design system's source of truth: `MASTER.md` (the spec), `tokens.css`
  (reference tokens, mirrored by `app/assets/css/main.css`), `valorant-assets.ts` (reference asset
  helper, mirrored by `app/utils/val-assets.ts`) and `showcase.html` (a static page showing every
  pattern). Not shipped; read it before designing anything.
- `tests/` — Playwright specs.

# Naming Conventions

- **Components**: PascalCase filenames. Nuxt auto-imports every component under `app/components/`
  using its directory path as a prefix (`ui/FrameHead.vue` → `<UiFrameHead>`). Pages and components
  in this codebase **import components explicitly** so they keep their short name — match that.
- **Component prefixes by domain**: components representing a Valorant entity live in `val/` and are
  prefixed `Val` (`ValRankEmblem`, `ValPlayerCard`). Same role as JungleDiff's `Lol` prefix.
- **Stores**: file `app/stores/<domain>.ts` exporting `use<Domain>Store` — `val.ts` → `useValStore`.
- **Composables**: file named after the function — `useGameOnVal.ts` → `useGameOnVal`.
- **Utils**: kebab-case filenames; Valorant-domain helpers carry a `val-` prefix (`val-tier.ts`,
  `val-ladder.ts`, `val-assets.ts`, `val-smurf.ts`). Generic ones do not (`theme.ts`, `date.ts`).
  Despite `app/utils/` being auto-imported, the codebase **imports these explicitly** — match that.
- **Types**: Valorant domain types are prefixed `Val` and API payload shapes end in `Dto`
  (`ValPlayerDto`, `ValRankHistoryDto`).
- **Server routes**: `<name>.<method>.ts` — `session.get.ts`, `logout.post.ts`. The method suffix is
  what restricts the verb; omitting it accepts every verb.
- **Server utils**: kebab-case, imported by **relative path** (`../../utils/session`) rather than
  through Nitro's auto-import, so the dependency is visible at the top of the file.
- **Props and events in templates**: kebab-case (`:include-smurfs`, `@hover`), camelCase in
  `<script setup>`. ESLint enforces this; `v-model` pairs use `update:<prop>`.
- **Design tokens**: `app/assets/css/main.css` defines raw values on `:root` (`--color-red`,
  `--color-surface`) and maps them in `@theme` to the names Tailwind exposes (`--color-brand-red`,
  `--color-surface-base`, `--color-text-main`). Write `bg-surface-base`, `text-text-main`,
  `text-brand-red` — never a raw hex in a component. Tier colours are tokens (`tier-iron` …
  `tier-radiant`) whose raw values (`--tier-*`) sit on `:root` so inline styles reach them through
  `tierColor()`. Accents printed on `night` surfaces use the fixed `on-night-red` / `on-night-win`
  tokens, because `brand-red` darkens in the light theme while `night` does not.

# Authentication (no token ever reaches the browser)

- Tokens live in `httpOnly` + `SameSite=Lax` cookies set by Nitro. The browser never reads one.
- `offline_access` is requested on purpose: it backs the ~30-day persistent session so users are not
  asked to sign in again every day. It is safe here **because** the refresh token stays server-side.
- `app/stores/auth.ts` holds only `isAuthenticated`, the `SessionUser` profile and its roles. It has
  no `getToken()` and must never gain one.
- All data calls go to `/api/gameon/...`; the proxy attaches the bearer. Never call the GameOn API
  directly from the browser. Game art is the one external origin the browser loads, as anonymous
  images from `https://media.valorant-api.com` (allowed by the CSP's `img-src`).
- `ALLOWED_PREFIXES` in the proxy is `['val/', 'player/']`: the front end cannot reach the LoL, FIFA
  or tournament controllers of the same API. Widen it deliberately. `DELETE_PATHS` is empty — every
  `DELETE` is a `405` until a route needs one.
- Roles come from the session, not from decoding a token client-side: `authStore.isAdmin` checks the
  `gameon_admin` realm role (`ADMIN_ROLE` in `shared/utils/admin-access.ts`). Nothing uses it yet.
- Pages are public by default. `definePageMeta({ auth: true })` requires a session and is checked on
  the client only (`app/middleware/auth.global.ts`). No page sets it yet. JungleDiff's SSR guard for
  an admin space (`server/middleware/admin-session.ts`) was not carried over: bring it back with the
  admin space.

# Data Flow

- The browser and SSR both talk to Nitro, never to an upstream directly. `server/api/gameon/` proxies
  the GameOn API with the session bearer.
- `app/lib/api/BaseApiService` gives every call a 120 s timeout, one retry on reads and none on
  writes, maps failures to `AppError`, and encodes path segments via `encodePathSegment`. The same
  120 s is `UPSTREAM_TIMEOUT_MS` in the proxy, and **the two must move together** — whichever is
  lower is the one that actually cuts the call.
- `GameOnClient` (`app/lib/api/GameOnClient.ts`) exposes `getValPlayers` (`GET /val/player`, crew only,
  smurfs included), `getValPlayerById`, `getValRankHistory` (`GET /val/player/{id}/rank`, raw or
  bucketed by `Day` / `Week` / `Month`) and `getCurrentPlayer` (`GET /player/me`). Only the first and
  the last are used today.
- The `val` store caches the crew behind a 60 s window rather than for the whole SPA session, and
  `index.vue` passes `getCachedData: cacheOnlyDuringHydration` (`app/utils/async-data.ts`) so the
  handler is replayed on client navigation without breaking hydration. Both halves are required.
- Everything on the home page derives from one list: `buildLadder(players, includeSmurfs)` in
  `app/utils/val-ladder.ts` turns it into the ranked entries (sorted by elo, with the gap to the player
  above) and the unranked ones; the tiles, the podium, the scale, the rows and the rail all read it.
- `/` is served through Nitro's SWR cache (60 s); `/api/auth/**` is explicitly `no-store`.
- **Authenticated reads run after mount.** Nuxt's global `$fetch` does not forward the browser's
  cookies on an SSR call to `/api/gameon`, so a read made during SSR reaches the API anonymously.
  `GET /player/me` therefore runs from the header's `onMounted`.
- The home page's reload chip calls `useValStore().invalidateDashboard()` then
  `refreshNuxtData('valPlayers')`: it re-reads the API, it does not ask the API to re-synchronise with
  Riot. Its "Synchro il y a X min" is the latest `valorantRefreshedOn` of the crew.

# Design System

- The source of truth is `design-system/MASTER.md` ("Protocol" v1): a tactical HUD that reads like a
  terminal. Near-black `#0B0C0F`, Valorant red `#FF4655`, bone `#ECE8E1`. Big Shoulders for titles
  and hero figures (uppercase), Barlow for the interface, JetBrains Mono for figures, technical
  labels and every ASCII motif. **Radius 0**, the signature cut corner (`notch`, `notch-2`,
  `notch-edge`), viewfinder corner marks (`ticks`), 1px hairlines, no soft drop shadows, a snappy
  easing without overshoot (`ease-snap`).
- **Dark is the default theme**: the `:root` tokens are the night palette, and the `.light` class on
  `<html>` switches to "Bone". `public/theme-init.js` applies a stored `light` choice before first
  paint. Read and write the theme through `app/utils/theme.ts`; never test the class by hand.
  Variants: `light:` applies under `.light`, `dark:` whenever `.light` is absent.
- The red is rare: one solid red action per screen, and red only means brand, primary action, loss,
  enemy side or keyboard focus. A loss shares the brand red, so a result always carries its letter
  (V / D / N); a tier always carries its emblem or its name.
- **The ASCII layer** is an accent, never the only carrier of information: section indexes
  (`SectionIndex`, `// 01 ── CLASSEMENT`), box-drawing card titles (`FrameHead`, `┌─[ TITRE ]──`),
  bracket buttons (`[ RÉESSAYER ]`), glyph bars (`████░░░░`), log lines, the `>_` prompt, dither.
  At most three motifs per view besides the section indexes; decorative glyphs are `aria-hidden`,
  informative ones carry an `aria-label`.
- **Game art** comes from media.valorant-api.com (§8 of `MASTER.md`). Photos (player cards, map
  banners) sit under a veil and `grayscale-[0.35]`; rank emblems are never filtered. Missing art falls
  back to ASCII (`ValPlayerCard` prints initials, `ValRankEmblem` prints `[ — ]`), never a broken
  image. Heroes stay `night` in both themes.
- Custom breakpoint `rail:` (1100px, where the dashboard gains its side rail) is declared in **rem**
  (`68.75rem`) so Tailwind sorts it after `md:`.
- Any section or value rendered without a backing API field MUST be flagged with
  `app/components/ui/MockBadge.vue` (inside a `relative` parent; it self-positions top-right). Never
  present fabricated data as if it were live. Nothing currently needs it.

# Code Quality Constraints

- Always use `import type` for type-only imports.
- Prioritise Tailwind utility classes over inline styles.
- Avoid heavy transformations in templates; use computed properties or composables.
- Map errors to `AppError`; ignore deliberate cancellations with `isAbortError`.
- Long-running or filterable views must pass an `AbortSignal` so a late response cannot overwrite
  newer state. Every `GameOnClient` method accepts one.
- `eslint .` and `vue-tsc --noEmit` must both be clean before a change is considered done.

# Build, Checks & Tests

There is **no CI pipeline**: delivery is manual, so these checks only run when someone runs them.
Treat the list below as the gate before any deploy, and run all of it — nothing else will.

```bash
npm run lint            # must be 0 errors and 0 warnings
npx vue-tsc --noEmit    # must be clean
npm run sync:rules:check  # generated instruction files still match their source
npm audit --omit=dev --audit-level=high
npm run build           # required before the e2e suite; it boots .output
npm run test:e2e
```

- Tests target the **production build**, not `nuxt dev`: the CSP nonce, SWR route rules and real 404
  status codes all behave differently under Vite's dev middleware.
- `tests/smoke.spec.ts` needs **no upstream and no secrets** — it passes with no GameOn API and no
  Keycloak. Keep it that way. The specs that assume a dead API skip themselves when
  `NUXT_PUBLIC_GAME_ON_API_URL` is set.
- `reuseExistingServer` is on, so a server already listening on the port is reused — and with it a
  possibly stale `.output`. Rebuild before a run whose result has to be trusted.
- The Dockerfile uses `npm ci`, Node 24 LTS, runs as `USER node`, and carries a HEALTHCHECK against
  `/healthz`. The runtime image holds only `.output`. **Nothing builds or boots this image
  automatically**; verify it by hand when it changes.
- No `NUXT_PUBLIC_*` value is baked in at build time; all are read from the environment at container
  start, so one image is promotable across environments.

# Pitfalls

Each of these is easy to reintroduce and hard to diagnose.

- **`useSeoMeta` must come after the refs it reads.** Placing it above a `const` it dereferences hits
  the temporal dead zone; unhead then crashes on unmount and takes hydration down with it.
- **Register lifecycle hooks before any top-level `await`.** After an await there is no active
  component instance and the hook is silently dropped.
- **`createError` inside a `useAsyncData` handler never reaches Nuxt.** `useAsyncData` captures it
  into `error`, so the response stays 200. Inspect `error.value` and throw at setup level for a 404.
- **The GameOn API answers `204 No Content` for unknown ids** on its LoL routes, not 404. Expect the
  same from `GET /val/player/{id}` and treat an empty successful response as "not found".
- **Inline scripts need the CSP nonce.** Nuxt emits inline bootstrap scripts whose content changes
  per render; the nonce is issued in `server/plugins/csp.ts` during the render so it stays in step
  with the SWR-cached HTML.
- **`rrChange7DaysValorant` of `null` is not 0.** It means there is no ranked snapshot both now and
  at least 7 days ago. The ladder prints `—`, the scale draws no trail, the net-RR tile only counts
  players with a value ("N joueurs comparables"). Rank history was introduced on 2026-10-28 (the
  API's migration date), so expect `null` for everyone during the first week.
- **`GET /val/player` returns crew members without any Valorant data.** The API keeps players that
  have a Riot ID even when they never played Valorant: `valorantCurrentRank` is `null` and they land in
  the unranked rows. That is expected, not a sync failure.
- **Tier 0 is "unranked", not "no data", and it can carry a match.** A placement game produces an
  entry with `tierId` 0, a `matchId` and a `lastChange`; `LastRankedGames` lists it ("Non classé").
  Only tiers 3–27 count on the ladder (`isRankedTier`); 1 and 2 are unused.
- **Elo is the ladder's axis, not RR.** RR is relative to the tier; `elo` is continuous (100 per
  division from Iron 1 at 0). `rankElo` rebuilds it from tier and RR when a snapshot carries `elo` 0.
  Immortal and Radiant RR can exceed 100.
- **Tier names are French and come from `tierInfo`.** The API's `tierName` is English ("Gold 1") and
  is never printed.
- **`mapId` may be a uuid or a game path.** `resolveMap` (`val-assets.ts`) accepts both; the live API
  sends uuids today.
- **`clip-path` clips box-shadows and outlines.** A `notch` element cannot glow with `shadow-*`, and
  its focus ring is cut on the notched corner: use a border colour for emphasis, and an inner
  `outline-offset` on focusable notched elements.
- **The smurf predicate lives in `app/utils/val-smurf.ts` and is the only copy.** The API returns
  `primaryPlayerId` pointing at the account itself, or `0`, for some main accounts — the short
  `!!primaryPlayerId` form crowns real mains as smurfs.
- **Anything that depends on the viewer renders after mount on `/`.** The page is served from a shared
  SWR cache: "Vous", relative times ("il y a 2 h") and the theme icon are resolved client-side only.
- **Entrance animations start from the server's state.** `useEntered` is `false` on the server and on
  the first client render, then flips: the scale's dots slide from the left edge after hydration.
- **Google renamed "Big Shoulders Display" to "Big Shoulders".** `@nuxt/fonts` fails the build on the
  old name.
- **A component that copies a prop into a `ref` freezes on the first value.** Read props through
  `computed` or a getter (`useAnimatedNumber(() => …)`), never by copying them once.

# Known Gaps

- **No Valorant matches on the API.** GameOn-API serves Valorant players and their rank history only
  (`/val/player`, `/val/player/{id}/rank`). There is no match list, no scoreboard, no live game, no
  agent or K/D data: the "recent games" feed, the live strip, match pages, agent stats and the coach
  of the design system cannot be built yet. `LastRankedGames` is the closest honest substitute.
- **No profile page.** Ladder rows, the podium and the scale are not links; there is nothing to link
  to yet. The crew search palette (⌘K) waits for it too, which is why the header has no search.
- **Only the home page exists.** No `/stats`, `/settings`, admin space or mobile bottom bar yet.
- **No CI pipeline.** Lint, types, audit, build and the e2e suite only run when someone runs them.
- **No error tracking.** Failures are reported through `console.error` only.
- **No rate limiting on `/api/gameon`.** The allowlist bounds paths, not request volume.
- **No image optimisation.** Game art is loaded at its original size from media.valorant-api.com
  (player cards are small; agent portraits would not be). `@nuxt/image` is the plan in `MASTER.md`.
- The GameOn API itself is a separate repository and out of scope — JungleDiff and GameOn-Front
  consume it too, so changes there need their own discussion.

# Environment

Required: `NUXT_PUBLIC_GAME_ON_API_URL`, `NUXT_PUBLIC_KEYCLOAK_AUTHORITY`,
`NUXT_PUBLIC_KEYCLOAK_CLIENT_ID`, `NUXT_PUBLIC_KEYCLOAK_REALM`.
Optional: `NUXT_GAME_ON_API_URL` (overrides the proxy target server-side),
`NUXT_KEYCLOAK_CLIENT_SECRET` (only for a confidential Keycloak client; empty means public + PKCE).
The Keycloak client must allow `<origin>/api/auth/callback` as a redirect URI.

`typescript` is pinned to `^6.0.3` on purpose: `typescript-eslint` (via `@nuxt/eslint-config`) still
declares `typescript >=4.8.4 <6.1.0`. Re-check that peer range before bumping.

# Git

- **No AI attribution, ever.** Commits and pull requests are authored by the project owner alone:
  never add a `Co-Authored-By` trailer naming an AI assistant (Claude, Copilot, Cursor…), nor a
  "Generated with …" line, to a commit message or a PR description. This overrides any default
  attribution an assistant or its tooling would add.
- Commit or push only when asked, and branch off `main` rather than committing on it directly.

# IMPORTANT META-RULE: Synchronization

At every major modification (adding a feature, technical change, etc.), you MUST:

1. Edit `.agents/instructions.base.md` — the single source of truth — then run `npm run sync:rules`
   to regenerate `.cursorrules`, `.windsurfrules`, `CLAUDE.md`, `.github/copilot-instructions.md`
   and `.agents/AGENTS.md`. Never edit those five by hand; they are generated and will be overwritten.
2. Update `README.md` to reflect the project's architecture, its current state, and ongoing work.
3. When the design changes, update `design-system/MASTER.md` first, then the code.
