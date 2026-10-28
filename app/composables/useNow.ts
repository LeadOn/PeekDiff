import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'

/**
 * A clock for relative times ("il y a 4 min"), ticking every `intervalMs` once mounted. It starts
 * at 0 on the server and on the first client render, so nothing relative is printed before mount and
 * hydration always matches; callers render their relative labels only once it is non-zero.
 */
export function useNow(intervalMs = 60_000): Ref<number> {
  const now = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    now.value = Date.now()
    timer = setInterval(() => { now.value = Date.now() }, intervalMs)
  })

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
  })

  return now
}
