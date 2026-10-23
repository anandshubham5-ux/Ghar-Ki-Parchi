/* Ghar Ki Parchi offline cache: the site's own files first from cache,
   refreshed in the background; fonts cached after first load. */
const CACHE = 'parchi-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mine = url.origin === location.origin;
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!mine && !font) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const key = mine && req.mode === 'navigate' ? './index.html' : req;
    const hit = await c.match(key, { ignoreSearch: mine });
    const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) c.put(key, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
