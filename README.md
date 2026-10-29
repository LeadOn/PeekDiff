# PeekDiff

PeekDiff is a Valorant stats tracker for the crew — the Valorant counterpart of
JungleDiff (League of Legends), built on the same strict Nuxt 4 architecture and
the same server-side Keycloak OIDC authentication. It reads players, ranks and games from the GameOn
API and renders game art from media.valorant-api.com.

## 🚀 Technology Stack

- **Framework:** Nuxt 4.6.3 (SSR enabled, `app/` structure, Nitro server routes under `server/`)
- **Language:** TypeScript (strict mode, no `any`)
- **Styling:** Tailwind CSS v4 with the "Protocol" design system (`design-system/MASTER.md`)
- **State:** Pinia (setup stores)
- **Auth:** Keycloak OIDC, implemented server-side in Nitro — no OIDC library ships to the browser
- **Assets:** `@nuxt/fonts` (self-hosted Big Shoulders / Barlow / JetBrains Mono), `@nuxt/icon`
  (lucide)

## 📂 Architecture

### Application (`app/`)

- `app/pages/` — page components and data orchestration via `useAsyncData`: `index.vue` (the crew
  dashboard), `player/[id].vue` (a player's profile) and `settings.vue`.
- `app/components/` — split into `ui/` (generic: `AppHeader`, `SectionIndex`, `FrameHead`,
  `SegmentSwitch`, `MockBadge`), `home/` (the dashboard), `profile/` (the profile) and `val/`
  (Valorant entities: `ValRankEmblem`, `ValPlayerCard`, `ValAgentIcon`, `ValMatchRow`).
- `app/composables/` — reusable logic, including API client injection (`useGameOnVal`).
- `app/stores/` — Pinia stores: `val` (the crew, behind a 60 s freshness window), `auth` (session
  state, never a token), `player` (the signed-in player).
- `app/lib/api/` — typed HTTP services. Every call carries a 120 s timeout, retries once on reads
  only, maps failures to `AppError`, and encodes path segments. The ceiling has to stay in step with
  the proxy's own timeout.
- `app/utils/` — pure helpers. `val-ladder.ts` builds the ladder (elo order, gaps, peaks) from the
  player list; `val-tier.ts` holds the tier table, French labels and the elo axis; `val-assets.ts`
  builds media.valorant-api.com URLs; `val-smurf.ts` is the only smurf predicate; `val-match.ts`
  turns a game into a history row seen from one player and groups rows by Paris day; `val-period.ts`
  maps the profile's period switch onto the API's period and rank buckets; `ascii.ts` draws glyph
  bars; `theme.ts` is the single entry point for the theme.

### Server (`server/`)

- `server/api/auth/*` — the complete OIDC Authorization Code + PKCE flow: `login`, `callback`,
  `session`, `logout`.
- `server/api/gameon/[...path].ts` — authenticating proxy to the GameOn API. Reads the session
  cookies, attaches the bearer, and only lets `val/` and `player/` through. Every `DELETE` is a `405`.
  An upstream that never answers yields `502`, one that blows the 120 s ceiling `504`.
- `server/middleware/security-headers.ts` and `server/plugins/csp.ts` — security headers and the
  per-render CSP nonce. `img-src` allows `https://media.valorant-api.com`.
- `server/routes/healthz.get.ts` — dependency-free liveness probe for orchestrators.

### Shared (`shared/`)

Contracts used by both Nitro and the app (`SessionState`), imported via `#shared`, and
`shared/utils/admin-access.ts` (the `gameon_admin` role).

### Design system (`design-system/`)

The source of truth for every visual decision — read it before designing anything:

- `MASTER.md` — the spec of "Protocol" v1: colours, type, shapes, the ASCII language, motion,
  components, game assets, accessibility.
- `tokens.css` and `valorant-assets.ts` — reference copies of what lives in
  `app/assets/css/main.css` and `app/utils/val-assets.ts`.
- `showcase.html` — a static page showing every pattern, with real game art. Open it in a browser.

## 📐 Conventions

**Components** — PascalCase files, imported explicitly so they keep their short name. Components
representing a Valorant entity live in `val/` and are prefixed `Val`.

**Stores / composables / utils** — `app/stores/val.ts` → `useValStore`; `useGameOnVal.ts` →
`useGameOnVal`; kebab-case utils, Valorant ones prefixed `val-`, imported explicitly.

**Types** — prefixed `Val`, API payloads end in `Dto` (`ValPlayerDto`, `ValRankHistoryDto`,
`ValGameDto`).

**Server routes** — `<name>.<method>.ts`; server utils imported by relative path.

**Design tokens** — raw values on `:root` in `app/assets/css/main.css`, mapped in `@theme`. Write
`bg-surface-base`, `text-text-main`, `text-brand-red` — never a raw hex in a component. **Dark is the
default theme**; the `.light` class switches to "Bone". The custom `rail:` breakpoint (1100px) is
declared in rem so Tailwind sorts it after `md:`.

## 🎨 Design: "Protocol"

A tactical HUD that reads like a terminal. Near-black, Valorant red, bone white; tall condensed
capitals for figures; radius 0 with the signature cut corner; and an ASCII layer used as an accent —
section indexes (`// 01 ── CLASSEMENT`), box-drawing card titles (`┌─[ PICS DE RANG ]──`), bracket
buttons (`[ RÉESSAYER ]`), glyph bars (`████░░░░`). The red is rare: brand, primary action, loss,
enemy, focus. Game art is calmed under a veil so the red stays the only accent, and missing art
falls back to ASCII rather than a broken image.

## 🔑 Authentication

Tokens never reach the browser. The OIDC flow runs entirely in Nitro and stores both the access and
refresh tokens in `httpOnly` + `SameSite=Lax` cookies; the client only ever learns _whether_ it is
signed in and as whom. `offline_access` is requested deliberately — it backs the ~30-day persistent
session, and is safe because the refresh token stays server-side.

Data calls go to `/api/gameon/...` and the proxy authenticates them. Pages are public; a page can ask
for a session with `definePageMeta({ auth: true })`, checked in the browser. `/settings` does.

## ⚙️ Configuration

Copy `.env.example` to `.env`.

| Variable | Required | Purpose |
|---|---|---|
| `NUXT_PUBLIC_GAME_ON_API_URL` | yes | GameOn API base URL, target of the `/api/gameon` proxy |
| `NUXT_PUBLIC_KEYCLOAK_AUTHORITY` | yes | Keycloak realm URL |
| `NUXT_PUBLIC_KEYCLOAK_CLIENT_ID` | yes | Keycloak client id |
| `NUXT_PUBLIC_KEYCLOAK_REALM` | yes | Keycloak realm name |
| `NUXT_GAME_ON_API_URL` | no | Overrides the proxy target server-side |
| `NUXT_KEYCLOAK_CLIENT_SECRET` | no | Only for a confidential Keycloak client |

The Keycloak client must allow `<origin>/api/auth/callback` as a redirect URI.

## 📊 Current State

**Done — the home page (`/`)**, entirely on live data from `GET /val/player`:

- status chips: reload ("Synchro il y a X min"), "7 derniers jours", the current act;
- four crew tiles: ranked players, net RR over 7 days, best current rank, the crew's best peak;
- the crew ladder: podium of three over each player's card art, "L'échelle des rangs" on the elo axis
  with a 7-day trail, then every other player with rank, peak, gap and 7-day move; a smurf toggle;
- the rail: player of the week (best 7-day RR swing), the latest ranked game of each player, the
  all-time peaks;
- dark and light themes, sign-in / sign-out, "Vous" on the viewer's row; every name links to the
  player's profile.

**Done — player profiles (`/player/[id]`)**, JungleDiff's profile rebuilt in Protocol:

- a hero over the player card with the main agent's portrait, current and peak ranks, the last ranked
  results, smurf links, and "Synchroniser" for signed-in users (a Riot re-sync through the API);
- performance tiles (games and win rate, ACS / ADR, K/D / KDA, headshots, KAST, rating, first duels,
  playtime) filtered by period (7 j · 30 j · 3 mois · Tout) and queue, kept in the URL;
- the last games grouped by day with the day's record and net RR, 10 at a time;
- a rail: the elo curve over the period with the RR of each ranked game, agents, maps, duos.

**Done — settings (`/settings`)**, signed-in only: name, nickname and Riot ID.

**Not yet:** match pages, records, the admin space, the crew search palette, the mobile bottom bar,
an agent filter on the profile. The home page still reads ranks only (see below).

## 🧩 Backend Gaps

- **Not deployed yet.** The API gained Valorant games, rounds, kills, profile stats, crew records and
  a home aggregate on 2026-10-29. Production still serves players and rank history only, so the
  profile's tiles and history stay empty there until it ships; the front tolerates the older build.
  Run a local API and the `peekdiff-prod-local-api` launch configuration to see the profile filled.
- **Served but not wired:** the match page routes (`/val/match/{id}`, `/rounds`), `/val/home` and
  `/val/stats/global`. The home tiles stick to ranks and the player of the week is still derived from
  `rrChange7DaysValorant`.
- **Not served:** live games (the "en partie" strip), agent roles (the role colour under agent icons),
  economy per round.

Also: `rrChange7DaysValorant` is `null` until a player has rank snapshots 7 days apart — rank history
was introduced on 2026-10-28, so the 7-day figures fill in over the first week.

## ✅ Checks Before Deploying

There is no CI pipeline; run all of it.

```bash
npm run lint
npx vue-tsc --noEmit
npm run sync:rules:check
npm audit --omit=dev --audit-level=high
npm run build
npm run test:e2e
```

The e2e suite targets the production build and needs no upstream and no secrets.

## 🐳 Container

`Dockerfile` builds with `npm ci` on Node 24, then ships only `.output` in a runtime image running as
`USER node`, with a HEALTHCHECK on `/healthz`. Every `NUXT_PUBLIC_*` value is read at container
start, so one image is promotable across environments.

## 🤖 AI Instructions Synchronization

`.agents/instructions.base.md` is the single source of truth for AI assistants. `npm run sync:rules`
regenerates `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md` and
`.agents/AGENTS.md` from it; `npm run sync:rules:check` fails when they drift.

## Development

```bash
npm install
npm run dev
```
