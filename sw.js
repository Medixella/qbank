// Medixella: the home page needs no offline cache. This removes the old app cache that used to live at this address
// (the app now lives in /app/) and then retires itself.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => { e.waitUntil((async () => { try { await caches.delete('mxq-app-v1'); } catch (x) {} try { await self.registration.unregister(); } catch (x) {} })()); });
