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
  dashboard), `player/[id].vue` (a player's profile), `match/[id].vue` (one game) and
  `settings.vue`.
- `app/components/` — split into `ui/` (generic: `AppHeader`, `SectionIndex`, `FrameHead`,
  `SegmentSwitch`, `MockBadge`), `home/` (the dashboard), `profile/` (the profile), `match/` (the
  match page) and `val/`
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
  turns a game into a history row seen from one player and groups rows by Paris day; `val-game.ts`
  builds the match page (sides, scoreboard, round frieze, kill feed); `val-period.ts`
  maps the profile's period switch onto the API's period and rank buckets; `ascii.ts` draws glyph
  bars; `theme.ts` is the single entry point for the theme.

### Server (`server/`)

- `server/api/auth/*` — the complete OIDC Authorization Code + PKCE flow: `login` (also the silent
  `?silent=1` probe), `callback`, `session`, `logout`. Cookies are prefixed `pd_`.
- `server/api/gameon/[...path].ts` — authenticating proxy to the GameOn API. Reads the session
  cookies, attaches the bearer, and only lets `val/` and `player/` through. Every `DELETE` is a `405`.
  An upstream that never answers yields `502`, one that blows the 120 s ceiling `504`.
- `server/middleware/security-headers.ts` and `server/plugins/csp.ts` — security headers and the
  per-render CSP nonce. `img-src` allows `https://media.valorant-api.com`.
- `server/routes/healthz.get.ts` — dependency-free liveness probe for orchestrators.

### Shared (`shared/`)

Contracts used by both Nitro and the app (`SessionState`), imported via `#shared`, and
`shared/utils/admin-access.ts` (the `gameon_admin` role) and `shared/utils/sso-probe.ts` (how long
the silent sign-in waits between attempts).

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

Session cookies are prefixed `pd_` (JungleDiff uses `jd_`): cookies ignore ports, so in development
the two apps share `localhost` and would otherwise overwrite each other's session. Renaming them from
`jd_*` signed every existing PeekDiff user out once.

### Silent single sign-on with JungleDiff

PeekDiff and JungleDiff use the same Keycloak realm (`gameon`) and the same client, so a user signed
in to one is signed in to the other without clicking:

1. Once the app is mounted, an anonymous visitor who has not been probed recently is sent — a
   top-level navigation — to `/api/auth/login?silent=1&redirect=<current path>`.
2. That route sets the httpOnly marker `pd_sso_probe` (6 h) first, then redirects to Keycloak with
   `prompt=none`.
3. Keycloak either signs the user in from its SSO session (they come back signed in, on the same
   page) or answers `login_required` / `consent_required` / `interaction_required`. The callback
   treats those — and any other failure of a silent flow, Keycloak being down included — as "stay
   anonymous": back to the same page, no `?auth_error=`.
4. `GET /api/auth/session` reports `ssoProbed`, so the client does not try again until the marker
   expires. Signing out sets the marker too, revokes the refresh token at Keycloak (RFC 7009) and
   passes `id_token_hint` so Keycloak skips its "do you want to sign out?" page.

Why not the alternatives: a hidden-iframe `check-sso` is defeated by Safari's ITP and third-party
cookie blocking; a cookie shared on the parent domain would hand the refresh token to every
subdomain and race on refresh-token rotation. The probe never runs server-side: `/` is served from a
shared SWR cache, and crawlers keep no cookies, so a server redirect would loop.

**Realm settings it depends on.** The probe rides on Keycloak's own SSO session, not on the apps'
30-day offline sessions — refreshing an offline token does not keep the SSO session alive. With the
defaults (SSO Session Idle 30 min, Max 10 h) it only helps within one sitting. So:

- turn **Consent Required off** on the client, or every probe returns `consent_required`;
- raise **SSO Session Idle / SSO Session Max** (Realm settings → Sessions) to the gap you want to
  cover, or enable **Remember Me** (Realm settings → Login) and set **SSO Session Idle / Max
  Remember Me**;
- list both apps' origins in the client's redirect URIs and post-logout redirect URIs.

#### Porting it to JungleDiff

JungleDiff's auth code is identical to PeekDiff's before this change, so the port is a copy of these
files with `jd_` in place of `pd_`:

- [ ] `shared/utils/sso-probe.ts` — copy as is (`SSO_PROBE_TTL_MS`).
- [ ] `shared/types/auth.ts` — add `ssoProbed: boolean` to `SessionState`.
- [ ] `server/utils/session.ts` — keep the `jd_*` names; add `ID_TOKEN_COOKIE = 'jd_idt'` (path
  `/api/auth`), `SSO_PROBE_COOKIE = 'jd_sso_probe'`, `setIdTokenCookie` / `getIdToken`,
  `setSsoProbeCookie` / `hasSsoProbeCookie`, and the id-token deletion in `clearSessionCookies`.
- [ ] `server/utils/oidc.ts` — `revocation_endpoint` in `OidcDiscovery`, `withClientCredentials`,
  `revokeRefreshToken`.
- [ ] `server/utils/access-token.ts` — persist `id_token` on refresh.
- [ ] `server/api/auth/login.get.ts`, `callback.get.ts`, `logout.post.ts`, `session.get.ts` — copy,
  then put "JungleDiff" back in the sign-out comment.
- [ ] `app/stores/auth.ts` — `ssoProbed`, `trySilentSignIn` (rename the `sessionStorage` key to
  `jd_sso_probe_at`), `ssoProbed: true` in the two fallback `applySession` calls.
- [ ] `app/plugins/auth.client.ts` — call `trySilentSignIn` on `app:mounted`.
- [ ] `tests/smoke.spec.ts` — copy the "silent single sign-on" block with `jd_` cookies, and add
  `ssoProbed: false` to the anonymous-session assertion.
- [ ] Check JungleDiff's pages that set `definePageMeta({ auth: true })` (admin, settings): they
  still redirect interactively, which is right — the probe only matters on public pages.
- [ ] Update JungleDiff's `.agents/instructions.base.md` and README, then `npm run sync:rules`.

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

**Done — the home page (`/`)**, on live data from `GET /val/player`, `/val/home` and
`/val/match/last`:

- status chips: reload ("Synchro il y a X min"), "7 derniers jours", the current act;
- the week: ranked games against the 7 days before, win rate, net RR and active players, playtime,
  then the week day by day (wins and losses, net RR);
- the crew ladder: podium of three over each player's card art, "L'échelle des rangs" on the elo axis
  with a 7-day trail, then every other player with rank, peak, gap and 7-day move; a smurf toggle;
- the rail: player of the week (the API's best net RR, with games and win streak), the crew's last
  games (each opens its match page), the all-time peaks;
- the month's records: the crew's awards over 30 days of competitive, the most played agents and maps;
- against an API without the match history, a rank-only fallback (rank tiles, last ranked game of
  each player, no records);
- dark and light themes, sign-in / sign-out, "Vous" on the viewer's row, silent single sign-on with
  JungleDiff; every name links to the player's profile.

**Done — player profiles (`/player/[id]`)**, JungleDiff's profile rebuilt in Protocol:

- a hero over the player card with the main agent's portrait, current and peak ranks, the last ranked
  results, smurf links, and "Synchroniser" for signed-in users (a Riot re-sync through the API);
- performance tiles (games and win rate, ACS / ADR, K/D / KDA, headshots, KAST, rating, first duels,
  playtime) filtered by period (7 j · 30 j · 3 mois · Tout) and queue, kept in the URL;
- the last games grouped by day with the day's record and net RR, 10 at a time;
- a rail: the elo curve over the period with the RR of each ranked game, agents, maps, duos.

**Done — match pages (`/match/[id]`)**, opened from any row of a profile's history:

- a hero over the map's splash with the score from the followed player's side and their line;
- both scoreboards (ACS, K, D, A, +/−, ADR, HS, KAST, first kills and deaths), crew members linked;
- the round frieze (how each round ended, who won it, half time, overtime, ceremonies) and, for the
  selected round, the plant / defuse and the kill feed.

**Done — settings (`/settings`)**, signed-in only: name, nickname and Riot ID.

**Not yet:** a `/stats` page, the admin space, the crew search palette, the mobile bottom bar, an
agent filter on the profile, economy on the match page.

## 🧩 Backend Gaps

- **Not deployed yet.** The API gained Valorant games, rounds, kills, profile stats, crew records and
  a home aggregate on 2026-10-29. Production still serves players and rank history only, so the
  profile's tiles and history stay empty there and the home page keeps its rank-only fallback until it
  ships; the front tolerates the older build. Run a local API and the `peekdiff-prod-local-api` launch
  configuration to see everything filled.
- **Served but not wired:** `/val/stats/global` on its own (its filters would feed a `/stats` page;
  the home page reads the same records embedded in `/val/home`).
- **Not served:** live games (the "en partie" strip), agent roles (the role colour under agent icons),
  economy per round, headshots per kill (the kill feed's `◎`).

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
