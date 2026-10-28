<script setup lang="ts">
const config = useRuntimeConfig()

useHead({
  htmlAttrs: {
    lang: 'fr'
  },
  titleTemplate: '%s - PeekDiff',
  script: [
    // External rather than inline script: the CSP forbids `script-src 'unsafe-inline'`.
    // `tagPosition: 'head'` places it before render, which avoids the theme flash.
    { src: '/theme-init.js', tagPosition: 'head' }
  ],
  link: [
    { rel: 'icon', type: 'image/png', href: '/favicon-96x96.png', sizes: '96x96' },
    { rel: 'shortcut icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
    { rel: 'manifest', href: '/site.webmanifest' }
  ],
  meta: [
    { name: 'apple-mobile-web-app-title', content: 'PeekDiff' },
    { name: 'description', content: 'PeekDiff - Valorant stats tracker' },
    { name: 'theme-color', content: '#0B0C0F' },
    { name: 'version', content: config.public.appVersion }
  ]
})
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
