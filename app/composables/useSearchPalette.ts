import { useState } from '#app'

/**
 * Open state of the crew search palette. Shared through `useState` because three unrelated places
 * open it — the header button, the mobile bar and the keyboard shortcut — while the palette itself
 * is mounted once, by the layout.
 */
export const useSearchPalette = () => {
  const isOpen = useState<boolean>('search-palette-open', () => false)

  const open = () => { isOpen.value = true }
  const close = () => { isOpen.value = false }
  const toggle = () => { isOpen.value = !isOpen.value }

  return { isOpen, open, close, toggle }
}
