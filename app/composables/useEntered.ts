import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Flips to `true` shortly after mount, to drive entrance transitions (bars growing, dots sliding in).
 *
 * `false` on the server and on the first client render alike, so hydration matches; the transition
 * then plays from the state the server painted.
 */
export function useEntered(delayMs = 120) {
  const entered = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  onMounted(() => {
    timer = setTimeout(() => { entered.value = true }, delayMs)
  })
  onBeforeUnmount(() => clearTimeout(timer))

  return entered
}
