import { defineEventHandler, setResponseHeader } from 'h3'

/**
 * Liveness probe for the orchestrator and the Docker HEALTHCHECK.
 *
 * Deliberately dependency-free: it answers "this process is serving traffic", not "all my
 * dependencies are healthy". A probe that called the GameOn API would restart PeekDiff on every
 * backend incident, which makes the outage worse rather than fixing it.
 */
export default defineEventHandler((event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  return {
    status: 'ok',
    version: useRuntimeConfig().public.appVersion,
    uptime: Math.round(process.uptime())
  }
})
