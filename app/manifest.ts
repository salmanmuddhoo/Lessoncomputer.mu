import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LessonComputer.mu — Cambridge Computer Science Tuition',
    short_name: 'LessonComputer',
    description: 'Cambridge IGCSE, O Level and A Level Computer Science tuition — video lessons and live classes.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FAFAF8',
    theme_color: '#0F0F0F',
    icons: [
      { src: '/pwa-icon-192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon-512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
