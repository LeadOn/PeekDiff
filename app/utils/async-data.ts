import type { NuxtApp } from '#app'

/**
 * `getCachedData` to pass to `useAsyncData` for data that must stay fresh.
 *
 * By default Nuxt reuses whatever is already associated with the key and never replays the handler
 * on client-side navigation: coming back to the home page from a player profile re-displayed the
 * ranks from the very first load until the next hard refresh. Here the payload is only reused
 * during hydration — otherwise the handler would start from scratch, `status` would flip back to
 * `pending` and the client render would diverge from the server HTML — and the handler is allowed
 * to replay afterwards. It is then up to the store to decide whether the data really needs
 * re-fetching (freshness window).
 */
export const cacheOnlyDuringHydration = (key: string, nuxtApp: NuxtApp) =>
  nuxtApp.isHydrating ? nuxtApp.payload.data[key] : undefined
