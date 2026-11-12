// Medixella Qbank offline cache.
// - The small app page opens instantly from cache; a fresh copy is checked in the background (a tiny "not modified"
//   request when nothing changed), so updates arrive on the next open.
// - The encrypted question file (data.<hash>.bin) never changes under the same name, so it is cached once and
//   re-downloaded only when the questions really change.
const CACHE = 'mxq-app-v1', DCACHE = 'mxq-data-v1';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./']).catch(() => {}))); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
const DATA_RE = /\/data\.[0-9a-f]{12}\.bin$/;
const META_RE = /\/meta\.[0-9a-f]{12}\.bin$/;      // account build: small file of empty question stubs, lessons, flashcards
async function refreshPage(r, c) {
  const res = await fetch(r.url.split('#')[0], { cache: 'no-cache' }).catch(() => null);
  if (!res || !res.ok) return res;
  // Before replacing the saved page, make sure the new encrypted file is saved too (only for people who already unlocked once).
  try {
    const txt = await res.clone().text(), dc = await caches.open(DCACHE);
    for (const name of ['__DATA_FILE__', '__META_FILE__']) {
      const m = new RegExp(name + "\\s*=\\s*'([^']+)'").exec(txt); if (!m) continue;
      const url = new URL(m[1], r.url).href, pre = m[1].split('/').pop().split('.')[0] + '.', keys = (await dc.keys()).filter(k => k.url.split('/').pop().startsWith(pre));
      if (keys.length && !(await dc.match(url))) {
        const d = await fetch(url);
        if (!d || !d.ok) return res;           // could not get it: keep the old page + old data together
        await dc.put(url, d.clone());
        for (const k of keys) if (k.url !== url) await dc.delete(k);
      }
    }
  } catch (e) { return res; }
  await c.put('./', res.clone());
  return res;
}
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (/status\.json$/.test(u.pathname)) return;           // subscription status must stay live
  if (DATA_RE.test(u.pathname) || META_RE.test(u.pathname)) {
    const pre = u.pathname.split('/').pop().split('.')[0] + '.';   // data. / meta. / trial.: each keeps only its newest copy
    e.respondWith(caches.open(DCACHE).then(async c => {
      const hit = await c.match(r.url); if (hit) return hit;
      const res = await fetch(r.url);
      if (res && res.ok) { await c.put(r.url, res.clone()); for (const k of await c.keys()) if (k.url !== r.url && k.url.split('/').pop().startsWith(pre)) await c.delete(k); }
      return res;
    }));
    return;
  }
  if (r.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('index.html')) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match('./');
      const net = refreshPage(r, c);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || new Response('Offline. Open the app once while online.', { status: 503 });
    }));
  }
});
