/**
 * UI theme.
 *
 * Design system convention ("Protocol" v1): dark is the default (the `:root` tokens), and the
 * `.light` class on `<html>` switches to the "Bone" palette. Any code that needs to know the theme
 * goes through here rather than testing a class by hand.
 */
export type Theme = 'dark' | 'light'

export const LIGHT_CLASS = 'light'
export const THEME_STORAGE_KEY = 'theme'

export const isLightTheme = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.classList.contains(LIGHT_CLASS)

export const isDarkTheme = (): boolean => !isLightTheme()

export const currentTheme = (): Theme => (isLightTheme() ? 'light' : 'dark')

export const applyTheme = (theme: Theme): void => {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle(LIGHT_CLASS, theme === 'light')
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Private mode or storage denied: the theme still applies for the current session.
  }
}

export const storedTheme = (): Theme | null => {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}
