// Minimal service worker — its only job is to satisfy PWA installability criteria
// (a registered SW with a fetch handler). No caching strategy here; every request just
// passes straight through to the network.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {
  // Intentionally empty — no respondWith(), so the browser handles every request normally.
})
