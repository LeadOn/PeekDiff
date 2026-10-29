<!-- Generated from .agents/instructions.base.md by `npm run sync:rules`. Do not edit by hand. -->

You are assisting with PeekDiff, a Valorant stats tracker for a closed group of players ("the
crew"). It is the Valorant counterpart of JungleDiff (League of Legends) and shares its architecture:
it reads player and rank data from the GameOn API, renders game art from media.valorant-api.com, and
presents the crew's ladder. The interface is French; there is no public sign-up — authentication
exists so a crew member is recognised ("Vous") and can edit their own profile.

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

Five pages so far: the crew dashboard, the crew records, player profiles, match pages and settings.
An admin space is a JungleDiff feature PeekDiff does not have yet (see Known Gaps).

- `/` — crew dashboard, built from the "Protocol" design system. Top to bottom: status chips (the
  reload chip with "Synchro il y a X min", "7 derniers jours", the current act), the week
  (`WeekActivity`, from `GET /val/home?window=Last7Days`: ranked games against the 7 days before, win
  rate with an ASCII bar, net RR and active players, playtime, then "Jour par jour", a stacked
  win / loss bar and the net RR of each day), then two columns — `CrewLadder` (a podium of three over
  each player's `wideart` card, "L'échelle des rangs" (`RankTrack`) on the elo axis with a 7-day
  trail, the remaining rows) beside a rail: `PlayerOfTheWeek` (the API's fact of the week, over the
  player's `largeart`, with their games and longest win streak), `CrewFeed` (the crew's last 6 games
  from `GET /val/match/last`, each told from the side with the most crew members and opening its
  match page) and `PeakRecords` (all-time peaks). Last, "Records du mois" (`CrewRecords`: the crew's
  awards over 30 days of competitive, each linking to its player and, for a single-game record, its
  match; then `CrewAgents` and `ValMapList` for the most played agents and maps), with a
  `[ Tous les records ]` link to `/stats`. Every player name links to their profile.
- **Rank-only fallback** — when `/val/home` or `/val/match/last` fails (an API build older than the
  match history, which is production today), the page keeps the rank tiles (`WeekBento`: ranked
  players, net RR over 7 days from `rrChange7DaysValorant`, best current rank, best peak), a player of
  the week derived from the same field, and `LastRankedGames` (read off `valorantCurrentRank`), and
  drops the records. Only a failing `GET /val/player` shows "L'API ne répond pas".
- `/player/[id]` — a player's profile, JungleDiff's `/summoner/[id]` rebuilt in Protocol.
  `ProfileHero` (the `wideart` card under the night veil, the main agent's `fullportrait`, current and
  peak ranks, the last ranked results, smurf links, and a red "Synchroniser" for signed-in users that
  calls `PATCH /val/player/{id}`), then "Performances" (`ProfileKpis`: games and win rate, ACS / ADR,
  K/D / KDA, headshots, KAST, rating, first duels, playtime) filtered by period (7 j · 30 j · 3 mois ·
  Tout), queue (Toutes · Compétition · Non classée · Vélocité) and agent, then two columns —
  "Dernières parties" (`ValMatchRow` grouped by Paris day with the day's record and net RR, 10 per
  page) beside a rail: `ProfileRankProgress` (the elo curve of the period and the RR of each ranked
  game), `ProfileAgents`, `ValMapList`, `ProfileDuos`. Filters live in the query string
  (`?period=7j&queue=competitive&agent=Jett`). The period does not restrict the history; the queue
  and the agent do. The agent filter is picked from `ProfileAgents` (a row toggles it) and shown as a
  removable chip beside the switches; it restricts the tiles, the maps, the duos and the history,
  never the rank progression (a rank is the account's, not an agent's). A crew member with no
  `valorantPuuid` gets a notice instead of the stats. Each history row opens its match page.
- `/match/[id]` — one game, told from one side: "Alliés" (teal) is the team of the player in
  `?player=` (the profile's links set it), else the viewer's once mounted if they played it, else the
  side with the most crew members. `MatchHero` (the map's splash under the night veil, the score from
  the allies' side with V/D/N, the followed player's agent portrait and line), then "Tableau des
  scores" (`MatchScoreboard`, one table per team sorted by ACS: ACS, K, D, A, +/−, ADR, HS, KAST,
  PK, PM; the followed player on `surface-selected` with the red rule; crew members link to their
  profile), then "Manche par manche" (`MatchTimeline`: the round frieze, glyph of the round's end in
  the winning side's colour, a separator at half time and at overtime, a dot on rounds with a
  ceremony; selecting a round shows its plant / defuse and its kill feed). The game is rendered on
  the server; rounds and kills (`/rounds`) load after mount. A non-uuid id is a 404 without calling
  the API.
- `/stats` — "Records du crew", the home page's records with filters, from `GET /val/stats/global`:
  period (7 j · 30 j · 3 mois · 6 mois · Tout, `RECORDS_PERIODS` in `val-period.ts`), queue
  (Compétition · Toutes, the API's `rankedOnly`) and a smurf switch, off by default. The defaults are
  the home page's (competitive, 30 days, no smurfs) and only a departure reaches the query string
  (`?period=3m&queue=all&smurfs=1`). `CrewRecords` (worded from the period's phrase), then "Agents et
  cartes" (`CrewAgents`, `ValMapList`). Rendered on the server; a filter change re-runs the
  `useAsyncData` handler, the previous answer dimmed meanwhile. An API answering 404 (a build older
  than 2026-10-29) shows "Records indisponibles", not an outage. Linked from the header ("Records"),
  the palette and the home page; not from the mobile bar, which keeps its four entries.
- `/settings` — `auth: true`. The signed-in user's name, nickname and Riot ID (`PATCH /player/me`),
  links to their profile and a sign-out. No profile picture upload: PeekDiff shows the Valorant player
  card, never `profilePictureUrl`.
- **Smurf toggle** — page state in `index.vue`, off by default. It filters the ladder (and the rank
  fallbacks) in place — the store always keeps every account — and re-queries `/val/home` and
  `/val/match/last` with `includeSmurfs`.
- **Crew search** — `ValPlayerPalette`, mounted once by the layout and opened from the header's
  `>_ chercher un joueur ⌘K` button (from `md:`), the mobile bar, ⌘K / Ctrl K or "/". It matches
  Riot ID, nickname and full name locally (`filterPlayersByName` in `app/utils/val-search.ts`: the API
  has no search by name) against the crew list, smurfs included, in ladder order, then offers "Classement
  du crew", "Records du crew", "Mon profil" and "Paramètres". A combobox: arrows move, Enter opens, Escape and any
  navigation close it, Tab stays in the input, focus returns to the opener. Its open state is
  `useSearchPalette` (`useState`), shared by the three openers.
- **Mobile bar** — `AppBottomBar`, below `md` only: Crew (`/`), Parties (`/#parties`, the home page's
  crew feed — or its rank-only fallback — which carries that id), Recherche (the palette) and Profil
  (the viewer's profile, `/settings` until `/player/me` answers, "Connexion" when anonymous; resolved
  after mount). The footer pads its bottom on phones to clear it. The header's search button is hidden
  on phones.
- **Theme** — dark by default, "Bone" (light) through the header toggle.
- **Sign-in** — the header's "Se connecter" starts the OIDC flow; signed in, the header shows the
  player's card (a link to their profile, or to `/settings` until `/player/me` answers), a settings
  button and a sign-out button (hidden on phones, where `/settings` carries it), and the ladder and
  the profile mark the viewer "Vous".
- **Silent single sign-on** — a visitor already signed in to JungleDiff (same realm, same client) is
  signed in here without a click, through one `prompt=none` round trip to Keycloak after mount.

# Directory Layout

- `app/pages/` — orchestrate data loading with `useAsyncData` and own the page layout.
- `app/components/ui/` — generic, domain-free UI (`AppHeader`, `AppBottomBar`, `SectionIndex`,
  `FrameHead`, `SegmentSwitch`, `MockBadge`).
- `app/components/home/` — the home page's business components.
- `app/components/profile/` — the profile page's business components (`Profile*`).
- `app/components/match/` — the match page's business components (`Match*`).
- `app/components/val/` — components representing a Valorant entity (`ValRankEmblem`,
  `ValPlayerCard`, `ValAgentIcon`, `ValRoleChip`, `ValMatchRow`, `ValMapList`, `ValPlayerPalette`),
  reused across pages.
- `app/composables/` — reusable logic and API client injection.
- `app/stores/` — Pinia setup stores.
- `app/lib/api/` — typed HTTP clients built on `BaseApiService`.
- `app/lib/types/` — domain interfaces, re-exported through `app/lib/types/index.ts`.
- `app/utils/` — pure helpers.
- `shared/types/` — contracts used by both Nitro and the app, imported via `#shared`.
- `shared/utils/` — logic both sides run, imported explicitly via `#shared/utils/...`
  (`admin-access.ts`: `ADMIN_ROLE`; `sso-probe.ts`: `SSO_PROBE_TTL_MS`).
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
  `val-ladder.ts`, `val-assets.ts`, `val-smurf.ts`, `val-match.ts`, `val-game.ts`, `val-period.ts`,
  `val-search.ts`, `val-agents.ts`).
  Generic ones do not (`theme.ts`, `date.ts`, `ascii.ts`).
  Despite `app/utils/` being auto-imported, the codebase **imports these explicitly** — match that.
- **Types**: Valorant domain types are prefixed `Val` and API payload shapes end in `Dto`
  (`ValPlayerDto`, `ValRankHistoryDto`, `ValGameDto`); a payload that is not Valorant-specific drops
  the prefix (`PlayerUpdateDto`).
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
  `gameon_admin` realm role (`ADMIN_ROLE` in `shared/utils/admin-access.ts`). Only `/settings` reads
  it, to print "administrateur".
- Pages are public by default. `definePageMeta({ auth: true })` requires a session and is checked on
  the client only (`app/middleware/auth.global.ts`); `/settings` sets it. JungleDiff's SSR guard for
  an admin space (`server/middleware/admin-session.ts`) was not carried over: bring it back with the
  admin space.
- Session cookies are prefixed `pd_` (`server/utils/session.ts`); JungleDiff's are `jd_`. Cookies
  ignore ports, so both apps share `localhost` in development: identical names would make each
  overwrite the other's session. The id token (`pd_idt`) is scoped to `/api/auth` — only the
  sign-out reads it.
- **Silent single sign-on.** Once the app is mounted (`app/plugins/auth.client.ts`), an anonymous
  visitor is sent once to `/api/auth/login?silent=1&redirect=<path>` (`authStore.trySilentSignIn`).
  The login route sets the httpOnly marker `pd_sso_probe` (6 h, `SSO_PROBE_TTL_MS` in
  `shared/utils/sso-probe.ts`) **before** anything can fail, then redirects to Keycloak with
  `prompt=none`. Keycloak either signs the user in from its SSO session (opened by JungleDiff) or
  answers `login_required` / `consent_required` / `interaction_required`, which the callback treats
  as "stay anonymous": back to the original path, no `?auth_error=`. Any failure of a silent flow —
  Keycloak unreachable included — ends the same way. The client learns the marker from
  `GET /api/auth/session` (`ssoProbed`), never by reading the cookie. A `sessionStorage` timestamp
  breaks the loop for browsers that drop cookies; crawlers and cookie-less browsers are skipped.
- It is a top-level redirect on purpose, not an iframe `check-sso`: Safari's ITP and third-party
  cookie blocking keep Keycloak's session cookie out of a cross-site iframe. A shared parent-domain
  cookie was rejected too: it would expose the refresh token to every subdomain and race on
  refresh-token rotation.
- Sign-out (`logout.post.ts`) clears the cookies, sets the probe marker (otherwise the next page load
  could sign the user straight back in), revokes the refresh token at the realm's
  `revocation_endpoint` (RFC 7009 — the offline session would otherwise outlive the cookie), and
  passes `id_token_hint` to the end-session URL so Keycloak does not ask for confirmation.
- Silent SSO only works while Keycloak's **own SSO session** lives, not the apps' 30-day offline
  sessions: refreshing an offline token does not keep the SSO session alive. The realm settings it
  depends on are listed under Environment.

# Data Flow

- The browser and SSR both talk to Nitro, never to an upstream directly. `server/api/gameon/` proxies
  the GameOn API with the session bearer.
- `app/lib/api/BaseApiService` gives every call a 120 s timeout, one retry on reads and none on
  writes, maps failures to `AppError`, and encodes path segments via `encodePathSegment`. The same
  120 s is `UPSTREAM_TIMEOUT_MS` in the proxy, and **the two must move together** — whichever is
  lower is the one that actually cuts the call.
- `GameOnClient` (`app/lib/api/GameOnClient.ts`) exposes `getValPlayers` (`GET /val/player`, crew only,
  smurfs included), `getValPlayerById` (`GET /val/player/{id}?period=&queues=`, with the performance
  recap, smurfs and main agent), `refreshValPlayer` (`PATCH /val/player/{id}`, a Riot re-sync that also
  imports the last 10 games), `getValRankHistory` (`GET /val/player/{id}/rank`, raw or bucketed by
  `Day` / `Week` / `Month`), `getValPlayerMatches` (`GET /val/match/player/{id}`, paginated games with
  their ten participants), `getValMatch` (`GET /val/match/{id}`), `getValMatchTimeline`
  (`GET /val/match/{id}/rounds`, rounds and kills), `getCurrentPlayer` (`GET /player/me`) and
  `updateCurrentPlayer` (`PATCH /player/me`), plus `getValHome` (`GET /val/home`) and
  `getValLastMatches` (`GET /val/match/last`) for the home page, and `getValGlobalStats`
  (`GET /val/stats/global?period=&rankedOnly=&includeSmurfs=`) for `/stats`. The home page does not
  call the latter: `/val/home` embeds its 30-day competitive answer as `crewRecords`.
- The `val` store caches the crew, the home recap and the crew feed behind a 60 s window rather than
  for the whole SPA session, and `index.vue` passes `getCachedData: cacheOnlyDuringHydration`
  (`app/utils/async-data.ts`) so the handlers are replayed on client navigation without breaking
  hydration. Both halves are required. The recap and the feed also remember the `includeSmurfs` they
  were loaded with: the clock alone would serve the other flag's answer after a toggle. The page runs
  the three `useAsyncData` calls through one `Promise.all` (awaited one by one, the SSR pass pays for
  each in turn) and passes their `signal` down, and `watch: [includeSmurfs]` re-runs the two
  smurf-dependent ones.
- The ladder derives from one list: `buildLadder(players, includeSmurfs)` in
  `app/utils/val-ladder.ts` turns it into the ranked entries (sorted by elo, with the gap to the player
  above) and the unranked ones; the podium, the scale, the rows, the rank fallbacks and the player of
  the week's card (looked up there by id, for the card art and rank) all read it.
- The profile loads the player (with the recap for the URL's filters) through `useAsyncData` during
  SSR, and everything else after mount behind an `AbortController` that a filter change restarts:
  rank history (bucketed for the curve, raw for the per-game bars), the first page of games, and the
  crew list (its own controller) to name a smurf's main. A filter change re-reads the player and
  reassigns `data` — `useAsyncData` data is a shallow ref, so mutating a nested field is not seen.
  Filtered on an agent, the recap lists that agent alone: the page keeps the unfiltered agent list in
  `agentOptions` — snapshotted from the recap when an agent is picked, re-read (same period and queue,
  no agent) when the page opens filtered or the period or queue changes — so every agent stays
  pickable.
  `buildGameLine(game, playerId)` in `app/utils/val-match.ts` turns a game into what the row shows,
  seen from that player; `groupGamesByDay` groups the lines by Paris day. On the match page,
  `app/utils/val-game.ts` does the same for the whole game: `resolvePerspective` picks the allies,
  `buildScoreboard`, `buildRounds` and `buildRoundDetail` read everything off it.
- `/` and `/stats` are served through Nitro's SWR cache (60 s; each `/stats` query string is its own
  entry); `/settings` and `/api/auth/**` are explicitly
  `no-store`. Profiles are not cached: their filters live in the query string and a sync must show at
  once.
- **Authenticated reads run after mount.** Nuxt's global `$fetch` does not forward the browser's
  cookies on an SSR call to `/api/gameon`, so a read made during SSR reaches the API anonymously.
  `GET /player/me` therefore runs from the header's `onMounted`, and `/settings` loads its form there
  too.
- The home page's reload chip calls `useValStore().invalidateDashboard()` then
  `refreshNuxtData(['valPlayers', 'valHome', 'valLastMatches'])`: it re-reads the API, it does not ask
  the API to re-synchronise with Riot. Its "Synchro il y a X min" is the latest `valorantRefreshedOn` of the crew.

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
- **Unknown ids: 204 on the LoL routes, 404 on the Valorant ones.** `GET /val/player/{id}` answers
  404 for an unknown player, and the profile turns it into a real 404 page; an empty successful
  response is treated as "not found" too, as on JungleDiff.
- **`GET /val/match/player/{id}` answers 404 for a crew member without a `valorantPuuid`.** It is "no
  games", not a failure: the profile shows the empty history and logs nothing. The first call for an
  account with no stored game also synchronises its last 10 games from HenrikDev before answering, so
  it can take seconds.
- **`aceParticipantId` is the losing team's best rating, not a five-kill round.** The profile prints
  it "MVP équipe" (`mvp-team`); `mvpParticipantId` is the winning team's best ("MVP", `mvp`). Both are
  `null` on a draw or a remake. A remake (3 rounds or fewer) is result "R", counted in no stat.
- **Rounds are numbered from 0 by the API.** `roundNumber` 0 is "Manche 1"; kills carry the same
  0-based number. A round's `result` is empty when the timer ran out (◷). Half time is not hard-coded
  at 12: `buildRounds` places it where the teams first swap sides, read off `winningTeam` and
  `winningTeamRole`, so Swiftplay's 4-round halves come out right.
- **The crew records' `detail` is English.** "16.1% headshots (69 of 428 shots…)" is never printed:
  `CrewRecords` words each award from its `value`. A streak award of 1 is hidden — the API hands one
  out to anybody who won or lost a single game.
- **A day can show net RR without games.** `/val/home` sums RR from the rank history, games from the
  stored matches; a ranked game older than the account's stored ones moves the day's RR without adding
  to its games. Print both as they come.
- **Kills carry no headshot flag.** The design system's `◎` cannot be drawn in the kill feed; the
  per-player HS % comes from the participant stats. A kill whose `weaponType` is "Bomb" is the spike.
- **Rank history buckets can be too coarse to draw.** A month of history read by `Month` is a single
  point: `ProfileRankProgress` falls back to the raw entries when the buckets give fewer than three.
  The API's `days` only applies to buckets, so the profile filters raw entries to the period itself.
- **`agentName` is matched exactly by the API.** It compares the stored English name ("Jett",
  "KAY/O") case-sensitively: always send a name read from an agent list, never a typed or lowercased
  one. `?agent=` accepts any plausible name; an unknown one simply yields empty tiles and history.
- **The Valorant fields added with the match history are optional in `ValPlayerDto`.** An API build
  older than 2026-10-29 does not send `recentFormValorant`, `mainAgent*`, `smurfAccounts` or
  `valorantPerformanceStats`, nor serve `/val/match/...`: the profile then shows empty tiles and an
  empty history instead of failing. Keep them optional until every environment runs the new API.
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
- **An agent's role comes from `agentRole` (`val-agents.ts`), never from the API.** It reads the uuid
  first (given, or found in the icon URL by `agentIdFromUrl`), then the name compared without case or
  punctuation. `ValAgentIcon` draws the 2px role rule itself from its `src` and `name` — do not add a
  `border-b-*` class at the call site, it would fight the role colour; pass `:rule="false"` where the
  icon is too small for one. The role's name rides in the icon's `title` and in `ValRoleChip`: colour
  never carries it alone.
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
- **The silent sign-in probe runs on the client, after mount — never in a Nitro or route
  middleware.** `/` is served from a shared SWR cache, and crawlers keep no cookies: a server-side
  redirect would bounce them through Keycloak forever. Do not make `pd_sso_probe` readable from
  script either; `ssoProbed` on the session endpoint is how the client learns it.
- **Anything that depends on the viewer renders after mount.** `/` is served from a shared SWR cache:
  "Vous", relative times ("il y a 2 h") and the theme icon are resolved client-side only. The profile
  follows the same rule for "Vous", "Synchro il y a…" and the sync button, though it is not cached.
- **Entrance animations start from the server's state.** `useEntered` is `false` on the server and on
  the first client render, then flips: the scale's dots slide from the left edge after hydration.
- **Google renamed "Big Shoulders Display" to "Big Shoulders".** `@nuxt/fonts` fails the build on the
  old name.
- **A component that copies a prop into a `ref` freezes on the first value.** Read props through
  `computed` or a getter (`useAnimatedNumber(() => …)`), never by copying them once.

# Known Gaps

- **The match history API is not in production yet.** GameOn-API gained Valorant games, rounds,
  kills, profile stats, crew records and a home aggregate on 2026-10-29 (`/val/match/...`,
  `/val/player/{id}?period=`, `/val/stats/global`, `/val/home`), tested against a local API only. The
  production API still serves players and rank history alone, so the profile's tiles and history stay
  empty there, and the home page stays on its rank-only fallback, until it is deployed.
- **The match page has no economy and no per-kill headshots.** The API stores neither per round, so
  the design system's economy view and `◎` marks wait for it. Matches that are not in the database
  (older than a player's last synchronisations) cannot be opened: the rank history's `matchId` is
  therefore never linked.
- **Agent roles are a front-end table.** The API does not serve them: `app/utils/val-agents.ts` maps
  every playable agent (uuid and English name, from valorant-api.com) to its role, and Riot's next
  agent needs a row there. Until it gets one it is drawn with the neutral `border-strong` rule and no
  chip. The profile filters by agent, not by role: the API's `agentName` takes a single agent.
- **No admin space yet.**
- **No CI pipeline.** Lint, types, audit, build and the e2e suite only run when someone runs them.
- **No error tracking.** Failures are reported through `console.error` only.
- **No rate limiting on `/api/gameon`.** The allowlist bounds paths, not request volume.
- **No image optimisation.** Game art is loaded at its original size from media.valorant-api.com.
  Player cards and agent icons are small, but the profile hero's agent portrait is a 2048px PNG.
  `@nuxt/image` is the plan in `MASTER.md`.
- The GameOn API itself is a separate repository and out of scope — JungleDiff and GameOn-Front
  consume it too, so changes there need their own discussion.

# Environment

Required: `NUXT_PUBLIC_GAME_ON_API_URL`, `NUXT_PUBLIC_KEYCLOAK_AUTHORITY`,
`NUXT_PUBLIC_KEYCLOAK_CLIENT_ID`, `NUXT_PUBLIC_KEYCLOAK_REALM`.
Optional: `NUXT_GAME_ON_API_URL` (overrides the proxy target server-side),
`NUXT_KEYCLOAK_CLIENT_SECRET` (only for a confidential Keycloak client; empty means public + PKCE).
The Keycloak client must allow `<origin>/api/auth/callback` as a redirect URI.

Silent single sign-on depends on the realm (`gameon`) and on the client shared with JungleDiff:
- **Consent Required off** on the client, or every probe comes back `consent_required`.
- **SSO Session Idle / Max** (Realm settings → Sessions) long enough to cover the gap between visits
  to the two apps — the defaults (30 min idle, 10 h max) only help within one sitting. Alternatively
  enable **Remember Me** (Realm settings → Login) and set **SSO Session Idle / Max Remember Me**.
- Both apps' origins in the client's redirect URIs and post-logout redirect URIs.

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
