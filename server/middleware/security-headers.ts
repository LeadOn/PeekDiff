import { defineEventHandler, getRequestHeader, setResponseHeader } from 'h3'
import { apiCsp } from '../utils/csp'

/**
 * Security headers applied to every response.
 *
 * The document CSP is *not* set here but in `server/plugins/csp.ts`, which owns the per-render
 * nonce and must stay in step with the cached HTML. This middleware covers the headers that carry
 * no per-render state, plus a deny-all CSP for API routes.
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (path.startsWith('/api/') || path === '/healthz') {
    setResponseHeader(event, 'content-security-policy', apiCsp())
  }

  setResponseHeader(event, 'x-content-type-options', 'nosniff')
  setResponseHeader(event, 'x-frame-options', 'DENY')
  setResponseHeader(event, 'referrer-policy', 'strict-origin-when-cross-origin')
  setResponseHeader(event, 'cross-origin-opener-policy', 'same-origin')
  setResponseHeader(event, 'permissions-policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')

  // HSTS only behind TLS: sending it over plain HTTP has no effect, and sending it in development
  // on localhost would pin the browser to HTTPS for every other project on the machine.
  const forwardedProto = getRequestHeader(event, 'x-forwarded-proto')?.split(',')[0]?.trim()
  const isHttps = forwardedProto ? forwardedProto === 'https' : getRequestURL(event).protocol === 'https:'
  if (isHttps) {
    setResponseHeader(event, 'strict-transport-security', 'max-age=31536000; includeSubDomains')
  }
})
