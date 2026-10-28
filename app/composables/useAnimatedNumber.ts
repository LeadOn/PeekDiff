import { onBeforeUnmount, readonly, ref, watch } from 'vue'
import type { Ref } from 'vue'

/**
 * A number that eases towards its source whenever the source changes.
 *
 * It starts on the source's value rather than on 0: the server renders the real figure, and a
 * count-up on hydration would first snap the painted number back to 0. What animates is every change
 * after that — a smurf toggle re-querying the week, for instance.
 *
 * The source is read through a getter and watched, never copied once: `home/StatCard.vue` used to
 * copy its prop into a ref and kept printing the first figure it was mounted with.
 */
export function useAnimatedNumber(source: () => number, durationMs = 900): Readonly<Ref<number>> {
  const display = ref(source())
  let frame = 0

  watch(source, (target) => {
    if (!import.meta.client) {
      display.value = target
      return
    }

    cancelAnimationFrame(frame)
    const from = display.value
    const startedAt = performance.now()

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs)
      display.value = from + (target - from) * (1 - Math.pow(1 - progress, 3))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
  })

  onBeforeUnmount(() => cancelAnimationFrame(frame))

  return readonly(display)
}
