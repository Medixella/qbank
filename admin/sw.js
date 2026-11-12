// Medixella Admin: installable, always live (nothing is cached, so the page and data are never stale).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
