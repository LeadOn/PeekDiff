<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId } from 'vue'

/**
 * A label that explains itself: dotted underline, and on hover, keyboard focus or tap a bubble with the
 * figure's full name, what it means and how it is computed. The bubble is teleported and positioned
 * against the viewport (over the sticky header too), so a scrolling table or a notched card cannot clip
 * it; it sits above the label, off the figure the label names, and drops below it at the top of the
 * screen. Assistive technologies get the same words as the label's description.
 *
 * `focusable: false` for a label repeated on every row of a list (the history's "ACS"): mouse hover
 * only, so the list does not gain a tab stop per figure — the definition is reachable elsewhere.
 */
withDefaults(defineProps<{
  term: string
  text: string
  formula?: string | null
  focusable?: boolean
}>(), { formula: null, focusable: true })

const id = useId()
const trigger = ref<HTMLElement | null>(null)
const bubble = ref<HTMLElement | null>(null)
const open = ref(false)
const position = ref<{ top: number, left: number } | null>(null)

/** Hover waits a beat so sweeping the mouse across a table does not flash every bubble. */
const HOVER_DELAY_MS = 150
const GAP = 8
const MARGIN = 8

let timer: ReturnType<typeof setTimeout> | undefined
let lastPointer = ''

function place() {
  const anchor = trigger.value?.getBoundingClientRect()
  const box = bubble.value
  if (!anchor || !box) return
  const { offsetWidth: width, offsetHeight: height } = box
  // Above by default: a label sits over its figure, which the bubble must leave readable.
  const above = anchor.top - GAP - height >= MARGIN
  position.value = {
    top: above ? anchor.top - GAP - height : anchor.bottom + GAP,
    left: Math.min(Math.max(anchor.left + anchor.width / 2 - width / 2, MARGIN), window.innerWidth - width - MARGIN),
  }
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') hide()
}
const onOutside = (event: PointerEvent) => {
  if (!trigger.value?.contains(event.target as Node)) hide()
}

/** While open: Escape, a tap elsewhere, a scroll or a resize close it — it is never left stranded. */
function listen(on: boolean) {
  if (on) {
    document.addEventListener('keydown', onKeydown)
    document.addEventListener('pointerdown', onOutside)
    window.addEventListener('scroll', hide, { capture: true, passive: true })
    window.addEventListener('resize', hide)
  } else {
    document.removeEventListener('keydown', onKeydown)
    document.removeEventListener('pointerdown', onOutside)
    window.removeEventListener('scroll', hide, { capture: true })
    window.removeEventListener('resize', hide)
  }
}

function show(delay = 0) {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    if (open.value) return
    open.value = true
    listen(true)
    await nextTick()
    place()
  }, delay)
}

function hide() {
  clearTimeout(timer)
  if (!open.value) return
  open.value = false
  position.value = null
  listen(false)
}

const onPointerEnter = (event: PointerEvent) => {
  if (event.pointerType === 'mouse') show(HOVER_DELAY_MS)
}
const onPointerLeave = (event: PointerEvent) => {
  if (event.pointerType === 'mouse') hide()
}
const onPointerDown = (event: PointerEvent) => {
  lastPointer = event.pointerType
}
/** A focus from the keyboard opens it; a focus from a tap leaves the click to decide. */
const onFocus = () => {
  if (trigger.value?.matches(':focus-visible')) show()
}
/**
 * Touch and keyboard toggle; the mouse already opened it on hover, and its click goes on to whatever
 * holds the label (an agent row stays a filter). A toggle stops there, so a tap does not also follow
 * the row's link.
 */
const onClick = (event: MouseEvent) => {
  if (lastPointer === 'mouse') return
  event.stopPropagation()
  if (open.value) hide()
  else show()
}
const onBlur = () => hide()

onBeforeUnmount(hide)
</script>

<template>
  <span class="inline">
    <component
      :is="focusable ? 'button' : 'span'"
      ref="trigger"
      :type="focusable ? 'button' : undefined"
      :aria-describedby="focusable ? id : undefined"
      class="inline cursor-help p-0 text-left underline decoration-current/45 decoration-dotted decoration-1 underline-offset-[3px] transition-colors duration-150 ease-snap [text-transform:inherit] hover:decoration-current"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @pointerdown="onPointerDown"
      @focus="onFocus"
      @blur="onBlur"
      @click="onClick"
    ><slot>{{ term }}</slot></component>
    <span v-if="focusable" :id="id" hidden>{{ term }}. {{ text }}<template v-if="formula"> Calcul : {{ formula }}.</template></span>
    <Teleport to="#teleports">
      <div
        v-if="open"
        ref="bubble"
        aria-hidden="true"
        data-info-tip
        class="pointer-events-none fixed z-[60] w-max max-w-[min(300px,calc(100vw-16px))] border border-border-strong bg-surface-high px-3 py-2.5 text-left normal-case tracking-normal text-text-main shadow-float"
        :class="position ? 'animate-enter' : 'invisible'"
        :style="position ? { top: `${position.top}px`, left: `${position.left}px` } : { top: '0', left: '0' }"
      >
        <p class="font-mono text-[11px] font-medium uppercase tracking-[0.08em]">{{ term }}</p>
        <p class="mt-1 text-pretty font-sans text-[13px] leading-snug text-text-sec">{{ text }}</p>
        <p v-if="formula" class="mt-2 border-t border-dashed border-border-strong pt-2 font-mono text-[11px] text-text-ter">= {{ formula }}</p>
      </div>
    </Teleport>
  </span>
</template>
