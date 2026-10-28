import { GameOnClient } from '~/lib/api/GameOnClient'

/**
 * The client targets the Nitro proxy, never the GameOn API directly: the proxy holds the session
 * cookies and sets `Authorization`. See `server/api/gameon/[...path].ts`.
 */
const GAMEON_PROXY_BASE = '/api/gameon'

let client: GameOnClient | null = null

export const useGameOnVal = (): GameOnClient => {
  // The client is stateless (no token, no per-request header), so a single shared instance is
  // enough, including under SSR where several requests share the process.
  if (!client) client = new GameOnClient(GAMEON_PROXY_BASE)
  return client
}
