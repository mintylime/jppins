// Trip Pins service worker: keeps the app and viewed map tiles working offline.
// The same file serves the main app and the test copy in beta/: each worker looks after
// only the files in its own folder, and keeps its own cache, so the two never mix.
const VERSION = 'trippins-v6';
const HOME = new URL('./', self.registration.scope).pathname;   // e.g. /jppins/ or /jppins/beta/
const CACHE = `${VERSION} ${HOME}`;
const SHELL = ['./', './index.html', './manifest.webmanifest'];
const CDN = /^(https:\/\/cdnjs\.cloudflare\.com|https:\/\/fonts\.(googleapis|gstatic)\.com)/;
const TILES = /tile\.openstreetmap\.org/;
const MAX_TILES = 400;
// A file directly in this folder. A sub-folder may be another copy of the app with its own worker.
const mine = url => url.origin === location.origin && url.pathname.startsWith(HOME) && !url.pathname.slice(HOME.length).includes('/');

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k =>
    k !== CACHE && (k.endsWith(' ' + HOME) || /^trippins-v\d+$/.test(k))   // older copies of this folder, and the old shared name
  ).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The page itself: try the network (for updates), fall back to the cached copy.
  if (req.mode === 'navigate') {
    if (!mine(url)) return;
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('./', copy));
      return res;
    }).catch(() => caches.match('./', { cacheName: CACHE, ignoreSearch: true }).then(r => r || caches.match('./index.html', { cacheName: CACHE }))));
    return;
  }

  // App files, Leaflet and fonts: cache first.
  if (mine(url) || CDN.test(req.url)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }))));
    return;
  }

  // Map tiles: cache the ones you've looked at, so the map still shows on a bad signal.
  if (TILES.test(url.host)) {
    e.respondWith(caches.open('tiles').then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') {
          c.put(req, res.clone());
          c.keys().then(k => { if (k.length > MAX_TILES) k.slice(0, k.length - MAX_TILES).forEach(r => c.delete(r)); });
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })));
  }
  // Everything else (your Google Sheet, icons from the parent folder) goes straight to the network.
});
