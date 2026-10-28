import { randomBytes } from 'node:crypto'
import { setResponseHeader } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'
import { documentCsp } from '../utils/csp'

/** Adds the nonce to inline `<script>` tags only — those with a `src` are already covered by 'self'. */
const addNonce = (fragment: string, nonce: string): string =>
  fragment.replace(/<script(?![^>]*\bsrc=)/g, `<script nonce="${nonce}"`)

/**
 * Issues a per-render CSP nonce and stamps it on Nuxt's inline bootstrap scripts.
 *
 * The header is deliberately set here, inside the render, rather than in the global middleware:
 * `/` and `/stats` are served through Nitro's SWR cache, which stores the response headers along
 * with the HTML. Setting it here keeps the cached nonce and the cached header in step — a nonce
 * regenerated per request by a middleware would never match the cached markup, and every cache hit
 * would break hydration.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const nonce = randomBytes(16).toString('base64')
    const { public: { gameOnApiUrl } } = useRuntimeConfig(event)

    setResponseHeader(event, 'content-security-policy', documentCsp(nonce, gameOnApiUrl))

    for (const section of ['head', 'bodyPrepend', 'body', 'bodyAppend'] as const) {
      html[section] = html[section].map(fragment => addNonce(fragment, nonce))
    }
  })
})
