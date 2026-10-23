/* Ghar Ki Parchi offline support.
   Pages and settings: network first, so updates show up at once; the saved
   copy is used when offline. Icons and fonts: saved copy first.
   Login and list requests (supabase.co) are never cached. */
const CACHE = 'parchi-v2';
const FILES = ['./', './index.html', './config.js', './manifest.webmanifest', './icon.svg'];
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
  const page = mine && (req.mode === 'navigate' || /\/(index\.html|config\.js)?$/.test(url.pathname) || url.pathname.endsWith('config.js'));
  const key = mine && req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    if (page) {
      try { const res = await fetch(req); if (res.ok) c.put(key, res.clone()); return res; }
      catch (err) { return (await c.match(key, { ignoreSearch: true })) || Response.error(); }
    }
    const hit = await c.match(key, { ignoreSearch: mine });
    const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) c.put(key, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
